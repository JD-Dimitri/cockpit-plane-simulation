/* =====================================================================
   JOURNAL DE BORD : heures OOOI (Out, Off, On, In), étapes du vol,
   carburant, et carnet de vol cumulé (gardé dans ce navigateur).
   ===================================================================== */
const LOG = { ev: [], f: {}, dist: 0, maxAlt: 0, lastT: 0, lastWp: -1, fob0: 0, notes: [] };
const CARNET_KEY = 'a350_carnet_v1';
function logReset() {
  Object.assign(LOG, { ev: [], f: {}, dist: 0, maxAlt: 0, lastT: S.t, lastWp: S.fms.active, fob0: fob(), notes: [] });
  logEvent('info', `Vol ${S.fms.fltNbr} ${S.fms.from} → ${S.fms.to}, départ « ${({ cold: 'cockpit froid au parking', ready: 'aligné sur la piste', cruise: 'en croisière', approach: 'en approche finale' })[S.scenario] || S.scenario} ».`);
}
function logEvent(kind, text) {
  const a = S.ac;
  LOG.ev.push({ utc: simUtc(), kind, text, alt: Math.round(a.alt / FT), fob: Math.round(fob()), ph: S.phase });
}
const flag = (k, cond, fn) => { if (!LOG.f[k] && cond) { LOG.f[k] = simUtc(); fn && fn(); } };
function logUpdate() {
  if (!S) return;
  const a = S.ac, dt = S.t - LOG.lastT; LOG.lastT = S.t;
  if (dt > 0 && dt < 3600) LOG.dist += a.V * Math.cos(a.gam) * dt;
  LOG.maxAlt = Math.max(LOG.maxAlt, a.alt / FT);
  S.eng.forEach((e, i) => flag('eng' + i, e.st === 'run' && S.scenario === 'cold', () => logEvent('eng', `Moteur ${i + 1} démarré (N3 ${Math.round(e.n3)} %).`)));
  flag('OUT', a.onGround && !S.tookOff && a.V > 1 && S.eng.some(e => e.st === 'run'), () => logEvent('ooo', 'OUT : début du roulage, frein de parking desserré.'));
  flag('OFF', S.tookOff, () => logEvent('ooo', `OFF : décollage de ${AIRPORTS[S.fms.from].name}, piste ${S.fms.depRwy}.`));
  flag('TOC', S.phase === 'CRUISE', () => logEvent('nav', `Sommet de montée : niveau ${Math.round(a.alt / FT / 100)}.`));
  if (S.tookOff && !a.onGround && S.fms.active !== LOG.lastWp) { const w = S.fms.wpts[LOG.lastWp]; if (w && LOG.lastWp > 0) logEvent('wpt', `Point ${w.id} passé, niveau ${Math.round(a.alt / FT / 100)}, ${Math.round(ias())} kt.`); LOG.lastWp = S.fms.active; }
  flag('TOD', S.tookOff && ['DES', 'OP DES'].includes(S.fg.vert), () => logEvent('nav', `Début de descente, reste ${S.nav ? Math.round(S.nav.rem / NM) : '?'} NM.`));
  flag('ON', S.tookOff && a.onGround && a.tdT > 0, () => logEvent('ooo', `ON : atterrissage à ${nearestApt(a.lat, a.lon).ap.name}, taux ${Math.round(a.lastTdVs)} ft/min.`));
  flag('IN', S.arrived, () => { logEvent('ooo', 'IN : au poste de stationnement, frein de parking serré.'); carnetSave(); });
  for (const al of S.ecam.alerts) flag('al_' + al.id, al.lvl === 3, () => logEvent('alert', 'Alarme : ' + al.title));
  flag('crash', !!S.crash, () => logEvent('alert', 'Accident : ' + S.crash));
}
const tFmt = t => t ? utcStr(t) : '--:--';
const dur = (a, b) => (a && b) ? hhmm((b - a) / 3600e3) : '--';
function carnetLoad() { try { return JSON.parse(localStorage.getItem(CARNET_KEY) || '[]'); } catch (e) { return []; } }
function carnetSave() {
  const L = carnetLoad();
  L.unshift({ date: new Date(S.utc0).toISOString().slice(0, 10), flt: S.fms.fltNbr, from: S.fms.from, to: S.fms.to,
    block: LOG.f.OUT && LOG.f.IN ? (LOG.f.IN - LOG.f.OUT) / 3600e3 : 0, air: LOG.f.OFF && LOG.f.ON ? (LOG.f.ON - LOG.f.OFF) / 3600e3 : 0,
    fuel: Math.round(LOG.fob0 - fob()), ldg: Math.round(S.ac.lastTdVs), rb: COMMS.readbacks });
  try { localStorage.setItem(CARNET_KEY, JSON.stringify(L.slice(0, 50))); } catch (e) { }
}
function logSummaryText() {
  const f = LOG.f;
  return [`JOURNAL DE BORD — ${S.fms.fltNbr} ${S.fms.from} → ${S.fms.to} — A350-900`,
    `OUT ${tFmt(f.OUT)}  OFF ${tFmt(f.OFF)}  ON ${tFmt(f.ON)}  IN ${tFmt(f.IN)} (UTC)`,
    `Temps bloc ${dur(f.OUT, f.IN)} · temps de vol ${dur(f.OFF, f.ON)} · distance ${Math.round(LOG.dist / NM)} NM · carburant consommé ${Math.round(LOG.fob0 - fob())} kg`,
    ...LOG.ev.map(e => `${tFmt(e.utc)}  ${e.text}`), ...LOG.notes.map(n => `${tFmt(n.utc)}  NOTE : ${n.text}`)].join('\n');
}
function renderLog() {
  const box = $('logBody'); if (!box || VIEW !== 'log') return;
  const f = LOG.f, a = S.ac;
  const card = (l, v) => `<div class="lc"><span>${l}</span><b>${v}</b></div>`;
  const cards = card('OUT · départ du poste', tFmt(f.OUT)) + card('OFF · décollage', tFmt(f.OFF)) + card('ON · atterrissage', tFmt(f.ON)) + card('IN · arrivée au poste', tFmt(f.IN)) +
    card('Temps bloc', dur(f.OUT, f.IN || (f.OUT ? simUtc() : 0))) + card('Temps de vol', dur(f.OFF, f.ON || (f.OFF ? simUtc() : 0))) +
    card('Distance parcourue', Math.round(LOG.dist / NM) + ' NM') + card('Carburant consommé', fmt(Math.round(LOG.fob0 - fob())) + ' kg') +
    card('Altitude max', 'FL' + Math.round(LOG.maxAlt / 100)) + card('Atterrissage', f.ON ? Math.round(a.lastTdVs) + ' ft/min' : '--') +
    card('Collationnements', `${COMMS.readbacks} par toi · ${COMMS.missed} par le copilote`);
  const rows = LOG.ev.concat(LOG.notes.map(n => ({ utc: n.utc, kind: 'note', text: 'Note : ' + n.text, alt: n.alt, fob: n.fob }))).sort((x, y) => x.utc - y.utc)
    .map(e => `<tr class="k-${e.kind}"><td>${tFmt(e.utc)}</td><td>${e.text}</td><td>${e.alt != null ? fmt(e.alt) : ''}</td><td>${e.fob != null ? fmt(e.fob) : ''}</td></tr>`).reverse().join('');
  const C = carnetLoad(), tot = C.reduce((s, x) => s + (x.air || 0), 0);
  const crows = C.map(x => `<tr><td>${x.date}</td><td>${x.flt}</td><td>${x.from} → ${x.to}</td><td>${hhmm(x.block || 0)}</td><td>${hhmm(x.air || 0)}</td><td>${fmt(x.fuel)} kg</td><td>${x.ldg} ft/min</td></tr>`).join('');
  const html = `<div class="lcards">${cards}</div>
    <h3>Événements du vol</h3>
    <div class="lnote"><input id="logNote" placeholder="Ajouter une note au journal (ex. : turbulence légère au FL370)" maxlength="140"><button class="btn" id="logAdd">Ajouter</button><button class="btn" id="logCopy">Copier le journal</button></div>
    <div class="tblw"><table class="ltab"><thead><tr><th>UTC</th><th>Événement</th><th>Alt ft</th><th>Carburant kg</th></tr></thead><tbody>${rows}</tbody></table></div>
    <h3>Carnet de vol <small>${C.length} vol${C.length > 1 ? 's' : ''} · ${hhmm(tot)} de vol au total · gardé dans ce navigateur</small></h3>
    ${C.length ? `<div class="tblw"><table class="ltab"><thead><tr><th>Date</th><th>Vol</th><th>Trajet</th><th>Bloc</th><th>Vol</th><th>Carburant</th><th>Atterrissage</th></tr></thead><tbody>${crows}</tbody></table></div>` : '<p class="muted">Ton premier vol terminé au parking s\'inscrira ici.</p>'}`;
  const focused = document.activeElement && document.activeElement.id === 'logNote';
  if (!focused && box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html;
    $('logAdd').onclick = () => { const v = $('logNote').value.trim(); if (v) { LOG.notes.push({ utc: simUtc(), text: v, alt: Math.round(S.ac.alt / FT), fob: Math.round(fob()) }); $('logNote').value = ''; box.dataset.h = ''; renderLog(); } };
    $('logCopy').onclick = () => { const t = logSummaryText(); const ok = () => showMsg('Journal copié dans le presse-papiers.', 'ok', 3); try { navigator.clipboard.writeText(t).then(ok, () => fallbackCopy(t)); } catch (e) { fallbackCopy(t); } };
  }
}
function fallbackCopy(t) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); showMsg('Journal copié.', 'ok', 3); } catch (e) { showMsg('Copie impossible ici : sélectionne le texte à la main.', 'warn', 4); } ta.remove(); }
function renderRadio() {
  const box = $('radioBody'); if (!box || VIEW !== 'radio') return;
  const lab = m => m.who === 'ATC' ? m.st : WHO[m.who];
  const html = COMMS.log.slice().reverse().map(m => `<div class="rm r-${m.who.toLowerCase()}"><div class="rh"><b>${lab(m)}</b><span>${tFmt(m.utc)}</span></div><p>${m.text}</p>${m.fr ? `<p class="tr">${m.fr}</p>` : ''}${m.rbOk ? '<p class="ok">✓ Collationné par toi</p>' : ''}</div>`).join('') || '<p class="muted">Les échanges radio et équipage apparaîtront ici dès que le vol commence (clairance, mise en route, roulage…).</p>';
  if (box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; }
}
/* Bandeau radio (sous le guide) : dernier message + bouton Collationner */
function renderRadioBar() {
  const bar = $('radioBar'); if (!bar) return;
  const m = COMMS.log[COMMS.log.length - 1];
  if (!m || (performance.now() - (m.shownAt || (m.shownAt = performance.now()))) > 14000 && !COMMS.pending) { bar.hidden = true; return; }
  bar.hidden = false;
  const p = COMMS.pending ? COMMS.pending.m : m;
  const who = p.who === 'ATC' ? p.st : WHO[p.who];
  const t = `<span class="rb-who r-${p.who.toLowerCase()}">${who}</span><span class="rb-txt">${p.text}${p.fr ? `<em>${p.fr}</em>` : ''}</span>`;
  if ($('rbMsg').innerHTML !== t) $('rbMsg').innerHTML = t;
  $('rbBtn').hidden = !COMMS.pending;
}
