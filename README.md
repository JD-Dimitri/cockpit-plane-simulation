# Cockpit Plane Simulation — simulateur pédagogique de type A350

[![Windows](https://github.com/JD-Dimitri/cockpit-plane-simulation/actions/workflows/ci.yml/badge.svg)](https://github.com/JD-Dimitri/cockpit-plane-simulation/actions/workflows/ci.yml)

Application **Windows autonome et hors ligne** pour comprendre le fonctionnement d'un avion de ligne de type Airbus A350-900 : son cockpit, ses systèmes, la physique du vol et la navigation, sur les vols **Saint-Denis de La Réunion (FMEE) ⇄ Paris-Orly (LFPO) / Paris-Charles de Gaulle (LFPG)**.

> [!IMPORTANT]
> **Outil pédagogique non certifié.** Ce n'est ni un dispositif de formation agréé, ni un moyen de qualification, ni une source de procédures opérationnelles. Aucune procédure présentée n'est une procédure Airbus officielle.
> Projet ni affilié, ni approuvé, ni soutenu par Airbus ou Rolls-Royce. « Airbus », « A350 », « Rolls-Royce » et « Trent » sont des marques de leurs propriétaires.

---

## Sommaire

- [Ce que fait le logiciel](#ce-que-fait-le-logiciel)
- [État du projet](#état-du-projet)
- [Télécharger et installer](#télécharger-et-installer)
- [Développer](#développer)
- [Organisation du dépôt](#organisation-du-dépôt)
- [Règles du projet](#règles-du-projet)
- [Fidélité des données](#fidélité-des-données)
- [Documentation](#documentation)
- [Licence](#licence)

## Ce que fait le logiciel

**Aujourd'hui (phase 1, squelette)**

- Avertissement « outil pédagogique non certifié » au premier lancement.
- Moteur de simulation à pas fixe (60 Hz) exécuté à part de l'interface (Web Worker) : pause, accélération ×1 à ×256, rejeu déterministe, sauvegarde et reprise.
- Sonde d'atmosphère standard (ISA) : température, pression, masse volumique et vitesse du son selon l'altitude.
- Globe 3D (Three.js) avec la route orthodromique La Réunion → Paris.
- Tableau des données de l'avion, chacune avec son statut « documenté », « estimé » ou « fictif » et sa source.

**Visé (voir la [feuille de route](docs/ROADMAP.md))**

- Vol complet, du cockpit froid au parking, environ 11 h en temps réel.
- Écrans PFD, ND, EWD, SD et ISIS, FCU, plafonnier de 100 commandes, pédestal et FMS.
- Systèmes électrique, hydraulique, carburant, air, moteurs et commandes de vol, avec leurs dépendances.
- Relief et image satellite, sons, radio et équipage, journal de bord, fiches de calcul.
- Guide pas à pas, aide « ? », vue Systèmes, scénarios pédagogiques et évaluation.

Le **prototype navigateur** qui a servi de point de départ est conservé tel quel dans [`legacy/prototype-v0`](legacy/prototype-v0) (étiquette `v0.0.0`).

## État du projet

| Phase | Contenu | État |
|---|---|---|
| 0 | Cadrage : 10 documents, prototype gelé | fait |
| 1 | Squelette : monorepo, Tauri 2 + React + Vite + TypeScript, moteur en Web Worker, CI Windows | **en validation** sur GitHub Actions |
| 2 | Portage du moteur de vol du prototype | en attente d'approbation |
| 3 à 7 | Cockpit, systèmes, météo et scénarios, pédagogie, finition | à venir |

La phase 1 ne sera terminée que lorsque l'installeur Windows aura été produit, installé et lancé avec succès, réseau coupé (voir [ce que vérifie la CI](#ce-que-vérifie-la-ci)).

## Télécharger et installer

Il n'y a pas encore de version publiée. L'installeur de développement est produit à chaque compilation :

1. Ouvrir l'onglet [**Actions**](https://github.com/JD-Dimitri/cockpit-plane-simulation/actions/workflows/ci.yml), puis la dernière exécution réussie.
2. Télécharger l'artefact **`installeur-windows`** (connexion GitHub requise) et le décompresser.
3. Lancer le fichier `.exe`. L'installation se fait pour l'utilisateur courant ; des droits administrateur peuvent être demandés si WebView2 doit être installé.

L'installeur embarque **WebView2 en mode hors ligne** : il s'installe sans connexion Internet, et l'application fonctionne ensuite sans réseau.

> [!NOTE]
> L'installeur n'est pas encore signé : Windows SmartScreen peut afficher un avertissement (« Informations complémentaires » → « Exécuter quand même »).

**Configuration requise** : Windows 10 ou 11, 64 bits.

## Développer

### Prérequis

- [Node.js 22](https://nodejs.org/) et pnpm (`corepack enable`).
- Pour l'application Windows : [Rust](https://rustup.rs/) (chaîne stable MSVC) et les « Build Tools for Visual Studio » (C++). Voir les [prérequis Tauri](https://v2.tauri.app/start/prerequisites/).

### Commandes

```bash
pnpm install            # dépendances
pnpm test               # tests Vitest : moteur, données, composants React
pnpm typecheck          # TypeScript strict sur tous les paquets
pnpm lint               # ESLint (règles d'architecture et de sécurité)
pnpm dev                # interface seule dans le navigateur (http://localhost:5173)
pnpm desktop:dev        # application Tauri en développement
pnpm desktop:build      # installeur Windows : apps/desktop/src-tauri/target/release/bundle/nsis/
pnpm build && pnpm e2e apps/desktop/dist   # test de l'interface dans Chromium
```

### Ce que vérifie la CI

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) tourne sur Windows en deux étapes.

**1. Compilation** (`windows-latest`)
- Le prototype historique est identique au commit de la phase 0.
- TypeScript, ESLint et tests Vitest (avec rapports JUnit).
- Build Vite, puis test dans Chromium : avertissement, moteur, pause et accélération, 3D, statuts, **aucune requête réseau externe**.
- Compilation Rust + Tauri, installeur NSIS ; contrôle de la présence de WebView2 hors ligne.

**2. Installation sur une machine neuve, réseau sortant coupé par le pare-feu**
- Installation silencieuse.
- Premier lancement de l'application installée : avertissement, moteur, globe et route réellement dessinés, tableau des statuts, aucune requête hors de l'application, aucune erreur.
- Second lancement (avertissement non redemandé), puis désinstallation.
- Captures d'écran et rapport publiés en artefact (`resultats-windows`).

## Organisation du dépôt

```
packages/sim-core/       boucle à pas fixe, horloge, ISA, géodésie, aléa déterministe, rejeu, sauvegarde
packages/aircraft-a350/  données de l'avion (statut + source), validées au chargement
apps/desktop/            interface React + Vite ; src-tauri/ : coquille Windows (Tauri 2)
tests/e2e/               test de l'interface dans un navigateur
tests/windows/           test de l'application installée sous Windows
legacy/prototype-v0/     prototype navigateur gelé : référence fonctionnelle, ne pas modifier
docs/                    documents du projet
tools/offline-check/     contrôles de secours hors ligne, jamais utilisés par la CI
```

## Règles du projet

1. **Ne rien inventer.** Une valeur présentée comme réelle cite une source publique ; sinon elle est « estimé » ou « fictif ». Un test refuse les données sans statut.
2. **Le moteur ne connaît pas l'interface.** Il reçoit des commandes et publie un instantané. ESLint interdit d'importer React, Three.js ou Tauri dans `packages/`.
3. **Aucune écriture HTML brute** (`innerHTML`, `dangerouslySetInnerHTML`) : ESLint la refuse.
4. **Hors ligne.** Polices et Three.js sont embarqués ; politique de sécurité `default-src 'self'`.
5. **Pas de test, pas de fonctionnalité.** Une fonctionnalité sans test n'est pas terminée.
6. **Le prototype ne change pas.** `legacy/prototype-v0` reste identique à la phase 0 ; la CI le vérifie.

## Fidélité des données

| Statut | Sens | Exemple |
|---|---|---|
| `documenté` | Source publique citée | Poussée au décollage 374,5 kN ([EASA TCDS E.111](https://www.easa.europa.eu/sites/default/files/dfu/EASA%20E111%20TCDS%20issue%2012_Trent%20XWB.pdf)) |
| `estimé` | Calculé ou réglé, sans source directe | Surface alaire, masse maximale à l'atterrissage |
| `fictif` | Inventé pour les besoins pédagogiques | Points de route, échos du radar météo |

Les sources utilisées sont listées dans [`packages/aircraft-a350/data/sources.json`](packages/aircraft-a350/data/sources.json) et dans l'[audit fonctionnel](docs/FUNCTIONAL_AUDIT.md).

## Documentation

| Document | Contenu |
|---|---|
| [PROJECT_OVERVIEW](docs/PROJECT_OVERVIEW.md) | Vision, périmètre, principes |
| [FUNCTIONAL_AUDIT](docs/FUNCTIONAL_AUDIT.md) | Diagnostic du prototype, réalisme, incohérences |
| [SPECIFICATIONS](docs/SPECIFICATIONS.md) | Exigences numérotées et décisions |
| [TECHNICAL_ARCHITECTURE](docs/TECHNICAL_ARCHITECTURE.md) | Architecture, modules, flux de données |
| [A350_SYSTEMS_MAP](docs/A350_SYSTEMS_MAP.md) | Systèmes, dépendances, statut des commandes |
| [UI_UX_SPECIFICATIONS](docs/UI_UX_SPECIFICATIONS.md) | Vues, interactions, accessibilité |
| [SIMULATION_ENGINE](docs/SIMULATION_ENGINE.md) | Modèles physiques et hypothèses |
| [TEST_STRATEGY](docs/TEST_STRATEGY.md) | Stratégie de test et vols de référence |
| [ROADMAP](docs/ROADMAP.md) | Phases, livrables, risques, critères de fin |
| [CHANGELOG](docs/CHANGELOG.md) | Historique des versions |
| [SC-HA-01](docs/scenarios/SC-HA-01-croisiere-convection.md) | Scénario générique : haute altitude, convection, survitesse |

## Licence

Aucune licence n'est encore choisie : en l'absence de licence, **tous droits réservés** par l'auteur. Le choix d'une licence (libre ou non) reste à faire avant toute distribution.

Composants tiers : la police B612 (licence libre, à confirmer dans son dépôt officiel), Three.js (MIT), React (MIT) et l'image NASA Blue Marble (domaine public) gardent leurs licences respectives.
