// Contrôle HORS LIGNE de l'application : compile apps/desktop avec esbuild quand Vite
// n'est pas installable (registre npm inaccessible). Le build officiel reste « pnpm build » (Vite).
// Différences assumées : zustand et three remplacés par des cales (shims/), polices @fontsource absentes.
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { build } = createRequire(import.meta.url)('esbuild');
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const here = join(root, 'tools/offline-check');
const app = join(root, 'apps/desktop');
const out = join(here, 'out/app');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'assets'), { recursive: true });

const nodePaths = (process.env.NODE_PATH ?? '').split(':').filter(Boolean);
const shimPlugin = {
  name: 'offline-shims',
  setup(b) {
    b.onResolve({ filter: /^@fontsource\// }, (a) => ({ path: a.path, namespace: 'empty-css' }));
    b.onLoad({ filter: /.*/, namespace: 'empty-css' }, () => ({ contents: '', loader: 'css' }));
    b.onResolve({ filter: /createWorker\.ts$/ }, () => ({ path: join(here, 'shims/createWorker.ts') }));
  },
};
const common = {
  bundle: true, format: 'esm', target: 'es2022', platform: 'browser', sourcemap: true, nodePaths,
  alias: {
    zustand: join(here, 'shims/zustand.ts'),
    three: join(here, 'shims/three.mjs'),
    '@a350/sim-core': join(root, 'packages/sim-core/src/index.ts'),
    '@a350/aircraft-a350': join(root, 'packages/aircraft-a350/src/index.ts'),
  },
  define: { 'process.env.NODE_ENV': '"production"' },
  jsx: 'automatic', logLevel: 'warning', plugins: [shimPlugin],
};
await build({ ...common, entryPoints: { main: join(app, 'src/main.tsx') }, outdir: join(out, 'assets') });
await build({ ...common, entryPoints: { 'sim.worker': join(app, 'src/sim/sim.worker.ts') }, outdir: join(out, 'assets') });
copyFileSync(join(root, 'legacy/prototype-v0/three.r128.min.js'), join(out, 'assets/three.r128.min.js'));

// même CSP que vite.config.ts (build)
const csp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; worker-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'";
writeFileSync(join(out, 'index.html'), `<!doctype html>
<html lang="fr"><head>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark">
<title>Simulateur pédagogique type A350</title>
<link rel="stylesheet" href="assets/main.css">
<script src="assets/three.r128.min.js"></script>
<script type="module" src="assets/main.js"></script>
</head><body><div id="root"></div></body></html>
`);
console.log('Application compilée dans', out);
