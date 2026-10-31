# Contrôle hors ligne (secours)

Ces scripts servent **uniquement** quand le registre npm est inaccessible (cas de l'environnement où la phase 1 a été écrite). Ils ne remplacent pas la chaîne officielle (`pnpm test`, `pnpm build`, CI).

| Script | Ce qu'il fait | Différence avec la chaîne officielle |
|---|---|---|
| `run-tests.mjs` | Compile les `*.test.ts` avec esbuild et les lance avec `node --test` | `vitest` remplacé par `vitest-shim.mjs` (sous-ensemble d'assertions) |
| `build-app.mjs` | Compile `apps/desktop` avec esbuild dans `out/app/` | `zustand` et `three` remplacés par des cales (`shims/`) ; Three.js r128 du prototype ; polices @fontsource absentes |
| `tsconfig.packages.json` | Contrôle de types des paquets et du moteur de l'application | Composants React non vérifiés (pas de `@types/react` hors ligne) |

Prérequis : `NODE_PATH` contenant `esbuild`, `zod`, `react`, `react-dom`, `playwright`.

```bash
node tools/offline-check/run-tests.mjs
node tools/offline-check/build-app.mjs && node tests/e2e/smoke.mjs tools/offline-check/out/app
tsc -p tools/offline-check/tsconfig.packages.json
```

À supprimer dès que la CI officielle est au vert.
