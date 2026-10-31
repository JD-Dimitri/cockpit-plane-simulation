// Contrôle HORS LIGNE : compile chaque fichier *.test.ts des paquets avec esbuild
// (vitest → node:test) puis les exécute avec `node --test`.
// Usage : node tools/offline-check/run-tests.mjs  (NODE_PATH doit contenir esbuild et zod)
import { createRequire } from 'node:module';
import { readdirSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// require() respecte NODE_PATH, contrairement à import
const { build } = createRequire(import.meta.url)('esbuild');
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = join(root, 'tools/offline-check/out/tests');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const files = [];
const testDirs = [
  ...readdirSync(join(root, 'packages')).map((pkg) => ({ pkg, dir: join(root, 'packages', pkg, 'test') })),
  { pkg: 'desktop', dir: join(root, 'apps/desktop/test') },
];
for (const { pkg, dir } of testDirs) {
  try { for (const f of readdirSync(dir)) if (f.endsWith('.test.ts')) files.push({ pkg, path: join(dir, f) }); } catch { /* pas de tests */ }
}

const nodePaths = (process.env.NODE_PATH ?? '').split(':').filter(Boolean);
const outFiles = [];
for (const f of files) {
  const outfile = join(out, `${f.pkg}__${basename(f.path, '.ts')}.mjs`);
  await build({
    entryPoints: [f.path], outfile, bundle: true, platform: 'node', format: 'esm', target: 'node22',
    alias: {
      vitest: join(root, 'tools/offline-check/vitest-shim.mjs'),
      '@a350/sim-core': join(root, 'packages/sim-core/src/index.ts'),
      '@a350/aircraft-a350': join(root, 'packages/aircraft-a350/src/index.ts'),
    },
    external: ['node:*'],
    nodePaths, logLevel: 'warning',
    // les tests de parité lisent legacy/ par chemin relatif au fichier source
    define: { 'import.meta.url': JSON.stringify('file://' + f.path) },
  });
  outFiles.push(outfile);
}
console.log(`${outFiles.length} fichiers de test compilés`);
const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...outFiles], { stdio: 'inherit' });
process.exit(r.status ?? 1);
