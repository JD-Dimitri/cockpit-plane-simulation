/* =====================================================================
   ROULAGE AU SOL : parking → piste au départ, piste → parking à l'arrivée
   Plan simplifié de chaque aéroport, dans le repère de sa piste principale
   (« along » le long de l'axe depuis le seuil principal, « side » positif à droite) :
   taxiway parallèle à 245 m à gauche, 3 bretelles (début, milieu, fin), parking à 420 m.
   ===================================================================== */
const TAXI_SIDE = -245, GATE_SIDE = -420;
function aptFrame(icao) {
  const ap = AIRPORTS[icao], r = rwyGeom(icao, ap.def);
  const ll = (al, sd) => { const p = gcDest(r.thr.lat, r.thr.lon, r.hdg, al); return gcDest(p.lat, p.lon, r.hdg + 90, sd); };
  const proj = (lat, lon) => { const p = enu(r.thr.lat, r.thr.lon, lat, lon), h = r.hdg * D2R; return { al: p.e * Math.sin(h) + p.n * Math.cos(h), sd: p.e * Math.cos(h) - p.n * Math.sin(h) }; };
  return { ap, r, ll, proj, len: r.len, conn: [45, r.len / 2, r.len - 45] };
}
function taxiSet(mode, pts, finalHdg) {
  S.taxi = { mode, pts, i: 0, auto: false, done: false, finalHdg, lined: false, warnT: 0 };
}
/* Départ : du parking à l'entrée de la piste choisie dans le FMS */
function buildTaxiDep() {
  const f = S.fms, F = aptFrame(f.from), def = f.depRwy === F.ap.def;
  const endAl = def ? F.conn[0] : F.conn[2], mid = F.len / 2;
  const pts = [[mid, GATE_SIDE + 60], [mid, TAXI_SIDE], [endAl, TAXI_SIDE], [endAl, 0]].map(([al, sd]) => ({ ...F.ll(al, sd), al, sd }));
  taxiSet('dep', pts, rwyGeom(f.from, f.depRwy).hdg);
}
/* Arrivée : de la position sur la piste jusqu'au parking, par la prochaine bretelle */
function buildTaxiArr() {
  const f = S.fms, F = aptFrame(f.to), def = f.arrRwy === F.ap.def, a = S.ac;
  const cur = F.proj(a.lat, a.lon).al, dir = def ? 1 : -1;
  const ahead = F.conn.filter(c => (c - cur) * dir > 60).sort((x, y) => (x - y) * dir);
  const c = ahead.length ? ahead[0] : (dir > 0 ? F.conn[2] : F.conn[0]), mid = F.len / 2;
  const pts = [[c, 0], [c, TAXI_SIDE], [mid, TAXI_SIDE], [mid, GATE_SIDE + 20]].map(([al, sd]) => ({ ...F.ll(al, sd), al, sd }));
  taxiSet('arr', pts, null);
}
function taxiInfo() {
  const T = S.taxi; if (!T || T.done || !S.ac.onGround) return null;
  const p = T.pts[Math.min(T.i, T.pts.length - 1)], a = S.ac;
  const d = gcDist(a.lat, a.lon, p.lat, p.lon), brg = gcBrg(a.lat, a.lon, p.lat, p.lon);
  let rest = d; for (let k = T.i + 1; k < T.pts.length; k++) rest += gcDist(T.pts[k - 1].lat, T.pts[k - 1].lon, T.pts[k].lat, T.pts[k].lon);
  return { d, brg, rest, last: T.i >= T.pts.length - 1 };
}
function taxiUpdate(dt) {
  const a = S.ac, c = S.ctl;
  if (!a.onGround) return;
  // création automatique des trajets
  if (!S.tookOff && !S.taxi && S.scenario === 'cold') buildTaxiDep();
  if (S.tookOff && a.V < 40 * KT && nearestApt(a.lat, a.lon).ap.icao === S.fms.to && (!S.taxi || S.taxi.mode !== 'arr')) buildTaxiArr();
  const T = S.taxi; if (!T || T.done) { if (T && T.auto) T.auto = false; return; }
  const inf = taxiInfo(); if (!inf) return;
  const kt = a.V / KT;
  // séquencement des points
  if (!inf.last && inf.d < 28) T.i++;
  // limite de vitesse au roulage
  T.warnT -= dt;
  if (kt > 32 && Math.max(...c.tla) < TLA_FLX - 1 && T.warnT <= 0 && !(T.mode === 'arr' && kt > 40)) { showMsg('Roulage : 30 kt maximum en ligne droite, 10 kt dans les virages.', 'warn', 4); T.warnT = 8; }
  if (!T.auto) return;
  // ---- roulage automatique ----
  const run = S.eng.every(e => e.st === 'run');
  if (!run) { T.auto = false; showMsg('Roulage auto : les deux moteurs doivent tourner.', 'warn', 5); return; }
  c.park = false;
  const hdg = a.psi * R2D;
  let tgtHdg = inf.brg, vt = 15;
  const next = T.pts[T.i + 1];
  if (inf.last && inf.d < 22 && T.mode === 'dep') T.lined = true;
  if (T.lined) {                                               // alignement sur l'axe de piste (on garde ce mode jusqu'au bout)
    tgtHdg = T.finalHdg; vt = 4;
    if (Math.abs(wrap180(hdg - T.finalHdg)) < 4) { T.done = true; T.auto = false; c.tla = [0, 0]; c.tiller = 0; c.park = true; showMsg('Aligné sur la piste ' + S.fms.depRwy + ', frein de parking serré. Prêt au décollage.', 'ok', 8); return; }
  } else if (inf.last && T.mode === 'arr' && inf.d < 20) {     // arrivée au poste
    T.done = true; T.auto = false; c.tla = [0, 0]; c.tiller = 0; c.park = true; showMsg('Au parking. Frein de parking serré : coupe les moteurs.', 'ok', 8); return;
  }
  const err = wrap180(tgtHdg - hdg);
  if (Math.abs(err) > 25) vt = 6;
  if (next && inf.d < 90) { const turn = Math.abs(wrap180(gcBrg(T.pts[T.i].lat, T.pts[T.i].lon, next.lat, next.lon) - inf.brg)); if (turn > 30) vt = Math.min(vt, 8); }
  if (inf.last && inf.d < 120) vt = Math.min(vt, 6);
  c.tiller = clamp(err / 18, -1, 1);
  const t = clamp(1.3 + (vt - kt) * 0.28, 0, 4);
  c.tla = [t, t];
  c.brake = kt > vt + 2 ? clamp((kt - vt) / 6, 0, 1) : 0;
  T.autoBrake = c.brake;
}
function taxiToggleAuto() {
  const T = S.taxi;
  if (!S.ac.onGround) return showMsg('Roulage auto : uniquement au sol.', 'warn', 3);
  if (!T || T.done) return showMsg(S.tookOff ? 'Pas de trajet de roulage actif.' : 'Roulage terminé : tu es déjà aligné sur la piste.', 'info', 4);
  if (Math.max(...S.ctl.tla) > 8) return showMsg('Roulage auto : manettes au ralenti d\'abord.', 'warn', 4);
  T.auto = !T.auto;
  if (!T.auto) { S.ctl.tla = [0, 0]; S.ctl.tiller = 0; S.ctl.brake = 0; }
  else showMsg(T.mode === 'dep' ? 'Roulage auto vers la piste ' + S.fms.depRwy + '.' : 'Roulage auto vers le parking.', 'ok', 4);
}
function taxiLine() {
  const inf = taxiInfo(); if (!inf) return '';
  return (S.taxi.mode === 'dep' ? 'Vers la piste ' + S.fms.depRwy : 'Vers le parking') + ' : ' + Math.round(inf.rest) + ' m · prochain point ' + Math.round(inf.d) + ' m au ' + pad3(inf.brg) + '°';
}
