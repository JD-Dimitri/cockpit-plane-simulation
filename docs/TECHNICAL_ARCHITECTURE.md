# TECHNICAL_ARCHITECTURE — Architecture logicielle

> Version 0.1 — 31/10/2026. Cible : application Windows autonome et hors ligne.

## 1. Choix technologiques

| Couche | Choix | Pourquoi |
|---|---|---|
| Application | **Tauri 2** (WebView2 sur Windows), installeur NSIS ou MSI | Léger (quelques Mo contre plus de 100 Mo pour Electron), hors ligne, accès fichiers contrôlé par permissions ; backend Rust disponible plus tard pour le matériel (HID, série) |
| Interface | **React 19 + TypeScript strict + Vite** | Composants testables, échappement automatique (fin de l'injection `innerHTML`) |
| Moteur | **TypeScript pur** dans un **Web Worker**, pas fixe (60 à 120 Hz) | Testable sous Node (Vitest), n'interrompt pas l'affichage, déterministe |
| Données avion | **JSON validé par Zod** | Valeurs lisibles, sourcées, vérifiées au démarrage |
| État de l'interface | **Zustand**, alimenté par des instantanés du moteur à 30 Hz | React ne se re-rend pas à chaque pas de physique |
| Écrans | **Canvas 2D** par écran (OffscreenCanvas plus tard) | Reprise directe du code de dessin du prototype |
| 3D | **Three.js** (version épinglée, embarquée) | Déjà utilisé ; relief, aéroports, cockpit glTF plus tard |
| Stockage | **IndexedDB via Dexie** (sessions, carnet, progression) ; JSON dans le dossier de l'application (réglages) | Local, sans compte ni serveur |
| Audio | **Web Audio**, fichiers locaux | Hors ligne, mixage par zone |
| Tests | **Vitest** (moteur, données), **Playwright** (interface), **tauri-driver** (application), CI **GitHub Actions** Windows | Chaque fonctionnalité a son test |

Pourquoi pas Rust pour le moteur maintenant : le code de vol existe en JavaScript et fonctionne. Le porter en TypeScript est rapide et vérifiable par les vols de référence. Rust ne s'imposera que si le profilage le justifie.

## 2. Organisation du dépôt (monorepo pnpm)

```
a350-simulator/
├─ packages/
│  ├─ sim-core/          boucle, horloge, atmosphère ISA, géodésie, bus de commandes, graine aléatoire
│  ├─ aircraft-a350/     data/*.json (aéro, moteurs, masses, systèmes, sources) + modèles :
│  │                     electrical, hydraulic, fuel, pneumatic, engines, flight-controls,
│  │                     autoflight, fms, warnings (ECAM, GPWS)
│  ├─ scenarios/         scénarios et météo (JSON + schémas Zod)
│  ├─ pedagogy/          étapes du guide, fiches, leçons, quiz, évaluation (données + logique pure)
│  └─ nav-data/          aéroports, pistes, déclinaison (sources ouvertes, avec provenance)
├─ apps/desktop/
│  ├─ src/               React : vues, écrans (canvas), panneaux, 3D, audio, stockage
│  └─ src-tauri/         configuration Tauri, permissions, icônes, installeur
├─ assets/               relief, textures, sons, polices (tout en local, licences listées)
├─ tests/                vols de référence, tests d'intégration, captures de référence
└─ docs/                 les 10 documents du projet
```

Règle de dépendance : `sim-core` ne dépend de rien ; `aircraft-a350`, `scenarios`, `nav-data` dépendent de `sim-core` ; `pedagogy` lit l'état publié ; `apps/desktop` dépend de tout. **Aucun package moteur n'importe React, le DOM ou Three.js** (vérifié par une règle ESLint `no-restricted-imports`).

## 3. Flux de données

```
 Interface (React)                 Web Worker (moteur)
 ─────────────────                 ───────────────────
 clic / clavier / manette
        │  Command {type, payload, t}
        ├──────────────────────────────► file de commandes
        │                                   │
        │                              step(dt) × N  (pas fixe)
        │                                   │
        │  Snapshot (30 Hz, structuré)      │
 store Zustand ◄────────────────────────────┤
        │                                   │
 composants React, canvas, 3D, audio   événements (ECAM, radio, journal)
```

- **Commandes** : objets typés et sérialisables (`{ type: 'ovh.set', id: 'bat1', value: 1 }`, `{ type: 'stick', pitch: -0.4, roll: 0 }`). Elles sont horodatées et journalisées, ce qui permet le rejeu.
- **Instantané** : copie en lecture seule de l'état utile à l'affichage, envoyée par `postMessage` (objets transférables si besoin). L'interface ne modifie jamais l'état.
- **Événements** : messages discrets (alerte ECAM levée, appel radio, étape franchie) poussés dans une file distincte.

## 4. Contrat du moteur

```ts
interface SimEngine {
  load(scenario: Scenario, aircraft: AircraftData, nav: NavData, seed: number): void;
  command(cmd: Command): void;          // mis en file, appliqué au prochain pas
  step(dtSeconds: number): void;        // pas fixe, appelé N fois selon l'accélération
  snapshot(): Snapshot;                 // état publié, sans référence partagée
  serialize(): SavedState;              // sauvegarde complète
  restore(s: SavedState): void;         // reprise à l'identique
}
```

Ordre d'un pas (repris du prototype `simStep`, rendu explicite) :
1. Appliquer les commandes en file.
2. Systèmes : électricité → APU → ADIRS → pneumatique → hydraulique → carburant → moteurs.
3. Roulage (si au sol), puis guidage (FMS, pilote automatique, auto-manette).
4. Aérodynamique et intégration de la trajectoire.
5. Contact sol, collisions.
6. Alertes (ECAM, GPWS), annonces, phase de vol.
7. Pédagogie (étapes, évaluation) et journal, sur l'état publié.

## 5. Données de l'avion

Chaque fichier de `aircraft-a350/data/` suit ce modèle :

```json
{
  "thrustTakeoff_N": { "value": 374500, "status": "documenté", "source": "EASA-TCDS-E111-i12" },
  "wingArea_m2":     { "value": 443,    "status": "estimé",    "note": "à vérifier" }
}
```

`sources.json` décrit chaque identifiant de source (titre, URL, date de consultation). Un test refuse toute valeur sans `status`, et toute valeur `documenté` sans `source` existante.

## 6. Interface

- Vues : Pilote (écrans + vue extérieure), Plafonnier, Pédestal & FMS, Systèmes, Radio & équipage, Journal, Calculs, Réglages.
- Chaque écran est un composant `<DisplayCanvas kind="PFD" />` qui lit l'instantané et dessine dans un `requestAnimationFrame`.
- Les commandes du cockpit sont des composants génériques (`PushButton`, `Selector`, `Guarded`, `Knob`, `Toggle`) générés depuis la définition du plafonnier (aujourd'hui `OVH_DEF`), avec le statut de simulation en propriété.
- Textes : fichiers `fr.json` ; aucun texte en dur dans les composants.

## 7. Stockage

| Donnée | Emplacement | Format |
|---|---|---|
| Sessions sauvegardées | IndexedDB `sessions` | `SavedState` versionné |
| Carnet de vol | IndexedDB `logbook` | entrées OOOI + notes |
| Progression, profils | IndexedDB `profiles`, `progress` | par profil |
| Réglages | dossier de l'application (`settings.json`) | JSON |

Chaque format porte un numéro de version et une fonction de migration testée.

## 8. Sécurité

- CSP stricte : `default-src 'self'`, aucun domaine externe.
- Permissions Tauri minimales (lecture/écriture dans le seul dossier de l'application ; dialogues d'export).
- Aucun `innerHTML` / `dangerouslySetInnerHTML` avec des données saisies (règle ESLint).
- Les fichiers importés (sessions, scénarios) sont validés par Zod avant usage.

## 9. Performances (budgets)

| Poste | Budget |
|---|---|
| Pas moteur (systèmes + vol) | ≤ 0,2 ms en moyenne (pour 900 pas par image à ×256 : ≤ 180 ms → limiter l'accélération selon la mesure) |
| Rendu écrans 2D | ≤ 4 ms par image |
| Rendu 3D | ≤ 8 ms par image sur le PC de référence |
| Instantané | ≤ 50 Ko, 30 Hz |

Pistes connues : mettre en cache l'élévation du sol par tuile (le prototype recalcule trois distances orthodromiques à chaque appel) ; reconstruire le relief par niveaux de détail plutôt qu'entièrement.

## 10. Migration depuis le prototype

| Fichier v0 | Destination | Remarque |
|---|---|---|
| `core.js` | `sim-core` (ISA, géodésie) + `aircraft-a350` (systèmes, données `AC`, `OVH_DEF`) + `nav-data` (`AIRPORTS`) | Séparer données et logique |
| `flight.js` | `aircraft-a350/flight`, `autoflight`, `warnings` | Supprimer les lectures de `S.efis` dans le guidage |
| `taxi.js` | `aircraft-a350/ground` + `nav-data` | |
| `render.js` | `apps/desktop/src/displays/*` | Fonctions de dessin pures `(ctx, snapshot) → void` |
| `terrain3d.js` | `apps/desktop/src/world/*` | Relief en tuiles |
| `tutor.js`, `help.js` | `pedagogy` (données) + composants | Étapes par clé |
| `comms.js`, `logbook.js`, `calc.js` | `pedagogy` / `apps/desktop` | Calculs testés unitairement |
| `ui.js` | composants React | Réécrit, pas porté |
