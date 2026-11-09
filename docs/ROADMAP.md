# ROADMAP — Feuille de route

> Version 0.1 — 31/10/2026. Chaque phase se termine par un livrable vérifiable. Les efforts sont des ordres de grandeur pour un développeur seul ; ils seront recalés après la phase 1.

## 1. Phases

| Phase | Contenu | Livrable vérifiable | Effort |
|---|---|---|---|
| **0. Cadrage** | Les 10 documents ; prototype gelé et étiqueté v0 ; décisions D-1 à D-2 (`SPECIFICATIONS.md` § 4) | Documents relus ; prototype archivé | 15 à 25 h |
| **1. Squelette** | Monorepo pnpm, Tauri 2 + React + Vite + TS strict, CI Windows, polices et Three.js en local, avertissement au lancement | Installeur Windows qui s'ouvre sans réseau | 15 à 25 h |
| **2. Moteur porté** | `core`, `flight`, `taxi` et systèmes en TypeScript dans `sim-core` et `aircraft-a350`, dans un Worker ; données JSON avec statuts ; correction des pistes (relèvements vrais, déclinaison) | VR-01 à VR-06 au vert (tolérances écrites) | 40 à 60 h |
| **3. Cockpit fonctionnel** | Écrans PFD, ND, EWD, SD, ISIS, FCU, EFIS, plafonnier et pédestal en React, branchés sur les commandes ; aide « ? » | 100 commandes classées S/P/V, zéro commande sans fiche | 50 à 80 h |
| **4. Systèmes réels** | Graphe électrique, dépendances hydrauliques, alimentation carburant, lois de commandes, panne moteur dissymétrique, ECAM | ≥ 60 tests de dépendances au vert | 60 à 100 h |
| **5. Météo et scénarios** | Vent, turbulence, visibilité ; moteur de scénarios ; 10 scénarios ; radio | Chaque scénario joué de bout en bout par un test | 40 à 60 h |
| **6. Pédagogie** | Vue Systèmes, check-lists, exercices, quiz, évaluation, progression, sauvegarde | Parcours élève complet testé ; sauvegarde/reprise vérifiée | 50 à 80 h |
| **7. Finition** | Accessibilité, performances, sons, vues cockpit, 6 écrans/OIS, installeur signé | Critères de fin (§ 4) tous cochés | 30 à 50 h |

**Total indicatif : 300 à 480 h.** Premier résultat visible et utile (phases 1 et 2) : 55 à 85 h.

Le prototype v0 reste jouable pendant toute la refonte.

## 2. Phase 0 — détail

| Tâche | État |
|---|---|
| Audit du prototype (document validé, rév. 13) | fait |
| Sourçage public A350 (Airbus, EASA, SIA, DIRCAM, Leeham, FlightGlobal) | fait (partiel, voir `FUNCTIONAL_AUDIT.md` § 5) |
| Rédaction des 10 documents | fait (v0.1) |
| Relecture des documents par l'auteur | à faire |
| Relecture externe de l'audit (idéalement quelqu'un qui connaît l'A350) | à faire |
| Décision D-1 : fréquences réelles ou fictives | à faire |
| Décision D-2 : approche en piste 12 à FMEE (pas d'ILS publié) | à faire |
| Gel du prototype : dépôt Git, étiquette `v0.0.0`, scripts de test rapatriés dans `legacy/prototype-v0/tests/` | fait |

## 2 bis. Phase 1 — détail

| Tâche | État |
|---|---|
| Monorepo pnpm, TypeScript strict, ESLint (règles d'architecture et anti-`innerHTML`) | fait |
| `sim-core` : pas fixe, pause, accélération, rejeu, sauvegarde/reprise, ISA, géodésie, déclinaison | fait, 22 tests (dont parité exacte avec v0) ; 38 tests au total avec les données et l’application |
| `aircraft-a350` : données avec statut et sources, validation au chargement (EF-001) | fait |
| Application React : avertissement (EF-004), Worker moteur, instantanés 30 Hz, sonde ISA, globe Three.js, tableau des données | fait : 44 tests Vitest, 16/16 dans Chromium, 19/19 sur l'application installée |
| Coquille Tauri 2 : CSP stricte, permissions minimales, NSIS, WebView2 hors ligne, icônes | compilée sous Windows (GitHub Actions) |
| CI GitHub Actions Windows : compilation, tests, installeur, installation et lancement hors ligne sur machine neuve | au vert (exécution 42660272495) |
| Livrable vérifiable : installeur Windows qui s'ouvre sans réseau | **validé en CI** ([rapport](validation/PHASE1_VALIDATION.md)) ; test sur PC de l'auteur en attente |

## 3. Risques

| Risque | Gravité | Parade |
|---|---|---|
| Documentation Airbus (FCOM, FCTM) non publique : risque d'inventer | Élevée | Sources publiques citées uniquement ; étiquetage `documenté` / `estimé` / `fictif` ; journal des points à vérifier |
| Marques Airbus, A350, Rolls-Royce | Moyenne | Nom descriptif, aucun logo, avertissement de non-affiliation |
| Données de navigation sous licence | Moyenne | Données ouvertes pour aéroports et pistes ; procédures fictives marquées |
| Dérive du périmètre | Élevée | Chaque tâche a objectif, exigence et test ; limite par phase |
| Temps disponible d'un développeur seul | Élevée | Jalons courts et utiles seuls ; prototype jouable pendant la refonte |
| WebView2 absent ou bloqué | Moyenne | Installeur avec WebView2 hors ligne ; test sur Windows 10 et 11 vierges |
| Performances 3D sur PC modeste | Moyenne | Niveaux de détail, qualité réglable, budget mesuré |
| Fidélité physique faussement rassurante | Moyenne | Simplifications documentées (`SIMULATION_ENGINE.md`) et rappelées dans l'aide |
| Régression au portage | Moyenne | Vols de référence automatisés avant toute modification |
| Taille des données | Faible | Relief fin seulement autour des aéroports ; compression ; budget fixé |

## 4. Critères de fin (v1)

- [ ] Installation sur Windows 10 et 11 vierges, sans réseau ; lancement en moins de 10 s.
- [ ] Vol FMEE → LFPG complet, du cockpit froid à l'arrêt des moteurs, réussi par le test automatique et par 3 testeurs humains sans aide extérieure.
- [ ] Les 10 scénarios jouables de bout en bout, chacun avec son évaluation.
- [ ] 100 % des commandes classées ; chaque commande « simulée » a au moins un test ; chaque « visuelle » est signalée.
- [ ] ≥ 60 tests de dépendances entre systèmes au vert.
- [ ] Sauvegarde et reprise en vol avec un état identique (comparaison automatique).
- [ ] 60 images/s sur le PC de référence ; zéro erreur console sur 2 h accélérées.
- [ ] Chaque système a sa fiche complète (rôle, fonctionnement, dépendances, interactions, pannes, sources).
- [ ] Accessibilité : tout au clavier, description textuelle de chaque écran.
- [ ] Les 10 documents à jour, sans écart avec le logiciel livré.
- [ ] Avertissement « outil pédagogique non certifié » au premier lancement.
