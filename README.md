# Simulateur pédagogique de type A350

Application Windows autonome et hors ligne pour comprendre le fonctionnement d'un avion de ligne de type Airbus A350-900, sur les vols Saint-Denis de La Réunion (FMEE) ⇄ Paris (LFPO / LFPG).

> **Outil pédagogique non certifié.** Ni dispositif de formation agréé, ni moyen de qualification, ni source de procédures opérationnelles. Projet ni affilié, ni approuvé, ni soutenu par Airbus ou Rolls-Royce.

## État

| Phase | Contenu | État |
|---|---|---|
| 0 | Cadrage : 10 documents (`docs/`), prototype gelé (`legacy/prototype-v0`, étiquette `v0.0.0`) | fait, relecture et 2 décisions en attente |
| 1 | Squelette : monorepo, Tauri 2 + React + Vite + TypeScript, moteur dans un Web Worker, CI Windows | code écrit, à valider en CI (voir ci-dessous) |
| 2 | Portage du moteur de vol du prototype | à venir |

Feuille de route complète : [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Prérequis (Windows 10 ou 11)

- [Node.js 22](https://nodejs.org/) et pnpm : `corepack enable`
- [Rust](https://rustup.rs/) (chaîne stable, MSVC) et les « Build Tools for Visual Studio » (C++) — voir les [prérequis Tauri](https://v2.tauri.app/start/prerequisites/)
- WebView2 : présent sur Windows 10/11 récents ; l'installeur du projet l'embarque de toute façon (mode hors ligne).

## Commandes

```bash
pnpm install            # dépendances (génère pnpm-lock.yaml, à committer)
pnpm test               # tests Vitest : moteur, données, application
pnpm typecheck          # TypeScript strict sur tous les paquets
pnpm lint               # ESLint (règles d'architecture et de sécurité)
pnpm dev                # interface seule dans le navigateur (http://localhost:5173)
pnpm desktop:dev        # application Tauri en développement
pnpm desktop:build      # installeur Windows : apps/desktop/src-tauri/target/release/bundle/nsis/
pnpm build && pnpm e2e apps/desktop/dist   # test de fumée de l'interface (Playwright)
```

## Organisation

```
packages/sim-core/       boucle à pas fixe, horloge, ISA, géodésie, aléa déterministe, rejeu, sauvegarde
packages/aircraft-a350/  données de l'avion avec statut documenté / estimé / fictif et sources
apps/desktop/            React + Vite (interface), src-tauri/ (coquille Windows)
tests/e2e/               test de fumée de l'interface
legacy/prototype-v0/     prototype navigateur gelé : référence fonctionnelle, ne pas modifier
tools/offline-check/     contrôle de secours quand le registre npm est inaccessible (voir son README)
docs/                    les 10 documents du projet
```

## Règles du projet

1. Toute valeur affichée comme réelle cite une source publique ; sinon elle est « estimé » ou « fictif ». Un test refuse les données sans statut.
2. Le moteur ne connaît pas l'interface : il reçoit des commandes et publie un instantané. ESLint interdit d'importer React, Three.js ou Tauri dans `packages/`.
3. Aucune écriture HTML brute (`innerHTML`, `dangerouslySetInnerHTML`) : ESLint la refuse.
4. Aucune ressource réseau à l'exécution : polices et Three.js sont embarqués ; CSP `default-src 'self'`.
5. Une fonctionnalité sans test n'est pas terminée.
