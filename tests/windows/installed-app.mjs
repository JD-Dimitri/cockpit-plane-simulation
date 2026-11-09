// Test de l'application INSTALLÉE sur Windows (exécuté par la CI après l'installeur NSIS).
// Pilote le vrai WebView2 de l'application via le protocole DevTools (Playwright connectOverCDP).
//
// Usage : node tests/windows/installed-app.mjs <chemin de l'exe installé> <dossier de sortie>
//
// Vérifie : premier lancement (temps jusqu'à l'avertissement), avertissement « non certifié »,
// moteur (Worker), pause et accélération, commande vers le moteur, globe Three.js réellement
// rendu en WebGL (pixels de la route magenta), tableau des statuts, mémorisation de
// l'acceptation après redémarrage, aucune requête hors de l'application, aucune erreur console.
// Le pare-feu Windows est configuré par la CI pour bloquer l'accès réseau sortant de l'application.
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const exe = process.argv[2];
const outDir = resolve(process.argv[3] ?? 'test-results/windows');
if (!exe) { console.error('Chemin de l’exécutable manquant'); process.exit(2); }
mkdirSync(outDir, { recursive: true });

const PORT = 9222;
// Origines propres à Tauri 2 sous Windows : contenu (tauri.localhost) et IPC (ipc.localhost).
const ALLOWED_HOSTS = new Set(['tauri.localhost', 'ipc.localhost']);
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail: String(detail) });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail !== '' ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const t0 = Date.now();
  const child = spawn(exe, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
    stdio: 'ignore',
  });
  let exited = null;
  child.on('exit', (code, signal) => { exited = { code, signal }; });
  child.on('error', (e) => { exited = { error: String(e) }; });
  let browser = null;
  // jusqu'à 120 s : le premier lancement après une installation de WebView2 peut être lent
  for (let i = 0; i < 120 && !browser && !exited; i++) {
    try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`, { timeout: 5000 }); } catch { await sleep(1000); }
  }
  if (!browser) {
    diagnose(exited);
    throw new Error(`Impossible de se connecter au WebView2 de l’application après ${((Date.now() - t0) / 1000).toFixed(0)} s`
      + (exited ? ` — processus terminé : ${JSON.stringify(exited)}` : ' — processus toujours actif'));
  }
  let page = null;
  for (let i = 0; i < 60 && !page; i++) {
    page = browser.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith('devtools:')) ?? null;
    if (!page) await sleep(250);
  }
  if (!page) throw new Error('Aucune page dans le WebView2');
  return { child, browser, page, t0 };
}

/** Diagnostic en cas d'échec : processus, port de débogage, capture du bureau. */
function diagnose(exited) {
  const ps = (cmd) => {
    try { return execFileSync('powershell.exe', ['-NoProfile', '-Command', cmd], { encoding: 'utf8', timeout: 30_000 }); }
    catch (e) { return `échec : ${e.message}`; }
  };
  const report = [
    `Processus de l'application : ${exited ? JSON.stringify(exited) : 'actif'}`,
    '--- Processus a350 / WebView2 (ligne de commande) ---',
    ps("Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'a350|msedgewebview2' } | ForEach-Object { \"$($_.Name) [$($_.ProcessId)] $($_.CommandLine)\" }"),
    `--- Ports en écoute (${PORT}) ---`,
    ps(`Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -eq ${PORT} | Format-Table -AutoSize | Out-String`),
    '--- Journal Application (erreurs récentes) ---',
    ps("Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2; StartTime=(Get-Date).AddMinutes(-10)} -MaxEvents 10 -ErrorAction SilentlyContinue | Format-List TimeCreated, ProviderName, Message | Out-String -Width 300"),
  ].join('\n');
  console.log(report);
  writeFileSync(join(outDir, 'diagnostic.txt'), report);
  const shot = join(outDir, 'bureau-echec.png').replace(/'/g, "''");
  ps(`Add-Type -AssemblyName System.Windows.Forms, System.Drawing; $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height; $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); $bmp.Save('${shot}')`);
}

/**
 * Requêtes faites avant que le test ne se branche : relevées dans l'historique de chargement
 * du navigateur (Resource Timing), ajoutées au contrôle « aucune requête externe ».
 */
async function early(page, w) {
  for (let i = 0; i < 60 && !page.url().startsWith('http://tauri.localhost'); i++) await sleep(500);
  try { await page.waitForLoadState('load', { timeout: 15_000 }); } catch { /* déjà chargé */ }
  const urls = await page.evaluate(() => [location.href, ...performance.getEntriesByType('resource').map((e) => e.name)]);
  for (const raw of urls) {
    const u = new URL(raw);
    if (u.protocol === 'data:' || u.protocol === 'blob:') continue;
    w.seen.add(u.host);
    if (!ALLOWED_HOSTS.has(u.hostname)) w.external.push(raw);
  }
}

function watch(page) {
  const external = [], errors = [], seen = new Set();
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.protocol === 'data:' || u.protocol === 'blob:') return;
    seen.add(u.host);
    if (!ALLOWED_HOSTS.has(u.hostname)) external.push(req.url());
  });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return { external, errors, seen };
}

async function stop(app) {
  try { await app.browser.close(); } catch { /* déjà fermé */ }
  app.child.kill();
  await sleep(2000);
}

const toSec = (s) => s.split(':').map(Number).reduce((a, v) => a * 60 + v, 0);
let failedHard = null;

try {
  // ---------- Premier lancement ----------
  const app = await launch();
  const w = watch(app.page);
  await early(app.page, w); // requêtes faites avant la connexion du test
  const disc = app.page.getByTestId('disclaimer');
  await disc.waitFor({ timeout: 20_000 });
  check('Premier lancement : avertissement affiché', true, `${((Date.now() - app.t0) / 1000).toFixed(1)} s depuis le lancement de l’exe (cible ENF-003 < 10 s)`);
  check('Avertissement : « non certifié »', (await disc.innerText()).includes('non certifié'));
  check('Origine de l’application', new URL(app.page.url()).hostname === 'tauri.localhost', app.page.url());
  await app.page.screenshot({ path: join(outDir, '1-premier-lancement.png') });
  await app.page.getByTestId('disclaimer-accept').click();
  await app.page.getByTestId('main').waitFor({ timeout: 10_000 });

  const time = app.page.getByTestId('sim-time');
  await app.page.waitForFunction(() => document.querySelector('[data-testid="sim-time"]')?.textContent !== '--:--:--', null, { timeout: 15_000 });
  const t1 = toSec(await time.innerText());
  await sleep(2500);
  const t2 = toSec(await time.innerText());
  check('Moteur (Web Worker) : le temps simulé avance à ×1', t2 - t1 >= 1 && t2 - t1 <= 5, `${t1} s → ${t2} s`);

  await app.page.getByTestId('pause').click();
  await sleep(400);
  const p1 = toSec(await time.innerText());
  await sleep(1500);
  check('Pause', toSec(await time.innerText()) === p1);
  await app.page.getByTestId('pause').click();
  await app.page.getByTestId('scale-64').click();
  const a1 = toSec(await time.innerText());
  await sleep(1500);
  const a2 = toSec(await time.innerText());
  check('Accélération ×64', a2 - a1 >= 40, `+${a2 - a1} s simulées en 1,5 s`);

  await app.page.getByTestId('probe-slider').fill('36000');
  await app.page.waitForFunction(() => document.querySelector('[data-testid="probe-alt"]')?.textContent === '36000', null, { timeout: 5000 });
  const temp = await app.page.getByTestId('probe-temp').innerText();
  check('Commande vers le moteur : ISA à 36 000 ft = −56,3 °C', temp.startsWith('-56.3'), temp);

  // Globe : canvas WebGL présent et route magenta réellement dessinée (lecture des pixels de la capture)
  const canvas = app.page.getByTestId('world-canvas');
  check('Globe Three.js : canvas présent', (await canvas.count()) === 1);
  check('Globe : pas de message « 3D indisponible »', (await app.page.getByText('La 3D n’est pas disponible').count()) === 0
    && (await app.page.getByText("La 3D n'est pas disponible").count()) === 0);
  const png = await canvas.screenshot({ path: join(outDir, '2-globe.png') });
  const stats = await app.page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    let magenta = 0, grid = 0;
    for (let i = 0; i < d.length; i += 4) {
      const [r, gg, b] = [d[i], d[i + 1], d[i + 2]];
      if (r > 180 && b > 180 && gg < 90) magenta++;
      if (b > 70 && r < 60 && gg > 40 && gg < 110) grid++;
    }
    return { magenta, grid, w: img.width, h: img.height };
  }, png.toString('base64'));
  check('Route La Réunion → Paris dessinée (pixels magenta)', stats.magenta > 50, `${stats.magenta} px magenta, ${stats.grid} px de grille, ${stats.w}×${stats.h}`);
  check('Grille du globe dessinée', stats.grid > 500, `${stats.grid} px`);

  const mtow = await app.page.locator('[data-key="mass.mtow"]').innerText();
  check('Tableau des statuts : MTOW « documenté » + source Airbus', mtow.includes('documenté') && mtow.includes('Airbus'));
  check('Tableau des statuts : MLW « estimé »', (await app.page.locator('[data-key="mass.mlw"]').innerText()).includes('estimé'));
  check('Tableau des statuts : 7 lignes', (await app.page.locator('[data-testid="data-table"] tbody tr').count()) === 7);
  await app.page.screenshot({ path: join(outDir, '3-application.png') });

  check('Aucune requête hors de l’application (1er lancement)', w.external.length === 0, w.external.join(', ') || `hôtes vus : ${[...w.seen].join(', ')}`);
  check('Aucune erreur console (1er lancement)', w.errors.length === 0, w.errors.join(' | '));
  await stop(app);

  // ---------- Second lancement : acceptation mémorisée ----------
  const app2 = await launch();
  const w2 = watch(app2.page);
  await early(app2.page, w2);
  await app2.page.getByTestId('main').waitFor({ timeout: 20_000 });
  check('Second lancement : avertissement non redemandé', (await app2.page.getByTestId('disclaimer').count()) === 0);
  await sleep(1500);
  await app2.page.screenshot({ path: join(outDir, '4-second-lancement.png') });
  check('Aucune requête hors de l’application (2e lancement)', w2.external.length === 0, w2.external.join(', '));
  check('Aucune erreur console (2e lancement)', w2.errors.length === 0, w2.errors.join(' | '));
  await stop(app2);
} catch (err) {
  failedHard = err;
  check('Exécution du test sans exception', false, err?.stack ?? err);
}

const failed = results.filter((r) => !r.ok).length;
writeFileSync(join(outDir, 'resultats.json'), JSON.stringify({ exe, results, failed }, null, 2));
console.log(`\n${results.length - failed}/${results.length} contrôles réussis`);
process.exit(failed || failedHard ? 1 : 0);
