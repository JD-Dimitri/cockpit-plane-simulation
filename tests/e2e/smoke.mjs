// Test de fumée de l'interface (Playwright), sur le build web de l'application.
// Usage : node tests/e2e/smoke.mjs <dossier du build>   (défaut : apps/desktop/dist)
// Vérifie : avertissement au premier lancement (EF-004), persistance de l'acceptation,
// boucle moteur (Worker) → instantané → interface, pause et accélération, commande
// vers le moteur, statuts des données (EF-001), 3D, AUCUNE requête réseau externe
// (ENF-002) et aucune erreur console.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const dir = resolve(process.argv[2] ?? join(root, 'apps/desktop/dist'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml', '.map': 'application/json' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  const file = join(dir, rel === '' ? 'index.html' : rel);
  if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`); };
const external = [];
const consoleErrors = [];

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    external.push(u.href);
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto(base);
  const disc = page.getByTestId('disclaimer');
  await disc.waitFor({ timeout: 10_000 });
  check('Avertissement affiché au premier lancement', await disc.isVisible());
  check('Avertissement : mention « non certifié »', (await disc.innerText()).includes('non certifié'));
  check('Interface masquée tant que non accepté', (await page.getByTestId('main').count()) === 0);
  check('Bouton d’acceptation focalisé (clavier)', await page.getByTestId('disclaimer-accept').evaluate((el) => el === document.activeElement));
  await page.keyboard.press('Enter');
  await page.getByTestId('main').waitFor({ timeout: 10_000 });
  check('Acceptation au clavier', true);

  const time = page.getByTestId('sim-time');
  await page.waitForFunction(() => document.querySelector('[data-testid="sim-time"]')?.textContent !== '--:--:--', null, { timeout: 10_000 });
  const toSec = (s) => s.split(':').map(Number).reduce((a, v) => a * 60 + v, 0);
  const t1 = toSec(await time.innerText());
  await page.waitForTimeout(2200);
  const t2 = toSec(await time.innerText());
  check('Le moteur (Worker) avance à ×1', t2 - t1 >= 1 && t2 - t1 <= 4, `${t1} s → ${t2} s`);

  await page.getByTestId('pause').click();
  await page.waitForTimeout(300);
  const p1 = toSec(await time.innerText());
  await page.waitForTimeout(1500);
  const p2 = toSec(await time.innerText());
  check('Pause : le temps simulé s’arrête', p1 === p2, `${p1} s / ${p2} s`);
  await page.getByTestId('pause').click();

  await page.getByTestId('scale-64').click();
  const a1 = toSec(await time.innerText());
  await page.waitForTimeout(1500);
  const a2 = toSec(await time.innerText());
  check('Accélération ×64', a2 - a1 >= 40, `+${a2 - a1} s simulées en 1,5 s`);
  check('Bouton ×64 marqué actif (aria-pressed)', (await page.getByTestId('scale-64').getAttribute('aria-pressed')) === 'true');

  await page.getByTestId('probe-slider').fill('36000');
  await page.waitForFunction(() => document.querySelector('[data-testid="probe-alt"]')?.textContent === '36000', null, { timeout: 5000 });
  const temp = await page.getByTestId('probe-temp').innerText();
  check('Commande vers le moteur : ISA à 36 000 ft ≈ −56,3 °C (sous la tropopause)', temp.startsWith('-56.3'), temp);

  const mtow = page.locator('[data-key="mass.mtow"]');
  check('Données : MTOW 283 000 kg marquée « documenté »', (await mtow.innerText()).includes('documenté'));
  check('Données : MLW marquée « estimé »', (await page.locator('[data-key="mass.mlw"]').innerText()).includes('estimé'));

  check('Vue 3D (Three.js local) rendue', (await page.getByTestId('world-canvas').count()) === 1);

  await mkdir(join(root, 'test-results'), { recursive: true });
  await page.screenshot({ path: join(root, 'test-results/smoke.png') });

  await page.reload();
  await page.getByTestId('main').waitFor({ timeout: 10_000 });
  check('Acceptation mémorisée après rechargement', (await page.getByTestId('disclaimer').count()) === 0);

  check('Aucune requête réseau externe (ENF-002)', external.length === 0, external.join(', '));
  check('Aucune erreur console', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} contrôles réussis`);
process.exit(failed ? 1 : 0);
