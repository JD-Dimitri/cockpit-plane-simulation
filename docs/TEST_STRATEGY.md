# TEST_STRATEGY — Stratégie de test

> Version 0.1 — 31/10/2026. Règle du projet : **une fonctionnalité sans test n'est pas terminée.** Chaque exigence de `SPECIFICATIONS.md` renvoie à au moins un test.

## 1. Niveaux de test

| Niveau | Outil | Cible | Exécution |
|---|---|---|---|
| Unitaire | Vitest (Node) | Fonctions pures : ISA, géodésie, aérodynamique, calculs, schémas de données | À chaque commit |
| Systèmes | Vitest | Une panne ou une commande → effets attendus (≥ 60 cas, voir `A350_SYSTEMS_MAP.md` § 5) | À chaque commit |
| Vols de référence | Vitest (moteur seul, accéléré) | Vols complets rejoués, comparés aux valeurs de référence | À chaque commit (versions courtes), chaque nuit (vols complets) |
| Données | Vitest + Zod | Toute valeur a un statut ; toute source citée existe ; pistes conformes au fichier source | À chaque commit |
| Interface | Playwright (navigateur) | Vues, aide « ? », guide, commandes → bonne commande envoyée au moteur | À chaque PR |
| Captures | Playwright (comparaison d'images) | PFD, ND, EWD, SD, ISIS, plafonnier dans des états de référence | À chaque PR |
| Accessibilité | axe-core + tests clavier | Contraste, ARIA, focus, ordre de tabulation | À chaque PR |
| Application | tauri-driver (WebDriver) | Installation, lancement hors ligne, sauvegarde sur disque | Avant chaque version |
| Recette humaine | Procédure écrite | 3 testeurs, vol complet sans aide extérieure | Avant v1 |

CI : GitHub Actions sur `windows-latest` (et Ubuntu pour les tests du moteur, plus rapides).

## 2. Vols de référence

Le prototype v0 fournit les valeurs de référence. Le portage en TypeScript (phase 2) est validé quand le moteur porté reproduit ces vols **dans les tolérances écrites**.

| Id | Vol | Contrôles |
|---|---|---|
| VR-01 | FMEE → LFPG, départ « prêt au roulage », tout automatique | roulage OK, décollage, FL370 atteint, descente gérée, ILS capté, toucher −255 ± 150 ft/min sur la piste, arrêt au poste |
| VR-02 | LFPG → FMEE, idem | idem, sens retour |
| VR-03 | FMEE → LFPO | idem |
| VR-04 | Cockpit froid → moteurs démarrés | séquence batteries → parc → ADIRS (alignement) → APU → air → démarrage → générateurs, dans un temps simulé borné |
| VR-05 | Croisière stabilisée 30 min | altitude ± 50 ft, Mach ± 0,005, consommation dans une plage |
| VR-06 | Durée totale FMEE → LFPG | mesurée par le test (exigence EF-012), consignée dans `CHANGELOG.md` |

Format : un vol de référence est un fichier `tests/flights/VR-01.json` (scénario, graine, commandes horodatées, points de contrôle). Le test rejoue les commandes et compare l'état aux points de contrôle.

Rejeu et déterminisme (ENF-005) : le même fichier rejoué deux fois donne un état final identique au bit près ; à ×1 et ×64, les écarts restent sous tolérance.

## 3. Tests de systèmes (exemples)

```ts
test('ELEC — BUS TIE alimente AC 1 depuis le côté 2', () => {
  const sim = loadScenario('cruise');
  sim.command({ type: 'ovh.set', id: 'gen1a', value: 0 });
  sim.command({ type: 'ovh.set', id: 'gen1b', value: 0 });
  sim.step(1);
  expect(sim.snapshot().elec.ac1).toBe(true);
  sim.command({ type: 'ovh.set', id: 'busTie', value: 0 });
  sim.step(1);
  expect(sim.snapshot().elec.ac1).toBe(false);
});
```

Chaque test système indique dans son nom le système, et dans un commentaire le statut du comportement testé (`prototype`, `documenté` + source).

## 4. Tests de l'interface

- **Aide « ? »** : armer, cliquer une commande, un bloc, une zone d'écran → la bonne fiche s'ouvre, la commande n'a pas été actionnée.
- **Guide** : parcours des 47 étapes en mode automatique ; insertion d'une étape fictive → aucune régression (cause du bug de l'étape 40 en v0).
- **Journal et radio** : une note contenant `<img src=x onerror=alert(1)>` s'affiche comme texte (régression de l'injection HTML v0).
- **Commandes** : pour chaque commande du plafonnier, un clic envoie la commande attendue au moteur (test généré depuis `controls.json`).

## 5. Tests non fonctionnels

| Exigence | Test |
|---|---|
| ENF-002 hors ligne | Application lancée avec le réseau coupé ; journal réseau vide |
| ENF-003 lancement < 10 s | Mesure tauri-driver sur le PC de référence |
| ENF-004 60 images/s | 10 min de vol, percentile 95 du temps d'image ≤ 16,7 ms |
| ENF-006 zéro erreur console | Session de 2 h à ×64, collecte des erreurs |
| ENF-010 sécurité | Lint : interdiction d'`innerHTML` ; vérification de la CSP et des permissions Tauri |
| ENF-012 couverture | Couverture du moteur ≥ 80 % |

## 6. Recette (critères de fin)

Les critères de fin (`ROADMAP.md` § 4) sont vérifiés par cette liste, cochée et datée dans `CHANGELOG.md` à la sortie de la v1.

## 7. Ce qui n'est pas testable automatiquement

- Le réalisme « ressenti » du pilotage : jugé par les testeurs humains, consigné comme remarque, jamais présenté comme validation.
- La conformité aux procédures réelles : impossible sans documentation constructeur ; d'où l'étiquetage obligatoire `documenté` / `estimé` / `fictif`.
