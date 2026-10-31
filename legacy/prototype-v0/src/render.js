/* =====================================================================
   RENDU DES ÉCRANS : PFD, ND, EWD, SD, ISIS, VUE EXTÉRIEURE
   Police B612 : conçue pour les écrans de cockpit Airbus.
   ===================================================================== */
const COL = { g: '#3cf03c', c: '#2ad4ff', m: '#ff4dff', a: '#ffa31a', r: '#ff3b30', w: '#f2f2f2', y: '#ffe600', gr: '#6d7681', bg: '#05080b', sky: '#1d8ee0', gnd: '#8b4a17' };
const FONT = '"B612 Mono", "B612", ui-monospace, Menlo, Consolas, monospace';
function setupCanvas(cv, w, h) {
  const k = 2;
  if (cv.width !== w * k) { cv.width = w * k; cv.height = h * k; }
  const x = cv.getContext('2d'); x.setTransform(k, 0, 0, k, 0, 0); return x;
}
function txt(x, s, px, py, c, sz, al, bl) { x.fillStyle = COL[c] || c; x.font = `${sz || 11}px ${FONT}`; x.textAlign = al || 'left'; x.textBaseline = bl || 'middle'; x.fillText(s, px, py); }
function ln(x, x1, y1, x2, y2, c, w) { x.strokeStyle = COL[c] || c; x.lineWidth = w || 1; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); }
function box(x, px, py, w, h, c, lw) { x.strokeStyle = COL[c] || c; x.lineWidth = lw || 1; x.strokeRect(px, py, w, h); }
function blackScreen(x, w, h, msg) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); if (msg) txt(x, msg, w / 2, h / 2, '#2a3038', 10, 'center'); }
const pad3 = n => String(Math.round(wrap360(n)) % 360).padStart(3, '0');
const utcStr = (t) => { const d = new Date(t); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
const simUtc = () => S.utc0 + S.t * 1000;
const flash = (hz) => Math.floor(performance.now() / (500 / (hz || 1))) % 2 === 0;

/* ------------------------------ PFD ------------------------------ */
function drawPFD(cv) {
  const W = 290, H = 290, x = setupCanvas(cv, W, H);
  if (!S.sys.elec.ac) return blackScreen(x, W, H);
  x.fillStyle = COL.bg; x.fillRect(0, 0, W, H);
  const a = S.ac, G = S.fg, att = irAligned(), adr = adrOk();
  // ---- FMA ----
  const cw = W / 5;
  for (let i = 1; i < 5; i++) ln(x, i * cw, 2, i * cw, 40, 'gr');
  const athrCol = () => {
    const mx = Math.max(...S.ctl.tla);
    if (G.togaLk) return ['TOGA LK', 'g', ''];
    if (a.onGround && !S.tookOff || G.athrState === 'armed') {
      if (mx >= TLA_TOGA - 0.5) return ['MAN', 'w', 'TOGA'];
      if (mx >= TLA_FLX - 0.5) return ['MAN', 'w', (S.ac.onGround || S.phase === 'TAKEOFF') && S.fms.flex > 30 ? 'FLX ' + S.fms.flex : 'MCT'];
      if (G.lvrClb) return [flash() ? 'LVR CLB' : '', 'w', ''];
      return ['', 'w', ''];
    }
    if (G.athrState === 'active') return [G.retard && S.callout.t > 0 ? 'RETARD' : G.athrMode, 'g', ''];
    return ['', 'w', ''];
  };
  const [m1, c1, m1b] = athrCol();
  txt(x, m1, cw * 0.5, 12, c1, 9.5, 'center'); if (m1b) txt(x, m1b, cw * 0.5, 24, 'w', 9.5, 'center');
  if (m1 === 'MAN') box(x, 4, 4, cw - 8, 26, 'w');
  const vertTxt = G.vert === 'ALT*' ? 'ALT*' : G.vert;
  txt(x, vertTxt || '', cw * 1.5, 12, 'g', 9.5, 'center');
  txt(x, G.vertArm || '', cw * 1.5, 26, 'c', 9.5, 'center');
  txt(x, G.lat === 'LAND' ? '' : (G.lat || ''), cw * 2.5, 12, 'g', 9.5, 'center');
  if (G.lat === 'LAND' || G.vert === 'FLARE' || G.vert === 'ROLL OUT') txt(x, G.vert === 'LAND' ? 'LAND' : G.vert, cw * 2, 12, 'g', 9.5, 'center');
  txt(x, G.latArm || '', cw * 2.5, 26, 'c', 9.5, 'center');
  if ((G.lat || '').startsWith('LOC') || G.vert === 'LAND' || G.vert === 'FLARE') { txt(x, S.fcu.ap1 && S.fcu.ap2 ? 'CAT 3' : 'CAT 2', cw * 3.5, 12, 'w', 9, 'center'); txt(x, S.fcu.ap1 && S.fcu.ap2 ? 'DUAL' : 'SINGLE', cw * 3.5, 24, 'w', 9, 'center'); }
  else if (S.ls && S.efis.ls) txt(x, 'DH ' + S.fms.dh, cw * 3.5, 32, 'w', 8.5, 'center');
  const apT = S.fcu.ap1 && S.fcu.ap2 ? 'AP1+2' : S.fcu.ap1 ? 'AP1' : S.fcu.ap2 ? 'AP2' : '';
  txt(x, apT, cw * 4.5, 10, 'w', 9.5, 'center');
  txt(x, S.efis.fd ? '1 FD 2' : '', cw * 4.5, 21, 'w', 9.5, 'center');
  txt(x, G.athrState === 'off' ? '' : 'A/THR', cw * 4.5, 32, G.athrState === 'active' ? 'w' : 'c', 9.5, 'center');
  if (S.fg.apOffWarn && S.t - S.fg.apOffWarn < 4 && flash(2)) txt(x, 'AP OFF', cw * 4.5, 10, 'r', 9.5, 'center');

  // ---- Attitude ----
  const cx = 128, cy = 145, ppd = 4.3;
  x.save(); x.beginPath(); x.rect(64, 60, 128, 150); x.clip();
  if (att) {
    x.translate(cx, cy); x.rotate(-a.phi);
    const off = a.theta * R2D * ppd;
    x.fillStyle = COL.sky; x.fillRect(-200, -400 + off, 400, 400);
    x.fillStyle = COL.gnd; x.fillRect(-200, off, 400, 400);
    ln(x, -200, off, 200, off, 'w', 1.5);
    for (let p = -30; p <= 30; p += 2.5) {
      if (p === 0) continue;
      const y = off - p * ppd, w = p % 10 === 0 ? 34 : p % 5 === 0 ? 20 : 8;
      if (Math.abs(p - a.theta * R2D) > 14) continue;
      ln(x, -w / 2, y, w / 2, y, 'w', 1.2);
      if (p % 10 === 0) { txt(x, String(Math.abs(p)), -w / 2 - 10, y, 'w', 8.5, 'center'); txt(x, String(Math.abs(p)), w / 2 + 10, y, 'w', 8.5, 'center'); }
    }
    x.restore(); x.save(); x.beginPath(); x.rect(64, 60, 128, 150); x.clip();
    // échelle d'inclinaison
    x.translate(cx, cy);
    const R = 64;
    x.strokeStyle = COL.w; x.lineWidth = 1.3;
    for (const b of [-45, -30, -20, -10, 0, 10, 20, 30, 45]) {
      const an = (b - 90) * D2R, l = Math.abs(b) % 30 === 0 ? 8 : 5;
      ln(x, Math.cos(an) * R, Math.sin(an) * R, Math.cos(an) * (R + l), Math.sin(an) * (R + l), 'w', 1.3);
    }
    x.rotate(-a.phi);
    x.fillStyle = COL.y; x.beginPath(); x.moveTo(0, -R + 1); x.lineTo(-6, -R + 9); x.lineTo(6, -R + 9); x.closePath(); x.fill();
    // FD
    if (S.efis.fd && !(S.fcu.ap1 || S.fcu.ap2) || S.efis.fd && false) { }
    x.restore();
    if (S.efis.fd && (G.vert || G.lat) && !a.onGround) {
      const fy = clamp(-G.fdPitch * ppd, -50, 50), fx = clamp(G.fdRoll * 1.6, -50, 50);
      ln(x, cx - 40, cy + fy, cx + 40, cy + fy, 'g', 2.2);
      ln(x, cx + fx, cy - 40, cx + fx, cy + 40, 'g', 2.2);
    }
  } else {
    x.restore(); x.save();
    x.fillStyle = '#000'; x.fillRect(64, 60, 128, 150);
    if (flash()) txt(x, 'ATT', cx, cy, 'r', 14, 'center');
    if (S.sys.adirs.some(v => v > 0)) txt(x, 'ALIGN', cx, cy + 22, 'a', 9, 'center');
  }
  x.restore();
  // maquette avion
  x.fillStyle = '#000'; x.strokeStyle = COL.y; x.lineWidth = 2;
  [[cx - 46, cy - 2, 26, 5], [cx + 20, cy - 2, 26, 5]].forEach(r => { x.fillRect(...r); x.strokeRect(...r); });
  x.fillRect(cx - 3, cy - 3, 6, 6); x.strokeRect(cx - 3, cy - 3, 6, 6);
  // radio altitude
  const ra = radAlt();
  if (att && ra < 2500) txt(x, String(Math.round(ra < 50 ? ra : ra < 500 ? ra / 5 * 5 : ra / 10 * 10)), cx, 196, ra < S.fms.dh + 100 && !a.onGround ? 'a' : 'g', 12, 'center');
  // LS
  if (S.efis.ls && S.ls) {
    const L = S.ls;
    txt(x, AIRPORTS[S.fms.to].icao + ' ' + S.fms.arrRwy + ' · 109.' + (S.fms.to === 'FMEE' ? '90' : S.fms.to === 'LFPO' ? '50' : '10'), 70, 54, 'm', 7.5);
    if (L.inRange) {
      const dx = clamp(-L.locDev / 0.8 * 22, -46, 46), dy = clamp(-L.gsDev / 0.35 * 22, -46, 46);
      for (const k of [-2, -1, 1, 2]) { x.strokeStyle = COL.w; x.beginPath(); x.arc(cx + k * 22, 216, 2, 0, 7); x.stroke(); x.beginPath(); x.arc(197, cy + k * 22, 2, 0, 7); x.stroke(); }
      x.fillStyle = COL.m; x.beginPath(); x.moveTo(cx + dx, 212); x.lineTo(cx + dx + 5, 216); x.lineTo(cx + dx, 220); x.lineTo(cx + dx - 5, 216); x.fill();
      x.beginPath(); x.moveTo(197, cy + dy - 5); x.lineTo(201, cy + dy); x.lineTo(197, cy + dy + 5); x.lineTo(193, cy + dy); x.fill();
    }
  }
  // ---- Bande de vitesse ----
  const sx = 16, sw = 40, top = 60, bot = 210, sc = cy, ppk = 2.2;
  const v = ias(), sp = speeds();
  x.save(); x.beginPath(); x.rect(sx, top, sw, bot - top); x.clip();
  x.fillStyle = '#20262d'; x.fillRect(sx, top, sw, bot - top);
  if (adr) {
    const yOf = k => sc - (k - v) * ppk;
    for (let k = Math.max(30, Math.floor((v - 40) / 10) * 10); k < v + 40; k += 10) {
      const y = yOf(k); ln(x, sx + sw - 7, y, sx + sw, y, 'w', 1.2);
      if (k % 20 === 0) txt(x, String(k).padStart(3, ' '), sx + sw - 9, y, 'w', 10, 'right');
    }
    if (!a.onGround) {
      // VMAX barber pole
      x.save(); x.beginPath(); x.rect(sx + sw - 6, top, 6, Math.max(0, yOf(sp.vmax) - top)); x.clip();
      for (let y = top - 20; y < yOf(sp.vmax); y += 8) { x.fillStyle = COL.r; x.fillRect(sx + sw - 6, y, 6, 4); }
      x.restore();
      // VLS, alpha prot, alpha max
      x.fillStyle = COL.a; x.fillRect(sx + sw - 4, yOf(sp.vls), 2, Math.max(0, yOf(sp.vaprot) - yOf(sp.vls)));
      x.save(); x.beginPath(); x.rect(sx + sw - 6, yOf(sp.vaprot), 6, Math.max(0, yOf(sp.vamax) - yOf(sp.vaprot))); x.clip();
      for (let y = yOf(sp.vaprot); y < yOf(sp.vamax); y += 6) { x.fillStyle = COL.a; x.fillRect(sx + sw - 6, y, 6, 3); }
      x.restore();
      x.fillStyle = COL.r; x.fillRect(sx + sw - 6, yOf(sp.vamax), 6, bot);
      // GD / S / F
      const fl = Math.round(S.ctl.flapsLever);
      if (fl === 0) { x.strokeStyle = COL.g; x.beginPath(); x.arc(sx + sw + 3, yOf(sp.gd), 3, 0, 7); x.stroke(); }
      if (fl === 1) txt(x, 'S', sx + sw + 4, yOf(sp.s), 'g', 9);
      if (fl === 2 || fl === 3) txt(x, 'F', sx + sw + 4, yOf(sp.f), 'g', 9);
      // tendance
      const tr = (a.ax || 0) / KT * 10;
      if (Math.abs(tr) > 2) { ln(x, sx + sw - 14, sc, sx + sw - 14, sc - tr * ppk, 'y', 1.6); }
    } else if (S.fms.v1 && !S.tookOff) {
      txt(x, '1', sx + sw - 2, yOf(S.fms.v1), 'c', 10, 'right');
      x.fillStyle = COL.c; x.beginPath(); x.arc(sx + sw + 3, yOf(S.fms.vr), 2.5, 0, 7); x.fill();
    }
    // vitesse cible
    const tgt = G.spd ? G.spd.ktEq : 0, ty = clamp(yOf(tgt), top + 4, bot - 4);
    x.fillStyle = S.fcu.spdMan ? COL.m : COL.c;
    if (tgt) { x.beginPath(); x.moveTo(sx + sw, ty); x.lineTo(sx + sw + 7, ty - 5); x.lineTo(sx + sw + 7, ty + 5); x.closePath(); x.fill(); }
  }
  x.restore();
  if (adr) {
    ln(x, sx - 2, sc, sx + sw + 6, sc, 'y', 2);
    if (machNow() > 0.5) txt(x, '.' + String(Math.round(machNow() * 1000)).padStart(3, '0').slice(0, 3), sx + 20, 222, 'g', 11, 'center');
    if (!S.fcu.spdMan) txt(x, S.fcu.machMode ? '.' + Math.round(S.fcu.mach * 100) : String(S.fcu.spd), sx + 20, 52, 'c', 10, 'center');
  } else if (flash()) txt(x, 'SPD', sx + 20, sc, 'r', 12, 'center');
  box(x, sx, top, sw, bot - top, 'w');

  // ---- Bande d'altitude ----
  const ax0 = 212, aw = 40, ppf = 0.105, alt = a.alt / FT;
  x.save(); x.beginPath(); x.rect(ax0, top, aw, bot - top); x.clip();
  x.fillStyle = '#20262d'; x.fillRect(ax0, top, aw, bot - top);
  if (adr) {
    const yA = h => sc - (h - alt) * ppf;
    for (let h = Math.floor((alt - 800) / 100) * 100; h < alt + 800; h += 100) {
      const y = yA(h); ln(x, ax0, y, ax0 + (h % 500 === 0 ? 8 : 4), y, 'w', 1.2);
      if (h % 500 === 0) txt(x, String(Math.round(h / 100)).padStart(3, '0'), ax0 + 11, y, 'w', 10);
    }
    const gnd = groundElev(a.lat, a.lon) / FT;
    if (gnd > alt - 800) { x.fillStyle = COL.r; x.fillRect(ax0 + aw - 6, yA(gnd), 6, bot); }
    const ty = yA(S.fcu.alt);
    x.fillStyle = (G.vert === 'CLB' || G.vert === 'DES') ? COL.m : COL.c;
    if (ty > top && ty < bot) { x.fillRect(ax0, ty - 8, 5, 16); }
  }
  x.restore();
  box(x, ax0, top, aw, bot - top, 'w');
  if (adr) {
    const tc = (G.vert === 'CLB' || G.vert === 'DES') ? 'm' : 'c';
    if (Math.abs(S.fcu.alt - alt) > 750) txt(x, S.efis.baroStd ? 'FL' + String(Math.round(S.fcu.alt / 100)).padStart(3, '0') : String(S.fcu.alt), ax0 + 20, S.fcu.alt > alt ? 52 : 222, tc, 10, 'center');
    // fenêtre altitude
    x.fillStyle = '#000'; x.fillRect(ax0 + 2, sc - 11, aw + 8, 22); box(x, ax0 + 2, sc - 11, aw + 8, 22, 'y', 1.5);
    const big = Math.floor(alt / 100), small = Math.round(alt % 100 / 20) * 20 % 100;
    txt(x, String(big).padStart(3, '0'), ax0 + 31, sc, 'g', 13, 'right');
    txt(x, String(small).padStart(2, '0'), ax0 + 33, sc, 'g', 9.5);
    const std = S.efis.baroStd;
    const need = (!std && alt > S.fms.transAlt + 300 && !a.onGround) || (std && alt < S.fms.transAlt - 300 && S.phase === 'APPROACH');
    txt(x, std ? 'STD' : 'QNH ' + S.efis.qnh, ax0 + 20, 234, 'c', 10, 'center');
    if (need && flash()) box(x, ax0 - 4, 226, 48, 16, 'w');
  } else if (flash()) txt(x, 'ALT', ax0 + 20, sc, 'r', 12, 'center');
  // ---- V/S ----
  const vx = 262, vs = a.vs / FT * 60;
  x.fillStyle = '#20262d'; x.fillRect(vx, 75, 16, 140);
  const vsy = v => { const s = Math.sign(v), m = Math.abs(v); return sc - s * (m <= 1000 ? m / 1000 * 30 : m <= 2000 ? 30 + (m - 1000) / 1000 * 18 : 48 + Math.min(m - 2000, 4000) / 4000 * 20); };
  for (const k of [-6000, -2000, -1000, 0, 1000, 2000, 6000]) { ln(x, vx, vsy(k), vx + 4, vsy(k), 'w'); if (k && Math.abs(k) <= 2000) txt(x, String(Math.abs(k / 1000)), vx + 8, vsy(k), 'w', 8); }
  if (adr && att) {
    const c = Math.abs(vs) > 6000 || (ra < 1000 && vs < -2000) ? 'a' : 'g';
    ln(x, vx + 24, sc, vx + 2, vsy(vs), c, 2);
    if (Math.abs(vs) > 200) txt(x, String(Math.round(Math.abs(vs) / 100)).padStart(2, '0'), vx + 8, vs > 0 ? 68 : 222, c, 9, 'center');
  }
  // ---- Cap ----
  const hy = 252, hd = a.psi * R2D, ppdH = 3.2;
  x.save(); x.beginPath(); x.rect(70, hy - 12, 116, 26); x.clip();
  x.fillStyle = '#20262d'; x.fillRect(70, hy - 12, 116, 26);
  if (att) {
    for (let d = Math.floor((hd - 20) / 5) * 5; d < hd + 20; d += 5) {
      const px = cx + wrap180(d - hd) * ppdH; ln(x, px, hy - 12, px, hy - (d % 10 === 0 ? 4 : 8), 'w');
      if (d % 10 === 0) txt(x, String(Math.round(wrap360(d) / 10)).padStart(2, '0'), px, hy + 4, 'w', 9.5, 'center');
    }
    if (G.lat === 'HDG' || !S.fcu.hdgMan) { const sx2 = cx + clamp(wrap180(S.fcu.hdg - hd), -18, 18) * ppdH; x.fillStyle = COL.c; x.beginPath(); x.moveTo(sx2, hy - 12); x.lineTo(sx2 - 4, hy - 18); x.lineTo(sx2 + 4, hy - 18); x.fill(); }
    if (S.efis.ls && S.ls) { const rx = cx + clamp(wrap180(S.ls.r.hdg - hd), -18, 18) * ppdH; ln(x, rx, hy - 12, rx, hy + 12, 'm', 2); }
  } else if (flash()) txt(x, 'HDG', cx, hy, 'r', 11, 'center');
  x.restore();
  ln(x, cx, hy - 14, cx, hy + 2, 'y', 2);
  // annonces
  if (S.callout.t > 0) txt(x, S.callout.txt, cx, 82, 'a', 9, 'center');
  if (G.togaLk || (S.fcu.athr && a.alpha > aero().aS - 2 * D2R && !a.onGround)) txt(x, 'A.FLOOR', 40, 270, 'g', 9, 'center');
  if (S.ecam.alerts.some(z => z.id === 'stall') && flash(2)) txt(x, 'STALL', cx, 100, 'r', 14, 'center');
  if (S.gpws && S.gpws.lvl) { const pu = S.gpws.lvl === 'PULL UP'; if (!pu || flash(2)) { x.fillStyle = '#000'; x.fillRect(cx - 44, 166, 88, 20); txt(x, S.gpws.lvl, cx, 176, pu ? 'r' : 'a', 12, 'center'); } }
  if (S.ecam.alerts.some(z => z.id === 'ovsp')) txt(x, 'OVERSPEED', cx, 100, 'r', 11, 'center');
}

/* ------------------------------ ND ------------------------------ */
function drawND(cv) {
  const W = 290, H = 290, x = setupCanvas(cv, W, H);
  if (!S.sys.elec.ac) return blackScreen(x, W, H);
  x.fillStyle = COL.bg; x.fillRect(0, 0, W, H);
  const a = S.ac, E = S.efis, f = S.fms, hd = a.psi * R2D;
  const mode = E.mode;
  if (!irAligned()) { txt(x, 'MAP NOT AVAIL', W / 2, H / 2, 'r', 11, 'center'); txt(x, 'HDG', W / 2, 20, 'r', 11, 'center'); return; }
  const ctr = mode === 'ARC' ? { x: 145, y: 250 } : { x: 145, y: 150 };
  const R = mode === 'ARC' ? 210 : 110;
  const ppm = R / (E.range * NM);
  const up = mode === 'PLAN' ? 0 : hd;
  const ref = mode === 'PLAN' && f.wpts.length ? f.wpts[clamp(f.active, 0, f.wpts.length - 1)] : { lat: a.lat, lon: a.lon };
  const proj = (lat, lon) => { const p = enu(ref.lat, ref.lon, lat, lon); const r = up * D2R; const e = p.e * Math.cos(r) - p.n * Math.sin(r), n = p.e * Math.sin(r) + p.n * Math.cos(r); return { x: ctr.x + e * ppm, y: ctr.y - n * ppm }; };
  // compas
  x.save();
  if (mode === 'ARC') { x.beginPath(); x.arc(ctr.x, ctr.y, R + 2, Math.PI, 2 * Math.PI); x.lineTo(W, H); x.lineTo(0, H); x.clip(); }
  else { x.beginPath(); x.arc(ctr.x, ctr.y, R + 2, 0, 7); x.clip(); }
  // relief (TERR) : rouge > 2 000 ft au-dessus de l'avion, jaune de -500 à +2 000 ft, vert en dessous
  if (E.terr && T3.hReady) {
    const altFt = a.alt / FT, cl = Math.cos(ref.lat * D2R), rr = up * D2R, st = 7;
    for (let py = 0; py < H; py += st) for (let px = 0; px < W; px += st) {
      const e = (px + st / 2 - ctr.x) / ppm, nn = (ctr.y - py - st / 2) / ppm;
      const pe = e * Math.cos(rr) + nn * Math.sin(rr), pn = -e * Math.sin(rr) + nn * Math.cos(rr);
      const h = surfaceElev(ref.lat + pn / RE * R2D, ref.lon + pe / (RE * cl) * R2D) / FT;
      if (h < 50) continue;
      const d = h - altFt;
      x.fillStyle = d > 2000 ? 'rgba(255,40,30,.55)' : d > -500 ? 'rgba(255,215,0,.5)' : d > -2000 ? 'rgba(40,200,60,.45)' : 'rgba(40,160,60,.22)';
      x.fillRect(px + 1, py + 1, st - 2, st - 2);
    }
  }
  // route
  if (f.wpts.length) {
    x.lineWidth = 1.6;
    for (let i = 1; i < f.wpts.length; i++) {
      const p0 = proj(f.wpts[i - 1].lat, f.wpts[i - 1].lon), p1 = proj(f.wpts[i].lat, f.wpts[i].lon);
      if (i < f.active) continue;
      x.strokeStyle = COL.g; x.setLineDash(i === f.active ? [] : []); x.beginPath(); x.moveTo(p0.x, p0.y); x.lineTo(p1.x, p1.y); x.stroke();
    }
    if (f.active >= 1 && S.tookOff) { const p1 = proj(f.wpts[f.active].lat, f.wpts[f.active].lon), p0 = proj(a.lat, a.lon); x.strokeStyle = COL.g; x.beginPath(); x.moveTo(p0.x, p0.y); x.lineTo(p1.x, p1.y); x.stroke(); }
    f.wpts.forEach((w, i) => {
      const p = proj(w.lat, w.lon); if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) return;
      const c = i === f.active ? 'w' : 'g';
      if (w.rwy) { x.save(); x.translate(p.x, p.y); x.rotate(((w.dest ? rwyGeom(f.to, f.arrRwy).hdg : rwyGeom(f.from, f.depRwy).hdg) - up) * D2R); x.strokeStyle = COL.w; x.strokeRect(-2, -Math.max(6, 3200 * ppm), 4, Math.max(6, 3200 * ppm)); x.restore(); }
      else { x.strokeStyle = COL[c]; x.beginPath(); x.moveTo(p.x, p.y - 4); x.lineTo(p.x + 4, p.y); x.lineTo(p.x, p.y + 4); x.lineTo(p.x - 4, p.y); x.closePath(); x.stroke(); }
      txt(x, w.id, p.x + 7, p.y - 6, c, 9);
      if (w.alt && i >= f.active && !w.rwy) txt(x, String(w.alt), p.x + 7, p.y + 5, 'm', 7.5);
    });
    // T/D
    const tdRem = todRemaining();
    if (tdRem && S.nav && S.nav.rem > tdRem) { const pt = pointAtRemaining(tdRem); if (pt) { const p = proj(pt.lat, pt.lon); txt(x, 'T/D', p.x + 6, p.y, 'w', 8.5); x.strokeStyle = COL.w; x.beginPath(); x.arc(p.x, p.y, 3, 0, 7); x.stroke(); } }
  }
  // plan d'aéroport (ND en petite échelle, au sol)
  if (E.range <= 5 && typeof aptFrame === 'function') {
    const na = nearestApt(a.lat, a.lon);
    if (na.d < 15000) {
      const F = aptFrame(na.ap.icao), Pp = (al, sd) => { const q = F.ll(al, sd); return proj(q.lat, q.lon); };
      const poly = (pts, fill) => { x.fillStyle = fill; x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)); x.closePath(); x.fill(); };
      poly([Pp(-60, -30), Pp(F.len + 60, -30), Pp(F.len + 60, 30), Pp(-60, 30)], '#4b5258');
      const tl = (a1, s1, a2, s2) => { const p1 = Pp(a1, s1), p2 = Pp(a2, s2); ln(x, p1.x, p1.y, p2.x, p2.y, '#d9b51c', 2); };
      tl(-80, -245, F.len + 80, -245); F.conn.forEach(cA => tl(cA, -245, cA, -30)); tl(F.len / 2, -245, F.len / 2, -400);
      const g = Pp(F.len / 2, -420); x.strokeStyle = COL.w; x.beginPath(); x.arc(g.x, g.y, 5, 0, 7); x.stroke(); txt(x, 'GATE', g.x + 8, g.y, 'w', 8);
      Object.keys(na.ap.rwys).forEach(id => { const rr = rwyGeom(na.ap.icao, id), p = proj(rr.thr.lat, rr.thr.lon); txt(x, id, p.x, p.y, 'w', 9, 'center'); });
      const T = S.taxi;
      if (T && !T.done && a.onGround) {
        x.strokeStyle = COL.m; x.lineWidth = 2.5; x.setLineDash([6, 4]); x.beginPath();
        const p0 = proj(a.lat, a.lon); x.moveTo(p0.x, p0.y);
        for (let k = T.i; k < T.pts.length; k++) { const p = proj(T.pts[k].lat, T.pts[k].lon); x.lineTo(p.x, p.y); }
        x.stroke(); x.setLineDash([]);
      }
    }
  }
  // aéroports
  for (const k in AIRPORTS) { const ap = AIRPORTS[k], p = proj(ap.lat, ap.lon); if (p.x > -20 && p.x < W + 20 && p.y > -20 && p.y < H + 20) { x.strokeStyle = COL.m; x.beginPath(); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; x.moveTo(p.x, p.y); x.lineTo(p.x + Math.cos(an) * 5, p.y + Math.sin(an) * 5); } x.stroke(); txt(x, k, p.x + 7, p.y + 8, 'm', 8.5); } }
  // HDG sélecté
  if (!S.fcu.hdgMan && mode !== 'PLAN') { const an = (wrap180(S.fcu.hdg - hd) - 90) * D2R; x.fillStyle = COL.c; x.beginPath(); x.moveTo(ctr.x + Math.cos(an) * R, ctr.y + Math.sin(an) * R); x.lineTo(ctr.x + Math.cos(an - 0.03) * (R + 9), ctr.y + Math.sin(an - 0.03) * (R + 9)); x.lineTo(ctr.x + Math.cos(an + 0.03) * (R + 9), ctr.y + Math.sin(an + 0.03) * (R + 9)); x.fill(); }
  x.restore();
  // rose des caps
  x.strokeStyle = COL.w; x.lineWidth = 1.3; x.beginPath();
  if (mode === 'ARC') x.arc(ctr.x, ctr.y, R, Math.PI * 1.17, Math.PI * 1.83); else x.arc(ctr.x, ctr.y, R, 0, 7);
  x.stroke();
  if (mode !== 'PLAN') {
    for (let d = 0; d < 360; d += 5) {
      const rel = wrap180(d - hd); if (mode === 'ARC' && Math.abs(rel) > 55) continue;
      const an = (rel - 90) * D2R, l = d % 10 === 0 ? 8 : 4;
      ln(x, ctr.x + Math.cos(an) * R, ctr.y + Math.sin(an) * R, ctr.x + Math.cos(an) * (R - l), ctr.y + Math.sin(an) * (R - l), 'w', 1.2);
      if (d % 30 === 0) txt(x, String(d / 10), ctr.x + Math.cos(an) * (R - 16), ctr.y + Math.sin(an) * (R - 16), 'w', 10, 'center');
    }
    ln(x, ctr.x, ctr.y - R - 10, ctr.x, ctr.y - R + 2, 'y', 2.5);
    // cercles de distance
    x.setLineDash([2, 4]); x.strokeStyle = COL.w; x.lineWidth = 0.8;
    x.beginPath(); if (mode === 'ARC') x.arc(ctr.x, ctr.y, R / 2, Math.PI * 1.2, Math.PI * 1.8); else x.arc(ctr.x, ctr.y, R / 2, 0, 7); x.stroke(); x.setLineDash([]);
    txt(x, String(E.range < 1 ? E.range / 2 : E.range / 2), ctr.x - R / 2 * 0.8 - 6, ctr.y - R / 2 * 0.6, 'c', 8);
  } else { txt(x, 'N', ctr.x, ctr.y - R - 8, 'w', 10, 'center'); }
  // avion
  if (mode !== 'PLAN') {
    x.strokeStyle = COL.y; x.lineWidth = 2.5; x.beginPath();
    x.moveTo(ctr.x, ctr.y - 12); x.lineTo(ctr.x, ctr.y + 12); x.moveTo(ctr.x - 11, ctr.y - 3); x.lineTo(ctr.x + 11, ctr.y - 3); x.moveTo(ctr.x - 5, ctr.y + 10); x.lineTo(ctr.x + 5, ctr.y + 10); x.stroke();
  } else { const p = proj(a.lat, a.lon); x.save(); x.translate(p.x, p.y); x.rotate(hd * D2R); x.strokeStyle = COL.y; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -9); x.lineTo(0, 9); x.moveTo(-8, -2); x.lineTo(8, -2); x.stroke(); x.restore(); }
  // en-têtes
  const gs = a.V * Math.cos(a.gam) / KT;
  txt(x, 'GS', 6, 10, 'w', 9); txt(x, String(Math.round(gs)), 22, 10, 'g', 11);
  txt(x, 'TAS', 52, 10, 'w', 9); txt(x, String(Math.round(a.V / KT)), 74, 10, 'g', 11);
  txt(x, '---/---', 6, 23, 'g', 9);
  if (S.nav && f.wpts.length) {
    const n = S.nav;
    txt(x, n.w.id, W - 6, 10, 'w', 11, 'right');
    txt(x, pad3(n.brg) + '°', W - 6, 23, 'g', 10, 'right');
    txt(x, (n.dist / NM).toFixed(n.dist < 20 * NM ? 1 : 0) + ' NM', W - 6, 35, 'g', 10, 'right');
    if (gs > 30) txt(x, utcStr(simUtc() + n.dist / (gs * KT) * 1000), W - 6, 47, 'g', 10, 'right');
  }
  txt(x, mode + ' · ' + E.range + ' NM' + (E.terr ? ' · TERR' : ''), 6, H - 10, 'c', 8.5);
  if (S.efis.ls && S.ls && S.ls.inRange) txt(x, 'LS ' + AIRPORTS[f.to].icao + f.arrRwy, W - 6, H - 10, 'm', 8.5, 'right');
  if (S.fg.moreDrag && S.fg.vert === 'DES') txt(x, 'MORE DRAG', W / 2, H - 24, 'w', 9, 'center');
}
function todRemaining() {
  if (!S.fms.wpts.length) return null;
  pathAlt(); const t = S.fms.pathTbl, crz = S.fms.crzFL * 100;
  for (let i = 0; i < t.length; i++) if (t[i] >= crz) return i * NM;
  return null;
}
function pointAtRemaining(rem) {
  const W = S.fms.wpts; let acc = 0;
  for (let i = W.length - 1; i > 0; i--) { if (acc + W[i].leg >= rem) { const fr = (rem - acc) / W[i].leg; return gcInterp(W[i].lat, W[i].lon, W[i - 1].lat, W[i - 1].lon, fr); } acc += W[i].leg; }
  return null;
}

/* ------------------------------ EWD ------------------------------ */
function gauge(x, cx, cy, r, val, max, red, label, digits, col) {
  const a0 = 200 * D2R, a1 = -20 * D2R;
  const ang = v => a0 + (a1 - a0) * clamp(v / max, 0, 1.05);
  x.strokeStyle = COL.w; x.lineWidth = 1.6; x.beginPath(); x.arc(cx, cy, r, -a0, -ang(red)); x.stroke();
  x.strokeStyle = COL.r; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, r, -ang(red), -a1); x.stroke();
  for (let k = 0; k <= 10; k += 2) { const an = ang(k / 10 * max); ln(x, cx + Math.cos(an) * r, cy - Math.sin(an) * r, cx + Math.cos(an) * (r - 5), cy - Math.sin(an) * (r - 5), 'w', 1.2); }
  const an = ang(val);
  if (val > 0.5 || col !== 'g') ln(x, cx, cy, cx + Math.cos(an) * (r + 2), cy - Math.sin(an) * (r + 2), col || 'g', 2.4);
  x.fillStyle = '#000'; x.fillRect(cx - 4, cy + 4, r + 8, 17); box(x, cx - 4, cy + 4, r + 8, 17, 'gr');
  txt(x, digits, cx + r + 2, cy + 13, col || 'g', 12, 'right');
}
function drawEWD(cv) {
  const W = 290, H = 290, x = setupCanvas(cv, W, H);
  if (!S.sys.elec.ac) return blackScreen(x, W, H);
  x.fillStyle = COL.bg; x.fillRect(0, 0, W, H);
  const E = S.eng, mx = Math.max(...S.ctl.tla);
  // limite de poussée
  const toPh = (S.ac.onGround && !S.tookOff) || S.phase === 'TAKEOFF';
  const lim = mx >= TLA_TOGA - 0.5 ? 'TOGA' : toPh && S.fms.flex > 30 && (mx >= TLA_FLX - 0.5 || S.ac.onGround) ? 'FLX' : mx >= TLA_FLX - 0.5 ? 'MCT' : 'CLB';
  const limN1 = lim === 'TOGA' ? 98.0 : lim === 'FLX' ? (21 + 77 * leverDemand(TLA_FLX)) : lim === 'MCT' ? 92.5 : 87.2;
  txt(x, lim, W / 2, 10, 'c', 10, 'center'); txt(x, limN1.toFixed(1) + '%', W / 2, 22, 'c', 10, 'center');
  if (lim === 'FLX' && S.fms.flex > 30) txt(x, S.fms.flex + '°C', W / 2, 34, 'c', 9, 'center');
  [0, 1].forEach(i => {
    const e = E[i], cx = i ? 215 : 75;
    const col = e.st === 'off' && e.n1 < 1 ? 'a' : e.fire ? 'r' : 'g';
    gauge(x, cx, 60, 36, e.n1, 110, 100, 'N1', e.st === 'off' && e.n1 < 1 ? 'XX' : e.n1.toFixed(1), col === 'a' ? 'a' : 'g');
    // repère commande (manette)
    const dLev = clamp(21 + 77 * leverDemand(S.ctl.tla[i]), 0, 105);
    const an = (200 + (-220) * clamp(dLev / 110, 0, 1)) * D2R;
    x.fillStyle = COL.c; x.beginPath(); x.arc(cx + Math.cos(an) * 41, 60 - Math.sin(an) * 41, 2.4, 0, 7); x.fill();
    gauge(x, cx, 130, 26, e.egt, 1100, 900, 'EGT', String(Math.round(e.egt)), e.egt > 900 ? 'r' : 'g');
    if (e.st === 'start') txt(x, e.ign ? 'IGN A' : 'START', cx, 160, 'w', 8.5, 'center');
    if (e.revP > 0.1) txt(x, 'REV', cx, 34, e.revP > 0.9 ? 'g' : 'a', 9, 'center');
  });
  txt(x, 'N1', W / 2, 62, 'w', 9, 'center'); txt(x, '%', W / 2, 74, 'c', 8, 'center');
  txt(x, 'EGT', W / 2, 130, 'w', 9, 'center'); txt(x, '°C', W / 2, 142, 'c', 8, 'center');
  // FOB + volets
  txt(x, 'FOB :', 10, 176, 'w', 9.5); txt(x, String(Math.round(fob() / 10) * 10), 52, 176, 'g', 11); txt(x, 'KG', 98, 176, 'c', 8.5);
  const fl = S.sys.flaps, cfgName = ['0', S.ac.onGround || S.phase === 'TAKEOFF' ? '1+F' : '1', '2', '3', 'FULL'][Math.round(S.ctl.flapsLever)];
  txt(x, 'S', 150, 172, 'w', 9); txt(x, 'F', 270, 172, 'w', 9);
  x.strokeStyle = COL.w; x.beginPath(); x.moveTo(190, 168); x.lineTo(222, 168); x.lineTo(228, 172); x.lineTo(186, 172); x.closePath(); x.stroke();
  for (let k = 0; k <= 3; k++) { x.fillStyle = COL.gr; x.fillRect(184 - k * 9, 172 + k * 3, 2, 2); x.fillRect(230 + k * 10, 172 + k * 3, 2, 2); }
  const sl = Math.min(3, fl), fp = Math.max(0, fl - (fl > 1 ? 0 : fl)) ;
  x.fillStyle = COL.g; x.fillRect(184 - sl * 9 - 3, 170 + sl * 3, 6, 4); x.fillRect(228 + Math.min(4, Math.max(0, fl - 0.5) * 0.9) * 9, 170 + Math.min(4, fl) * 3, 6, 4);
  if (fl > 0.05 || S.ctl.flapsLever > 0) txt(x, cfgName, 207, 186, Math.abs(fl - S.ctl.flapsLever) > 0.05 ? 'c' : 'g', 10, 'center');
  ln(x, 6, 196, W - 6, 196, 'gr');
  // alertes / mémos
  let y = 206;
  const al = S.ecam.alerts;
  if (al.length) {
    al.slice(0, 4).forEach(z => {
      txt(x, z.title, 8, y, z.lvl === 3 ? 'r' : 'a', 9); y += 11;
      if (z === al[0]) z.lines.slice(0, 4).forEach(l => { txt(x, (l.d ? '- ' : '- ') + l.t, 14, y, l.d ? 'w' : 'c', 8.5); y += 10; });
    });
  }
  const memo = S.ecam.memo || [];
  const colX = al.length ? 190 : 8, maxY = 286;
  let yy = al.length ? 206 : y;
  memo.forEach(mm => { if (yy > maxY) return; txt(x, mm.t, colX, yy, mm.c === 'b' ? 'c' : mm.c, 8.5); yy += 10; });
}

/* ------------------------------ SD ------------------------------ */
function drawSD(cv) {
  const W = 290, H = 290, x = setupCanvas(cv, W, H);
  if (!S.sys.elec.ac) return blackScreen(x, W, H);
  x.fillStyle = COL.bg; x.fillRect(0, 0, W, H);
  const pg = S.ecam.page;
  txt(x, pg === 'ELEC' ? 'ELEC AC/DC' : pg, 8, 12, 'w', 11); ln(x, 8, 20, 8 + (pg.length + (pg === 'ELEC' ? 6 : 0)) * 7, 20, 'w');
  (SD_PAGES[pg] || SD_PAGES.ENG)(x, W, H);
  // bande permanente
  ln(x, 0, 258, W, 258, 'gr');
  const atm = isa(S.ac.alt), sat = atm.T - 273.15, tat = sat + 0.2 * machNow() ** 2 * atm.T;
  txt(x, 'TAT', 6, 268, 'w', 8.5); txt(x, (tat >= 0 ? '+' : '') + Math.round(tat), 60, 268, 'g', 9.5, 'right'); txt(x, '°C', 62, 268, 'c', 8);
  txt(x, 'SAT', 6, 281, 'w', 8.5); txt(x, (sat >= 0 ? '+' : '') + Math.round(sat), 60, 281, 'g', 9.5, 'right'); txt(x, '°C', 62, 281, 'c', 8);
  txt(x, utcStr(simUtc()), W / 2, 274, 'g', 12, 'center'); txt(x, 'UTC', W / 2 + 32, 274, 'c', 8);
  txt(x, 'GW', 200, 268, 'w', 8.5); txt(x, String(Math.round(S.ac.mass / 100) * 100), 275, 268, 'g', 9.5, 'right'); txt(x, 'KG', 278, 268, 'c', 7);
  txt(x, 'GWCG', 200, 281, 'w', 8.5); txt(x, (S.fms.zfwcg + 0.3).toFixed(1), 262, 281, 'g', 9.5, 'right'); txt(x, '%', 264, 281, 'c', 8);
}
const valve = (x, cx, cy, open, col) => { x.strokeStyle = COL[col || (open ? 'g' : 'a')]; x.lineWidth = 1.6; x.beginPath(); x.arc(cx, cy, 8, 0, 7); x.stroke(); if (open) ln(x, cx, cy - 8, cx, cy + 8, col || 'g', 1.6); else ln(x, cx - 8, cy, cx + 8, cy, col || 'a', 1.6); };
const srcBox = (x, px, py, w, h, label, ok, sub) => { box(x, px, py, w, h, ok ? 'w' : 'a', 1.2); txt(x, label, px + w / 2, py + 9, ok ? 'w' : 'a', 8.5, 'center'); if (sub) sub.forEach((s, i) => txt(x, s, px + w / 2, py + 21 + i * 11, ok ? 'g' : 'a', 8.5, 'center')); };
const SD_PAGES = {
  ENG(x) {
    const E = S.eng;
    ['N2 %', 'N3 %', 'F.USED', 'FF KG/H', 'OIL QT', 'OIL PSI', 'VIB N1', 'START'].forEach((l, k) => txt(x, l, 145, 42 + k * 25, 'w', 8.5, 'center'));
    E.forEach((e, i) => {
      const cx = i ? 225 : 65, run = e.st !== 'off' || e.n3 > 1;
      const used = S.fuelUsed ? S.fuelUsed[i] : 0;
      const vals = [e.n2.toFixed(1), e.n3.toFixed(1), String(Math.round(used / 10) * 10), String(Math.round(e.ff / 10) * 10), (19.5 - (run ? 0.6 : 0)).toFixed(1), String(Math.round(run ? 30 + e.n3 * 0.6 : 0)), (run ? 0.3 + e.d * 0.6 : 0).toFixed(1),
        e.st === 'start' ? (e.n3 < 25 ? 'VALVE OPEN' : 'IGN') : e.st === 'run' ? 'AVAIL' : '—'];
      vals.forEach((v, k) => txt(x, v, cx, 42 + k * 25, k === 7 && e.st === 'start' ? 'a' : 'g', 10, 'center'));
    });
    txt(x, 'ENG BLEED PRESS  ' + Math.round(S.sys.duct[0]) + ' / ' + Math.round(S.sys.duct[1]) + ' PSI', 145, 240, 'c', 8.5, 'center');
  },
  APU(x) {
    const ap = S.sys.apu;
    srcBox(x, 30, 40, 80, 50, 'APU GEN', ap.avail && S.ovh.apuGen, ap.avail ? ['115 V', '400 HZ'] : ['', '']);
    txt(x, 'N', 60, 120, 'w', 10); txt(x, ap.n.toFixed(0) + ' %', 120, 120, ap.n > 95 ? 'g' : 'a', 12, 'right');
    txt(x, 'EGT', 60, 145, 'w', 10); txt(x, Math.round(ap.egt) + ' °C', 120, 145, 'g', 12, 'right');
    txt(x, 'FLAP', 60, 170, 'w', 10); txt(x, ap.flap >= 1 ? 'OPEN' : ap.flap > 0 ? 'MOVING' : 'CLOSED', 120, 170, ap.flap >= 1 ? 'g' : 'w', 10, 'right');
    txt(x, 'APU BLEED', 200, 50, 'w', 9.5, 'center'); valve(x, 200, 75, !!ap.bleed); txt(x, Math.round(ap.bleed || 0) + ' PSI', 200, 100, 'g', 10, 'center');
    txt(x, ap.avail ? 'AVAIL' : ap.starting ? 'STARTING' : ap.cool > 0 ? 'COOLING ' + Math.ceil(ap.cool) + 's' : '', 200, 140, 'g', 12, 'center');
  },
  BLEED(x) {
    const sy = S.sys, o = S.ovh;
    [0, 1].forEach(i => {
      const cx = i ? 220 : 70, e = S.eng[i];
      txt(x, 'ENG ' + (i + 1), cx, 225, 'w', 9.5, 'center');
      valve(x, cx, 195, e.st === 'run' && o['engBleed' + (i + 1)]);
      ln(x, cx, 187, cx, 120, sy.duct[i] > 20 ? 'g' : 'gr', 1.5);
      txt(x, Math.round(sy.duct[i]) + ' PSI', cx + (i ? 22 : -22), 150, 'g', 9, 'center');
      box(x, cx - 22, 60, 44, 30, sy.packs[i] ? 'w' : 'a'); txt(x, 'PACK ' + (i + 1), cx, 70, sy.packs[i] ? 'w' : 'a', 8.5, 'center');
      txt(x, sy.packs[i] ? (i ? '12' : '11') + '°C' : '—', cx, 82, 'g', 9, 'center');
      ln(x, cx, 90, cx, 120, sy.packs[i] ? 'g' : 'gr', 1.5);
    });
    ln(x, 70, 120, 220, 120, 'g', 1.5); valve(x, 145, 120, sy.xbleedOpen); txt(x, 'X BLEED', 145, 105, 'w', 8, 'center');
    txt(x, 'APU', 120, 225, 'w', 9.5, 'center'); valve(x, 120, 195, !!sy.apu.bleed); ln(x, 120, 187, 120, 160, sy.apu.bleed ? 'g' : 'gr'); ln(x, 70, 160, 120, 160, sy.apu.bleed ? 'g' : 'gr');
    txt(x, 'CKPT ' + o.ckptT + '°C   CAB ' + o.cabT + '°C', 145, 40, 'c', 9, 'center');
  },
  PRESS(x) {
    const sy = S.sys;
    const row = (l, v, u, y, c) => { txt(x, l, 30, y, 'w', 10); txt(x, v, 200, y, c || 'g', 13, 'right'); txt(x, u, 206, y, 'c', 9); };
    row('CAB ALT', String(Math.round(sy.cabAlt / 50) * 50), 'FT', 60, sy.cabAlt > 9550 ? 'r' : 'g');
    row('CAB V/S', String(Math.round(sy.cabVs / 50) * 50), 'FT/MIN', 95);
    row('ΔP', sy.deltaP.toFixed(1), 'PSI', 130, sy.deltaP > 9 ? 'a' : 'g');
    row('LDG ELEV', (S.ovh.ldgElev <= -2 ? 'AUTO ' : '') + AIRPORTS[S.fms.to].elev, 'FT', 165);
    txt(x, 'MODE ' + (S.ovh.pressMode ? 'MAN' : 'AUTO') + (S.ovh.ditching ? '  DITCHING' : ''), 30, 200, 'g', 9.5);
    txt(x, 'OUTFLOW', 30, 230, 'w', 9); box(x, 100, 222, 120, 14, 'w'); x.fillStyle = COL.g; x.fillRect(102, 224, clamp(116 * (S.ac.onGround ? 1 : 0.15 + sy.cabVs / 4000), 4, 116), 10);
  },
  ELEC(x) {
    const el = S.sys.elec, o = S.ovh;
    const g = el.gen;
    srcBox(x, 4, 175, 54, 46, 'GEN 1A', g[0].a, g[0].a ? ['230V', '400HZ'] : [o.gen1a ? '' : 'OFF']);
    srcBox(x, 60, 175, 54, 46, 'GEN 1B', g[0].b, g[0].b ? ['230V', '400HZ'] : [o.gen1b ? '' : 'OFF']);
    srcBox(x, 118, 175, 54, 46, 'APU GEN', el.apuGen, el.apuGen ? ['230V', '400HZ'] : ['']);
    srcBox(x, 176, 175, 54, 46, 'GEN 2A', g[1].a, g[1].a ? ['230V', '400HZ'] : [o.gen2a ? '' : 'OFF']);
    srcBox(x, 232, 175, 54, 46, 'GEN 2B', g[1].b, g[1].b ? ['230V', '400HZ'] : [o.gen2b ? '' : 'OFF']);
    srcBox(x, 98, 228, 46, 26, 'EXT A', el.extOn && o.extA, []); srcBox(x, 146, 228, 46, 26, 'EXT B', el.extOn && o.extB, []);
    if (el.extAvail && !el.extOn) txt(x, 'AVAIL', 145, 220, 'g', 8, 'center');
    box(x, 20, 120, 100, 22, el.ac1 ? 'g' : 'a'); txt(x, 'AC 1', 70, 131, el.ac1 ? 'g' : 'a', 10, 'center');
    box(x, 170, 120, 100, 22, el.ac2 ? 'g' : 'a'); txt(x, 'AC 2', 220, 131, el.ac2 ? 'g' : 'a', 10, 'center');
    box(x, 110, 90, 70, 20, el.ac ? 'g' : 'a'); txt(x, 'AC ESS', 145, 100, el.ac ? 'g' : 'a', 9.5, 'center');
    ln(x, 70, 142, 70, 175, el.ac1 ? 'g' : 'gr'); ln(x, 220, 142, 220, 175, el.ac2 ? 'g' : 'gr');
    ln(x, 120, 131, 170, 131, o.busTie ? 'g' : 'gr'); txt(x, 'BUS TIE', 145, 145, o.busTie ? 'w' : 'a', 7.5, 'center');
    box(x, 20, 40, 100, 22, el.dc ? 'g' : 'a'); txt(x, 'DC ESS', 70, 51, el.dc ? 'g' : 'a', 10, 'center');
    box(x, 170, 40, 100, 22, el.dc ? 'g' : 'a'); txt(x, 'DC 2', 220, 51, el.dc ? 'g' : 'a', 10, 'center');
    txt(x, 'BAT 1  ' + (o.bat1 ? el.batV.toFixed(1) + 'V' : 'OFF'), 20, 78, o.bat1 ? 'g' : 'a', 8.5);
    txt(x, 'BAT 2  ' + (o.bat2 ? el.batV.toFixed(1) + 'V' : 'OFF'), 170, 78, o.bat2 ? 'g' : 'a', 8.5);
  },
  HYD(x) {
    const h = S.sys.hyd, o = S.ovh;
    [['GREEN', 'G', 70, 0], ['YELLOW', 'Y', 220, 1]].forEach(([n, k, cx, i]) => {
      const p = h[k], ok = p > 2500;
      txt(x, n, cx, 40, ok ? 'w' : 'a', 11, 'center');
      txt(x, String(Math.round(p / 100) * 100), cx, 60, ok ? 'g' : 'a', 13, 'center'); txt(x, 'PSI', cx + 30, 60, 'c', 8);
      ln(x, cx, 70, cx, 200, ok ? 'g' : 'a', 2);
      const e = S.eng[i], run = e.st === 'run';
      [['ENG ' + (i + 1) + ' A', o['eng' + (i + 1) + 'PA']], ['ENG ' + (i + 1) + ' B', o['eng' + (i + 1) + 'PB']]].forEach(([l, on], j) => {
        const px = cx - 45 + j * 50; box(x, px, 150, 40, 18, run && on ? 'g' : 'a'); txt(x, l, px + 20, 159, run && on ? 'g' : 'a', 7.5, 'center');
      });
      const ep = o[k === 'G' ? 'elecPG' : 'elecPY'];
      box(x, cx - 25, 100, 50, 18, ep === 2 ? 'g' : 'w'); txt(x, 'ELEC ' + ['OFF', 'AUTO', 'ON'][ep], cx, 109, ep === 2 ? 'g' : 'w', 7.5, 'center');
      box(x, cx - 15, 205, 30, 40, 'w'); x.fillStyle = COL.g; x.fillRect(cx - 13, 215, 26, 28); txt(x, 'RSVR', cx, 252, 'w', 7.5, 'center');
    });
  },
  FUEL(x) {
    const f = S.ac.fuel, o = S.ovh;
    const tank = (px, w, l, q, max) => { box(x, px, 80, w, 70, 'w'); txt(x, l, px + w / 2, 92, 'w', 9, 'center'); txt(x, String(Math.round(q / 10) * 10), px + w / 2, 118, q < 1500 ? 'a' : 'g', 13, 'center'); x.fillStyle = 'rgba(60,240,60,.15)'; x.fillRect(px + 1, 149 - 68 * q / max, w - 2, 68 * q / max); };
    tank(10, 85, 'L WING', f.L, AC.tankMax.L); tank(102, 86, 'CTR', f.C, AC.tankMax.C); tank(195, 85, 'R WING', f.R, AC.tankMax.R);
    [['lp1', 22], ['lp2', 62], ['ctrL', 118], ['ctrR', 158], ['rp1', 207], ['rp2', 247]].forEach(([k, px]) => { box(x, px, 156, 22, 14, o[k] ? 'g' : 'a'); txt(x, o[k] ? '|' : '—', px + 11, 163, o[k] ? 'g' : 'a', 9, 'center'); });
    ln(x, 52, 60, 237, 60, o.xfeed ? 'g' : 'gr'); valve(x, 145, 60, !!o.xfeed); txt(x, 'X FEED', 145, 44, 'w', 8, 'center');
    ln(x, 52, 80, 52, 30, 'g'); ln(x, 237, 80, 237, 30, 'g'); txt(x, 'ENG 1', 52, 24, 'w', 9, 'center'); txt(x, 'ENG 2', 237, 24, 'w', 9, 'center');
    txt(x, 'FOB', 40, 200, 'w', 10); txt(x, String(Math.round(fob() / 10) * 10), 170, 200, 'g', 14, 'right'); txt(x, 'KG', 176, 200, 'c', 9);
    const fu = S.fuelUsed || [0, 0];
    txt(x, 'F.USED  ' + Math.round(fu[0] / 10) * 10 + ' / ' + Math.round(fu[1] / 10) * 10 + ' KG', 40, 225, 'g', 9);
    txt(x, 'FU TOTAL ' + Math.round((fu[0] + fu[1]) / 10) * 10, 40, 240, 'g', 9);
  },
  'F/CTL'(x) {
    const c = S.ctl, a = S.ac, h = S.sys.hyd, ok = h.G > 2500 || h.Y > 2500;
    const sp = Math.max(c.spd, S.sys.gndSpl);
    for (let s = 0; s < 7; s++) {
      const up = sp * 22 + (Math.abs(a.phi) > 0.05 && !a.onGround && (s > 2) ? 0 : 0);
      [[100 - s * 13, -1], [190 + s * 13, 1]].forEach(([px]) => { ln(x, px - 5, 60, px + 5, 60, ok ? 'g' : 'a', 2); if (up > 1) { x.fillStyle = COL.g; x.fillRect(px - 1, 60 - up, 2, up); } });
    }
    txt(x, 'SPLRS', 145, 40, 'w', 9, 'center');
    const ail = clamp((S.ac.onGround ? c.roll : (S.fg.bankCmd - a.phi * R2D) / 10 + c.roll) * 20, -20, 20);
    [[30, -ail], [260, ail]].forEach(([px, d]) => { box(x, px - 6, 90, 12, 50, 'w'); x.fillStyle = COL.g; x.fillRect(px - 5, 115 + d, 10, 3); });
    txt(x, 'AIL', 30, 150, 'w', 8.5, 'center'); txt(x, 'AIL', 260, 150, 'w', 8.5, 'center');
    const el = clamp(-(c.pitch * 15 + (S.fg.nzCmd ? (S.fg.nzCmd - a.nz) * 30 : 0)), -20, 20);
    [[105], [185]].forEach(([px]) => { box(x, px - 6, 175, 12, 50, 'w'); x.fillStyle = COL.g; x.fillRect(px - 5, 200 + el, 10, 3); });
    txt(x, 'ELEV', 145, 200, 'w', 8.5, 'center');
    box(x, 125, 232, 40, 12, 'w'); x.fillStyle = COL.g; x.fillRect(144 + clamp((c.yaw + c.rudTrim) * 16, -18, 18), 233, 3, 10); txt(x, 'RUD', 145, 252, 'w', 7.5, 'center');
    const o = S.ovh; txt(x, 'PRIM ' + [1, 2, 3].map(k => o['prim' + k] ? k : 'X').join(' ') + '   SEC ' + [1, 2, 3].map(k => o['sec' + k] ? k : 'X').join(' '), 145, 160, 'g', 8.5, 'center');
  },
  WHEEL(x) {
    const g = S.sys.gear, c = S.ctl;
    const gearSym = (cx, cy) => { const dn = g > 0.99, up = g < 0.01; x.fillStyle = dn ? COL.g : up ? '#000' : COL.r; x.strokeStyle = dn ? COL.g : up ? COL.gr : COL.r; x.beginPath(); x.moveTo(cx - 12, cy); x.lineTo(cx + 12, cy); x.lineTo(cx, cy + 16); x.closePath(); dn ? x.fill() : x.stroke(); };
    gearSym(145, 50); gearSym(70, 120); gearSym(220, 120);
    txt(x, g > 0.99 ? 'DOWN' : g < 0.01 ? 'UP' : 'TRANSIT', 145, 85, g > 0.99 ? 'g' : g < 0.01 ? 'w' : 'a', 10, 'center');
    const bt = Math.round(60 + (S.sys.ab.active ? 200 : 0) + (c.brake * 100));
    [40, 80, 210, 250].forEach(px => { txt(x, String(bt), px, 175, 'g', 10, 'center'); txt(x, '°C', px, 187, 'c', 7.5, 'center'); });
    txt(x, 'AUTO BRK ' + ['OFF', 'RTO', 'LO', '2', '3', 'HI'][c.autobrk], 145, 210, c.autobrk ? 'g' : 'w', 10, 'center');
    if (c.park) txt(x, 'PARK BRK ON', 145, 230, 'g', 10, 'center');
    if (S.sys.ab.active) txt(x, 'DECEL', 145, 245, 'g', 10, 'center');
  },
  DOOR(x) {
    const d = S.sys.doors;
    x.strokeStyle = COL.w; x.lineWidth = 1.4; x.beginPath(); x.ellipse(145, 140, 30, 110, 0, 0, 7); x.stroke();
    for (let k = 0; k < 4; k++) {
      const y = 60 + k * 50;
      [[110, 'L'], [180, 'R']].forEach(([px, s]) => { const open = d.pax && k === 0 && s === 'L'; x.fillStyle = open ? COL.a : COL.g; x.fillRect(px - 4, y, 8, 14); txt(x, s + (k + 1), px + (s === 'L' ? -16 : 16), y + 7, open ? 'a' : 'w', 8, 'center'); });
    }
    txt(x, 'CARGO', 145, 120, d.cargo ? 'a' : 'g', 8.5, 'center'); txt(x, d.cargo ? 'OPEN' : 'CLSD', 145, 132, d.cargo ? 'a' : 'g', 8.5, 'center');
    txt(x, 'SLIDES ' + (S.ovh.beacon === 0 ? 'ARMED' : 'DISARMED'), 145, 250, 'w', 8.5, 'center');
  },
  COND(x) {
    const o = S.ovh;
    txt(x, 'CKPT', 60, 70, 'w', 10, 'center'); txt(x, o.ckptT + '°C', 60, 90, 'g', 13, 'center');
    ['FWD', 'MID', 'AFT'].forEach((z, i) => { txt(x, z, 130 + i * 50, 70, 'w', 10, 'center'); txt(x, (o.cabT + (i - 1) * 0.5).toFixed(1) + '°C', 130 + i * 50, 90, 'g', 11, 'center'); });
    txt(x, 'HOT AIR 1 ' + (o.hotAir1 ? 'ON' : 'OFF') + '   HOT AIR 2 ' + (o.hotAir2 ? 'ON' : 'OFF'), 145, 150, 'g', 9, 'center');
    txt(x, 'CARGO AIR ' + (o.cargoAir ? 'ON' : 'OFF'), 145, 175, 'g', 9, 'center');
  },
};

/* ------------------------------ ISIS (secours) ------------------------------ */
function drawISIS(cv) {
  const W = 120, H = 120, x = setupCanvas(cv, W, H);
  if (!S.sys.elec.dc) return blackScreen(x, W, H);
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const a = S.ac;
  x.save(); x.beginPath(); x.rect(30, 18, 60, 84); x.clip(); x.translate(60, 60); x.rotate(-a.phi);
  const off = a.theta * R2D * 2.4; x.fillStyle = COL.sky; x.fillRect(-90, -200 + off, 180, 200); x.fillStyle = COL.gnd; x.fillRect(-90, off, 180, 200);
  for (let p = -20; p <= 20; p += 10) if (p) ln(x, -10, off - p * 2.4, 10, off - p * 2.4, 'w');
  x.restore();
  ln(x, 40, 60, 54, 60, 'y', 2.5); ln(x, 66, 60, 80, 60, 'y', 2.5);
  txt(x, String(Math.round(ias())), 15, 60, 'w', 10, 'center'); txt(x, String(Math.round(a.alt / FT / 10) * 10), 106, 60, 'w', 9, 'center');
  txt(x, 'STBY', 60, 9, 'gr', 7, 'center'); txt(x, (S.efis.baroStd ? 'STD' : '1013'), 60, 111, 'c', 7.5, 'center');
}

/* ------------------------------ VUE EXTÉRIEURE ------------------------------ */
function drawWindow(cv, W, H) {
  const x = setupCanvas(cv, W, H), a = S.ac;
  if (typeof t3Render !== 'function') window.t3Render = () => false;
  const f = 1050 * W / 1280, cx = W * 0.40, cy = H * 0.40;
  const eyeH = 8.5;
  const hdg = a.psi, th = a.theta, ph = a.phi;
  const altAgl = Math.max(0, a.alt - groundElev(a.lat, a.lon)) + eyeH;
  const three = t3Render();
  if (three) x.clearRect(0, 0, W, H);
  else {
  // ciel / sol
  x.save(); x.translate(cx, cy); x.rotate(-ph);
  const hy = f * Math.tan(th);
  const skyTop = a.alt > 9000 ? '#0d3f86' : '#2c7bd1', skyBot = a.alt > 9000 ? '#6fa6dc' : '#b9d7ee';
  const g1 = x.createLinearGradient(0, -H * 1.5 + hy, 0, hy); g1.addColorStop(0, skyTop); g1.addColorStop(1, skyBot);
  x.fillStyle = g1; x.fillRect(-W * 1.2, -H * 2 + hy, W * 2.4, H * 2);
  const nap = nearestApt(a.lat, a.lon), overLand = nap.d < 30000;
  const g2 = x.createLinearGradient(0, hy, 0, hy + H * 1.5);
  if (overLand) { g2.addColorStop(0, '#8fa5a3'); g2.addColorStop(0.08, '#5d7a52'); g2.addColorStop(1, '#3f5a33'); }
  else { g2.addColorStop(0, '#9fb7c9'); g2.addColorStop(0.06, '#2f6a93'); g2.addColorStop(1, '#123a5c'); }
  x.fillStyle = g2; x.fillRect(-W * 1.2, hy, W * 2.4, H * 2);
  x.restore();
  // projection monde -> écran
  const sh = Math.sin(hdg), chh = Math.cos(hdg), st = Math.sin(th), ct = Math.cos(th), sp = Math.sin(ph), cp = Math.cos(ph);
  const toCam = (e, n, u) => {
    const fwd = n * chh + e * sh, rgt = e * chh - n * sh;
    const fwd2 = fwd * ct + u * st, up2 = u * ct - fwd * st;
    const r3 = rgt * cp - up2 * sp, u3 = rgt * sp + up2 * cp;
    return { f: fwd2, r: r3, u: u3 };
  };
  const scr = p => ({ x: cx + f * p.r / p.f, y: cy - f * p.u / p.f });
  const groundZ = -altAgl;
  const drawPoly = (pts, fill) => {
    // pts in camera space; clip near plane f>1
    const out = []; const N = 2;
    for (let i = 0; i < pts.length; i++) {
      const A = pts[i], B = pts[(i + 1) % pts.length];
      if (A.f > N) out.push(A);
      if ((A.f > N) !== (B.f > N)) { const t = (N - A.f) / (B.f - A.f); out.push({ f: N, r: A.r + (B.r - A.r) * t, u: A.u + (B.u - A.u) * t }); }
    }
    if (out.length < 3) return;
    x.fillStyle = fill; x.beginPath(); out.forEach((p, i) => { const s = scr(p); i ? x.lineTo(s.x, s.y) : x.moveTo(s.x, s.y); }); x.closePath(); x.fill();
  };
  // pistes (aéroport proche)
  if (nap.d < 40000) {
    const ap = nap.ap;
    const rid = ap.icao === S.fms.to ? S.fms.arrRwy : ap.icao === S.fms.from ? S.fms.depRwy : ap.def;
    const r = rwyGeom(ap.icao, rid);
    const ref = enu(a.lat, a.lon, r.thr.lat, r.thr.lon);
    const hr = r.hdg * D2R, ux = Math.sin(hr), uy = Math.cos(hr), vx = Math.cos(hr), vy = -Math.sin(hr);
    const P = (along, side, z) => toCam(ref.e + ux * along + vx * side, ref.n + uy * along + vy * side, z === undefined ? groundZ : z);
    // tarmac / taxiway vers poste
    const gate = gcDest(r.mid.lat, r.mid.lon, r.hdg - 90, 420), gE = enu(a.lat, a.lon, gate.lat, gate.lon);
    const gToCam = (e, n) => toCam(gE.e + e, gE.n + n, groundZ);
    drawPoly([gToCam(-260 * ux - 120 * vx, -260 * uy - 120 * vy), gToCam(260 * ux - 120 * vx, 260 * uy - 120 * vy), gToCam(260 * ux + 80 * vx, 260 * uy + 80 * vy), gToCam(-260 * ux + 80 * vx, -260 * uy + 80 * vy)], '#6a6f72');
    drawPoly([P(-40, -230), P(r.len, -230), P(r.len, -200), P(-40, -200)], '#55595c');
    drawPoly([P(-60, -330), P(-30, -330), P(-30, -200), P(-60, -200)], '#55595c');
    drawPoly([P(0, -30), P(r.len, -30), P(r.len, 30), P(0, 30)], '#3b3e41');
    // marquages
    for (let d = 60; d < r.len - 60; d += 60) drawPoly([P(d, -0.5), P(d + 30, -0.5), P(d + 30, 0.5), P(d, 0.5)], '#e8e8e8');
    for (let k = -6; k <= 6; k++) if (k) drawPoly([P(6, k * 4 - 1), P(50, k * 4 - 1), P(50, k * 4 + 1), P(6, k * 4 + 1)], '#e8e8e8');
    drawPoly([P(300, -9), P(360, -9), P(360, -4), P(300, -4)], '#e8e8e8'); drawPoly([P(300, 4), P(360, 4), P(360, 9), P(300, 9)], '#e8e8e8');
    drawPoly([P(-80, -230 + 10), P(r.len, -230 + 10), P(r.len, -230 + 11), P(-80, -230 + 11)], '#e8c51c');
    // lumières d'approche + PAPI
    for (let d = 60; d <= 900; d += 60) { const p = P(-d, 0, groundZ + 1); if (p.f > 5) { const s = scr(p), rr = Math.max(1, 900 / p.f); x.fillStyle = '#fff7d0'; x.beginPath(); x.arc(s.x, s.y, rr, 0, 7); x.fill(); } }
    const glide = Math.atan2(a.alt - r.elev, Math.max(1, gcDist(a.lat, a.lon, r.thr.lat, r.thr.lon) + 0)) * R2D;
    [2.5, 2.83, 3.17, 3.5].forEach((ang, k) => { const p = P(330, -48 - k * 9, groundZ + 1); if (p.f > 5) { const s = scr(p), rr = Math.max(1.2, 700 / p.f); x.fillStyle = glide > ang ? '#ffffff' : '#ff2a2a'; x.beginPath(); x.arc(s.x, s.y, rr, 0, 7); x.fill(); } });
  }
  // grille au sol (sens de la vitesse)
  if (altAgl < 3000) {
    x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = 1;
    const step = altAgl < 300 ? 150 : 600, n0 = Math.round(0);
    const ox = ((a.lon * D2R * RE * Math.cos(a.lat * D2R)) % step), oy = ((a.lat * D2R * RE) % step);
    for (let i = -12; i <= 12; i++) for (const dir of [0, 1]) {
      const pts = []; for (let j = -12; j <= 12; j += 24) { const e = dir ? i * step - ox : j * step * 2, n = dir ? j * step * 2 : i * step - oy; pts.push(toCam(e, n, groundZ)); }
      const A = pts[0], B = pts[1]; if (A.f < 2 && B.f < 2) continue;
      let P1 = A, P2 = B; if (P1.f < 2) { const t = (2 - P1.f) / (P2.f - P1.f); P1 = { f: 2, r: P1.r + (P2.r - P1.r) * t, u: P1.u + (P2.u - P1.u) * t }; } if (P2.f < 2) { const t = (2 - P2.f) / (P1.f - P2.f); P2 = { f: 2, r: P2.r + (P1.r - P2.r) * t, u: P2.u + (P1.u - P2.u) * t }; }
      const s1 = scr(P1), s2 = scr(P2); x.beginPath(); x.moveTo(s1.x, s1.y); x.lineTo(s2.x, s2.y); x.stroke();
    }
  }
  // nuages d'altitude (couche)
  if (a.alt / FT > 6000 && a.alt / FT < 40000) {
    const cl = toCam(0, 0, 1500 - a.alt); x.save(); x.translate(cx, cy); x.rotate(-ph);
    const hz = f * Math.tan(th) + 2; x.fillStyle = 'rgba(240,244,250,.55)'; x.fillRect(-W, hz - 3, W * 2, 6); x.restore();
  }
  }
  // structure du pare-brise
  x.fillStyle = '#1c2128';
  x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W, 14); x.lineTo(0, 14); x.fill();
  x.beginPath(); x.moveTo(W * 0.74 - 7, 0); x.lineTo(W * 0.74 + 7, 0); x.lineTo(W * 0.74 + 4, H); x.lineTo(W * 0.74 - 4, H); x.fill();
  x.beginPath(); x.moveTo(0, 0); x.lineTo(46, 0); x.lineTo(14, H); x.lineTo(0, H); x.fill();
  x.beginPath(); x.moveTo(W, 0); x.lineTo(W - 46, 0); x.lineTo(W - 14, H); x.lineTo(W, H); x.fill();
  // annonces
  if (S.callout.t > 0) { x.font = `600 22px ${FONT}`; x.textAlign = 'center'; x.fillStyle = 'rgba(0,0,0,.45)'; x.fillText(S.callout.txt, cx + 2, H - 28); x.fillStyle = '#ffd34d'; x.fillText(S.callout.txt, cx, H - 30); }
  if (S.gpws && S.gpws.lvl === 'PULL UP' && flash(2)) { x.font = `700 30px ${FONT}`; x.textAlign = 'center'; x.fillStyle = '#ff3b30'; x.fillText('PULL UP', cx, 70); }
  if (S.crash) { x.fillStyle = 'rgba(80,0,0,.55)'; x.fillRect(0, 0, W, H); txt(x, 'ACCIDENT : ' + S.crash, cx, H / 2, '#fff', 18, 'center'); }
  if (S.paused && !S.crash) txt(x, 'PAUSE', cx, 40, '#fff', 16, 'center');
}
