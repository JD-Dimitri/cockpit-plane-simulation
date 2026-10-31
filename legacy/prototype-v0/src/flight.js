/* =====================================================================
   MODÈLE DE VOL, PILOTE AUTOMATIQUE, NAVIGATION, PHASES, ECAM
   ===================================================================== */

/* ---------- Aérodynamique ---------- */
function aero() {
  const a = S.ac, c = S.ctl, sy = S.sys;
  const cf = confAt(sy.flaps);
  const CL0 = AC.CL0 + cf.dCL - 0.12 * c.spd - 0.55 * sy.gndSpl;
  const aS = (cf.clmax - (AC.CL0 + cf.dCL)) / AC.CLa;
  const h = (a.alt - groundElev(a.lat, a.lon));
  const ge = h < 35 ? 1 + 0.12 * (1 - Math.max(0, h) / 35) : 1;   // effet de sol
  return { cf, CL0, aS, ge, CL: al => (al < aS ? CL0 + AC.CLa * al : (CL0 + AC.CLa * aS) * 0.72) * ge };
}
function dragCoef(CL, mach) {
  const cf = confAt(S.sys.flaps);
  const wave = mach > 0.82 ? 10 * Math.pow(mach - 0.82, 3) : 0;
  return AC.CD0 + cf.dCD + AC.k * CL * CL + 0.022 * S.sys.gear + 0.03 * S.ctl.spd + 0.09 * S.sys.gndSpl + wave;
}

function physStep(dt) {
  const a = S.ac, c = S.ctl, sy = S.sys;
  if (S.crash) return;
  const hydOk = sy.hyd.G > 2500 || sy.hyd.Y > 2500;
  sy.flaps = approach(sy.flaps, c.flapsLever, dt * (hydOk ? 0.1 : 0.03));
  sy.gear = approach(sy.gear, c.gearDown ? 1 : 0, dt * (hydOk ? 1 / 9 : 1 / 30));

  const atm = isa(a.alt), V = Math.max(a.V, 0.5), q = 0.5 * atm.rho * V * V, m = a.mass, W = m * G0;
  const mach = a.V / atm.a;
  // spoilers sol
  const idle = c.tla[0] <= 0.5 && c.tla[1] <= 0.5;
  if (a.onGround && c.spdArmed && idle && a.V > 40 * KT && (S.t - a.tdT < 60 || a.V > 72 * KT)) sy.gndSpl = approach(sy.gndSpl, 1, dt * 2);
  else if (!a.onGround || !idle) sy.gndSpl = approach(sy.gndSpl, 0, dt);
  const ae = aero();
  const T = S.eng[0].thr + S.eng[1].thr;
  a.T = T;
  let L, D;

  if (a.onGround) {
    const ge = groundElev(a.lat, a.lon); a.alt = ge; a.gam = 0; a.vs = 0; a.phi = approach(a.phi, 0, dt);
    const iasKt = ias();
    if (c.pitch > 0.05 && iasKt > 100 && hydOk) a.theta += c.pitch * 3 * D2R * dt;
    else a.theta = Math.max(0, a.theta - 1.6 * D2R * dt);
    a.theta = clamp(a.theta, 0, 14 * D2R);
    if (a.theta > 11.5 * D2R) S.tailstrike = true;
    a.alpha = a.theta;
    L = q * AC.S * ae.CL(a.alpha); D = q * AC.S * dragCoef(ae.CL(a.alpha), mach);
    const N = Math.max(0, W - L);
    const muMax = 0.42;
    const a0 = (T - D - 0.015 * N) / m;
    let Fb = c.brake * muMax * N;
    // freinage automatique
    sy.ab.active = false;
    if (c.autobrk === 1 && a.V > 72 * KT && idle && S.phase === 'TAKEOFF') { Fb = muMax * N; sy.ab.active = true; }
    if (c.autobrk >= 2 && sy.gndSpl > 0.5 && S.t - a.tdT < 120 && a.tdT > 0) {
      const dec = [0, 0, 1.7, 2.5, 3.2, 4.0][c.autobrk];
      Fb = Math.max(Fb, clamp(m * (a0 + dec), 0, muMax * N)); sy.ab.active = true;
    }
    if (c.park && a.V < 1) { a.V = 0; Fb = Infinity; }
    if (c.park && a.V >= 1) Fb = Math.max(Fb, muMax * N);
    let acc = a0 - (Fb === Infinity ? 0 : Fb / m);
    if (Fb === Infinity && T < muMax * N) acc = 0;
    a.V = Math.max(0, a.V + acc * dt);
    a.ax = acc;
    // direction au sol (tiller + palonnier)
    const steerMax = a.V < 15 * KT ? 70 : a.V < 40 * KT ? 25 : a.V < 90 * KT ? 7 : 2;
    const yawIn = clamp(c.yaw + c.tiller + (S.fg.rollCmdYaw || 0), -1, 1);
    const steer = yawIn * steerMax * D2R;
    a.psi += a.V * Math.tan(steer) / 28 * dt;
    // décollage
    if (L > W * 1.0 && a.V > 80 * KT) { a.onGround = false; a.gam = 0.002; a.airT = S.t; S.tookOff = true; }
    if (sy.gear < 0.95) crash('Atterrissage train rentré');
  } else {
    const apOn = S.fcu.ap1 || S.fcu.ap2;
    let nzCmd;
    if (apOn) nzCmd = S.fg.nzCmd;
    else {
      const comp = Math.cos(a.gam) / Math.cos(Math.min(Math.abs(a.phi), 33 * D2R));
      nzCmd = comp + c.pitch * (c.pitch > 0 ? 1.4 : 1.6);
    }
    const flapsOut = sy.flaps > 0.1;
    nzCmd = clamp(nzCmd, flapsOut ? 0 : -1, flapsOut ? 2 : 2.5);
    const CLreq = nzCmd * W / (q * AC.S);
    let aCmd = (CLreq / ae.ge - ae.CL0) / AC.CLa;
    const aProt = ae.aS - 3 * D2R, aMax = ae.aS - 1 * D2R;
    if (aCmd > aProt) aCmd = Math.min(aCmd, aProt + Math.max(0, c.pitch) * (aMax - aProt));
    // protection d'assiette (+30° / -15°)
    if (a.theta > 30 * D2R && aCmd > a.alpha) aCmd = a.alpha - 0.2 * D2R;
    if (a.theta < -15 * D2R && aCmd < a.alpha) aCmd = a.alpha + 0.2 * D2R;
    aCmd = clamp(aCmd, -6 * D2R, aMax);
    a.alpha += (aCmd - a.alpha) * Math.min(1, dt / 0.45);
    const CL = ae.CL(a.alpha);
    L = q * AC.S * CL; D = q * AC.S * dragCoef(CL, mach);
    if (apOn) a.phi = approach(a.phi, S.fg.bankCmd * D2R, 5 * D2R * dt);
    else {
      if (Math.abs(c.roll) > 0.05) a.phi += c.roll * 15 * D2R * dt;
      else if (Math.abs(a.phi) > 33 * D2R) a.phi = approach(a.phi, Math.sign(a.phi) * 33 * D2R, 5 * D2R * dt);
    }
    a.phi = clamp(a.phi, -67 * D2R, 67 * D2R);
    const dV = (T * Math.cos(a.alpha) - D) / m - G0 * Math.sin(a.gam);
    const dG = (L * Math.cos(a.phi) + T * Math.sin(a.alpha) - W * Math.cos(a.gam)) / (m * V);
    const dPsi = L * Math.sin(a.phi) / (m * V * Math.cos(a.gam));
    a.V = Math.max(20, a.V + dV * dt); a.ax = dV;
    a.gam = clamp(a.gam + dG * dt, -1.2, 1.2);
    a.psi += dPsi * dt + c.yaw * 0.6 * D2R * dt;
    a.theta = a.gam + a.alpha;
    a.alt += a.V * Math.sin(a.gam) * dt;
    a.vs = a.V * Math.sin(a.gam);
    const ge = groundElev(a.lat, a.lon);
    if (a.alt <= ge) touchdown(ge);
  }
  a.L = L; a.D = D; a.nz = L / W;
  a.psi = ((a.psi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const gs = a.V * Math.cos(a.gam);
  if (gs > 0.01) { const p = gcDest(a.lat, a.lon, a.psi * R2D, gs * dt); a.lat = p.lat; a.lon = p.lon; }
}

function touchdown(ge) {
  const a = S.ac;
  const fpm = a.vs / FT * 60;
  a.alt = ge; a.onGround = true; a.lastTdVs = fpm; a.tdT = S.t;
  const nap = nearestApt(a.lat, a.lon);
  if (nap.d > 25000) return crash(groundElev(a.lat, a.lon) > 5 ? 'Collision avec le relief' : 'Amerrissage');
  if (S.sys.gear < 0.95) return crash('Atterrissage train rentré');
  let onRwy = false;
  for (const id in nap.ap.rwys) {
    const r = rwyGeom(nap.ap.icao, id), p = enu(r.thr.lat, r.thr.lon, a.lat, a.lon), h = r.hdg * D2R;
    const along = p.e * Math.sin(h) + p.n * Math.cos(h), side = p.e * Math.cos(h) - p.n * Math.sin(h);
    if (along > -150 && along < r.len + 150 && Math.abs(side) < 45) onRwy = true;
  }
  if (!onRwy) return crash('Contact avec le sol hors de la piste');
  if (fpm < -1100) return crash('Impact trop violent (' + Math.round(fpm) + ' ft/min)');
  if (Math.abs(a.phi) > 12 * D2R) return crash('Contact aile au sol');
  a.gam = 0; a.vs = 0; a.phi = 0;
  showMsg(fpm < -600 ? 'Atterrissage dur : ' + Math.round(fpm) + ' ft/min' : 'Toucher des roues : ' + Math.round(fpm) + ' ft/min', fpm < -600 ? 'warn' : 'ok');
}
function crash(why) { S.crash = why; S.paused = true; showMsg('Accident : ' + why + '. Choisis un scénario pour recommencer.', 'warn', 9999); }
function showMsg(t, kind, dur) { S.msg = { t, kind: kind || 'info' }; S.msgT = dur || 6; }

/* ---------- Navigation ---------- */
function navInfo() {
  const a = S.ac, f = S.fms, W = f.wpts;
  if (!W.length) return null;
  const i = clamp(f.active, 1, W.length - 1), w = W[i], p = W[i - 1];
  const dist = gcDist(a.lat, a.lon, w.lat, w.lon), brg = gcBrg(a.lat, a.lon, w.lat, w.lon);
  // écart latéral par rapport à la branche p -> w
  const d13 = gcDist(p.lat, p.lon, a.lat, a.lon) / RE;
  const t13 = gcBrg(p.lat, p.lon, a.lat, a.lon) * D2R, t12 = gcBrg(p.lat, p.lon, w.lat, w.lon) * D2R;
  const xtk = Math.asin(clamp(Math.sin(d13) * Math.sin(t13 - t12), -1, 1)) * RE;
  let rem = dist; for (let k = i + 1; k < W.length; k++) rem += W[k].leg;
  return { i, w, p, dist, brg, xtk, rem };
}
function navUpdate(dt) {
  const f = S.fms, a = S.ac; if (!f.wpts.length) return;
  const n = navInfo(); if (!n) return;
  if (a.onGround && !S.tookOff) { S.nav = n; return; }
  const W = f.wpts;
  if (n.i < W.length - 1) {
    const next = W[n.i + 1];
    const turn = Math.abs(wrap180(next.trk - (n.w.trk || next.trk)));
    const R = a.V * a.V / (G0 * Math.tan(25 * D2R));
    const antic = Math.min(R * Math.tan(Math.min(turn, 120) * D2R / 2), 15 * NM);
    const passed = Math.abs(wrap180(n.brg - (n.w.trk || n.brg))) > 90 && n.dist < 20 * NM;
    if (n.dist < Math.max(antic, 0.6 * NM) || passed) f.active = n.i + 1;
  }
  S.nav = navInfo();
}
/* Données ILS de la piste d'arrivée */
function lsData() {
  const f = S.fms, r = rwyGeom(f.to, f.arrRwy), a = S.ac;
  const gpi = gcDest(r.thr.lat, r.thr.lon, r.hdg, 300);
  const d = gcDist(a.lat, a.lon, gpi.lat, gpi.lon);
  const brgFromGpi = gcBrg(gpi.lat, gpi.lon, a.lat, a.lon);
  const locDev = -wrap180(brgFromGpi - (r.hdg + 180));              // deg ; + = avion à droite de l'axe
  const xtk = d * Math.sin(locDev * D2R);                             // m ; + = à droite
  const ang = Math.atan2(a.alt - r.elev, d) * R2D;
  const gsDev = ang - 3;                                              // + = au-dessus
  const dThr = gcDist(a.lat, a.lon, r.thr.lat, r.thr.lon);
  const inRange = d < 27 * NM && Math.abs(wrap180(a.psi * R2D - r.hdg)) < 100;
  return { r, d, dThr, locDev, xtk, gsDev, inRange, hGS: r.elev + d * Math.tan(3 * D2R) };
}

/* ---------- Phase de vol ---------- */
function phaseUpdate() {
  const a = S.ac, G = S.fg, f = S.fms, maxTla = Math.max(...S.ctl.tla);
  const altFt = a.alt / FT, crz = f.crzFL * 100;
  const rem = S.nav ? S.nav.rem : 1e9;
  let p;
  if (a.onGround) p = S.tookOff ? 'LANDED' : (maxTla >= TLA_FLX - 0.5 || a.V > 40 * KT) ? 'TAKEOFF' : 'PREFLIGHT';
  else if (G.ga) p = 'GO AROUND';
  else if (G.vert === 'SRS') p = 'TAKEOFF';
  else if (rem < 32 * NM && radAlt() < 11000) p = 'APPROACH';
  else if (['DES', 'OP DES'].includes(G.vert) || (S.phase === 'DESCENT') || (S.phase === 'APPROACH')) p = 'DESCENT';
  else if (altFt >= crz - 300 || (S.phase === 'CRUISE' && G.vert !== 'CLB' && G.vert !== 'OP CLB')) p = 'CRUISE';
  else p = 'CLIMB';
  if (S.phase === 'APPROACH' && p === 'DESCENT' && !G.ga) p = 'APPROACH';
  S.phase = p;
}

/* ---------- Vitesse gérée ---------- */
function managedSpeed() {
  const sp = speeds(), f = S.fms, altFt = S.ac.alt / FT, atm = isa(S.ac.alt);
  const machOf = kt => iasToTas(kt, S.ac.alt) / atm.a;
  let r;
  switch (S.phase) {
    case 'PREFLIGHT': case 'TAKEOFF': r = { kt: Math.max(f.v2 + 10, sp.vls) }; break;
    case 'CLIMB': r = altFt < 10000 ? { kt: 250 } : machOf(300) >= 0.85 ? { mach: 0.85 } : { kt: 300 }; break;
    case 'CRUISE': r = { mach: 0.85 }; break;
    case 'DESCENT': r = altFt < 10500 ? { kt: 250 } : machOf(290) >= 0.84 ? { mach: 0.84 } : { kt: 290 }; break;
    case 'APPROACH': case 'LANDED': {
      const fl = Math.round(S.ctl.flapsLever);
      r = { kt: fl === 0 ? sp.gd : fl === 1 ? sp.s : fl === 2 ? sp.f : f.vapp }; break;
    }
    case 'GO AROUND': r = { kt: Math.max(sp.vls + 10, f.vapp) }; break;
    default: r = { kt: 250 };
  }
  if (r.kt) r.kt = clamp(r.kt, sp.vls + 2, sp.vmax - 5);
  return r;
}
function targetSpeed() {
  const F = S.fcu;
  let t;
  if (S.fg.vert === 'SRS') t = S.fg.ga ? { kt: Math.max(speeds().vls + 10, S.fms.vapp) } : { kt: Math.max(S.fms.v2 + 10, ias()) };
  else if (F.spdMan) t = managedSpeed();
  else t = F.machMode ? { mach: F.mach } : { kt: F.spd };
  if (S.fg.vert === 'SRS' && !S.fg.ga) t.kt = clamp(t.kt, S.fms.v2 + 5, S.fms.v2 + 20);
  t.tas = t.mach ? t.mach * isa(S.ac.alt).a : iasToTas(t.kt, S.ac.alt);
  t.ktEq = t.mach ? t.tas / KT * Math.sqrt(isa(S.ac.alt).rho / RHO0) : t.kt;
  return t;
}

/* ---------- Pilote automatique & directeur de vol (FG) ---------- */
function apEngage(n) {
  const k = 'ap' + n, F = S.fcu;
  if (F[k]) { F[k] = false; S.fg.apOffT = S.t; return; }
  if (S.ac.onGround || radAlt() < 100) return showMsg('AP : engagement possible au-dessus de 100 ft', 'warn');
  if (!irAligned()) return showMsg('AP : IR non alignés', 'warn');
  if (!(S.sys.hyd.G > 2500 || S.sys.hyd.Y > 2500)) return showMsg('AP : pas de pression hydraulique', 'warn');
  F[k] = true;
  if (!(S.fg.lat === 'LOC' && S.fg.vert.startsWith('G/S') || S.fg.vert === 'LAND')) F[n === 1 ? 'ap2' : 'ap1'] = false;
  if (!S.efis.fd) S.efis.fd = true;
  if (!S.fg.lat || S.fg.lat === 'RWY') S.fg.lat = S.fcu.hdgMan && S.fms.wpts.length ? 'NAV' : 'HDG';
  if (!S.fg.vert) S.fg.vert = 'V/S';
}
function apDisconnect(warn) {
  if (S.fcu.ap1 || S.fcu.ap2) { S.fcu.ap1 = S.fcu.ap2 = false; S.fg.apOffT = S.t; if (warn) S.fg.apOffWarn = S.t; }
}
function fcuAltPush(pull) {
  const G = S.fg, altFt = S.ac.alt / FT, tgt = S.fcu.alt;
  if (S.ac.onGround) { G.vertArm = pull ? '' : 'CLB'; return; }
  if (Math.abs(tgt - altFt) < 60) return;
  if (tgt > altFt) G.vert = pull ? 'OP CLB' : 'CLB'; else G.vert = pull ? 'OP DES' : 'DES';
  G.ga = false; G.altCap = false;
}
function fcuHdg(push) {
  const G = S.fg;
  S.fcu.hdgMan = !!push;
  if (push) { if (S.ac.onGround) G.latArm = 'NAV'; else G.lat = 'NAV'; }
  else { G.lat = 'HDG'; G.latArm = G.latArm === 'NAV' ? '' : G.latArm; S.fcu.hdg = Math.round(S.ac.psi * R2D); if (G.latArm === 'NAV') G.latArm = ''; }
}

function fgUpdate(dt) {
  const a = S.ac, F = S.fcu, G = S.fg, c = S.ctl;
  const apOn = F.ap1 || F.ap2;
  const ra = radAlt();
  const sp = speeds();
  const maxTla = Math.max(...c.tla);
  const altFt = a.alt / FT;

  // A/THR : se déconnecte quand les manettes passent au ralenti après le toucher (comme sur Airbus)
  if (a.onGround && S.tookOff && c.tla[0] <= 0.5 && c.tla[1] <= 0.5 && F.athr) F.athr = false;
  // --- A/THR état ---
  if (!F.athr) { G.athrState = 'off'; G.togaLk = false; }
  else if (athrActive()) G.athrState = 'active';
  else G.athrState = 'armed';
  // A.FLOOR
  const ae = aero();
  if (F.athr && !a.onGround && ra > 100 && a.alpha > ae.aS - 2 * D2R) { G.togaLk = true; }

  // --- Décollage / remise des gaz ---
  if (a.onGround && !S.tookOff) {
    if (maxTla >= TLA_FLX - 0.5 && S.efis.fd) {
      if (G.vert !== 'SRS') { G.vert = 'SRS'; G.lat = 'RWY'; G.ga = false; G.vertArm = 'CLB'; G.latArm = F.hdgMan ? 'NAV' : ''; }
      if (!F.athr) F.athr = true;
    } else if (G.vert !== 'SRS') { G.vert = ''; G.lat = ''; }
  }
  if (!a.onGround && maxTla >= TLA_TOGA - 0.5 && S.sys.flaps > 0.5 && !G.ga && G.vert !== 'SRS') {
    G.ga = true; G.vert = 'SRS'; G.lat = 'GA TRK'; G.gaTrk = a.psi * R2D; G.vertArm = ''; F.appr = false; F.loc = false; G.latArm = '';
    S.fms.active = Math.max(1, S.fms.wpts.length - 1); G.land = false; G.retard = false;
  }
  // --- Après décollage ---
  const elevFt = groundElev(a.lat, a.lon) / FT;
  if (!a.onGround && G.lat === 'RWY' && ra > 30) { G.lat = G.latArm === 'NAV' ? 'NAV' : 'RWY TRK'; G.rwyTrk = a.psi * R2D; G.latArm = ''; }
  G.lvrClb = !a.onGround && G.vert === 'SRS' && ra > S.fms.thrRed && maxTla > TLA_CL + 0.5 && !G.togaLk;
  if (G.vert === 'SRS' && !a.onGround && ra > S.fms.accAlt && (maxTla <= TLA_CL + 0.5 || G.ga)) {
    if (F.alt > altFt + 100) G.vert = G.vertArm === 'CLB' && !G.ga ? 'CLB' : 'OP CLB';
    else G.vert = 'ALT*';
    G.vertArm = ''; if (G.ga) { G.ga = false; G.lat = F.hdgMan ? 'NAV' : 'HDG'; S.phase = 'CLIMB'; }
  }

  // --- Approche : armement / captures ---
  const ls = lsData();
  S.ls = ls;
  if (F.appr) { if (G.lat !== 'LOC*' && G.lat !== 'LOC') G.latArm = 'LOC'; if (!G.vert.startsWith('G/S') && !['LAND', 'FLARE', 'ROLL OUT'].includes(G.vert)) G.vertArm = 'G/S'; }
  else if (F.loc) { if (G.lat !== 'LOC*' && G.lat !== 'LOC') G.latArm = 'LOC'; }
  if (G.latArm === 'LOC' && ls.inRange && Math.abs(ls.locDev) < 2.5 && !a.onGround) { G.lat = 'LOC*'; G.latArm = ''; }
  if (G.lat === 'LOC*' && Math.abs(ls.locDev) < 0.25) G.lat = 'LOC';
  if (G.vertArm === 'G/S' && (G.lat === 'LOC' || G.lat === 'LOC*') && ls.inRange && Math.abs(ls.gsDev) < 0.35) { G.vert = 'G/S*'; G.vertArm = ''; }
  if (G.vert === 'G/S*' && Math.abs(ls.gsDev) < 0.08) G.vert = 'G/S';
  if (G.lat === 'LOC' && G.vert === 'G/S' && ra < 400 && apOn) { G.vert = 'LAND'; G.lat = 'LAND'; G.land = true; }
  if (G.vert === 'LAND' && ra < 40) G.vert = 'FLARE';
  if ((G.vert === 'FLARE' || G.vert === 'LAND') && a.onGround) { G.vert = 'ROLL OUT'; G.lat = 'ROLL OUT'; }
  if (G.vert === 'ROLL OUT' && a.V < 30 * KT) { apDisconnect(false); G.vert = ''; G.lat = ''; F.appr = false; }

  // --- Vitesse cible ---
  const tgt = targetSpeed();
  G.spd = tgt;
  const V = Math.max(a.V, 1);

  // --- Latéral ---
  let trkTgt = a.psi * R2D, bankLim = 25;
  switch (G.lat) {
    case 'NAV': if (S.nav) { trkTgt = S.nav.brg - clamp(S.nav.xtk / NM * 6, -25, 25); } if (S.fms.active >= S.fms.wpts.length - 1 && S.nav && S.nav.dist < 1 * NM) trkTgt = S.ls.r.hdg; break;
    case 'HDG': trkTgt = F.hdg; break;
    case 'RWY TRK': trkTgt = G.rwyTrk; break;
    case 'GA TRK': trkTgt = G.gaTrk; break;
    case 'LOC*': case 'LOC': case 'LAND': case 'FLARE': case 'ROLL OUT':
      trkTgt = ls.r.hdg - clamp(ls.xtk * (G.lat === 'LOC*' ? 0.04 : 0.06), -30, 30); bankLim = ra < 500 ? 10 : 25; break;
    default: trkTgt = a.psi * R2D;
  }
  const trkErr = wrap180(trkTgt - a.psi * R2D);
  G.bankCmd = clamp(trkErr * 2.2, -bankLim, bankLim);
  G.trkTgt = trkTgt;
  G.rollCmdYaw = (G.lat === 'ROLL OUT' && apOn) ? clamp(-ls.xtk * 0.02 - wrap180(a.psi * R2D - ls.r.hdg) * 0.1, -1, 1) : 0;

  // --- Vertical ---
  const Tsum = a.T || 0, D = a.D || 0, W = a.mass * G0;
  const gEq = Math.asin(clamp((Tsum - D) / W, -0.3, 0.35));
  const spdOnPitch = (lim) => clamp(gEq + 0.022 * (V - tgt.tas), lim[0] * D2R, lim[1] * D2R);
  let gCmd = a.gam, thrMode = 'SPEED';
  const altErr = (F.alt - altFt);
  const capZone = Math.max(250, Math.abs(a.vs / FT * 60) * 0.22);
  if (['CLB', 'OP CLB', 'DES', 'OP DES', 'V/S'].includes(G.vert) && Math.abs(altErr) < capZone && (Math.sign(altErr) === Math.sign(a.vs) || G.vert === 'V/S' && Math.abs(altErr) < 100)) G.vert = 'ALT*';
  switch (G.vert) {
    case 'SRS': gCmd = spdOnPitch([-2, 18 - a.alpha * R2D]); thrMode = G.ga ? 'MAN TOGA' : 'LEVER'; break;
    case 'CLB': case 'OP CLB': gCmd = spdOnPitch([0, 15]); thrMode = 'THR CLB'; break;
    case 'OP DES': gCmd = spdOnPitch([-8, 0]); thrMode = 'THR IDLE'; break;
    case 'DES': {
      const path = pathAlt();
      const above = altFt - path;
      gCmd = clamp(-2.8 * D2R - clamp(above, -1500, 2000) * 0.0006 * D2R * 3, -5 * D2R, -0.8 * D2R);
      if (V > tgt.tas + 20 * KT) gCmd = Math.max(gCmd, spdOnPitch([-6, 0]));   // trop rapide : on quitte le profil pour décélérer
      thrMode = 'SPEED'; G.moreDrag = above > 600 && V > tgt.tas - 3 * KT; break;
    }
    case 'V/S': gCmd = Math.asin(clamp(F.vs * FT / 60 / V, -0.25, 0.25)); thrMode = 'SPEED'; break;
    case 'ALT*': case 'ALT': case 'ALT CRZ': {
      const vsT = clamp(altErr * FT * 0.08, -Math.max(5, Math.abs(a.vs)), Math.max(5, Math.abs(a.vs)));
      gCmd = Math.asin(clamp(vsT / V, -0.2, 0.2));
      if (G.vert === 'ALT*' && Math.abs(altErr) < 25) G.vert = Math.abs(F.alt - S.fms.crzFL * 100) < 50 ? 'ALT CRZ' : 'ALT';
      thrMode = 'SPEED'; break;
    }
    case 'G/S*': case 'G/S': case 'LAND': {
      const corr = clamp(-ls.gsDev * 2.5, -1.5, 1.5);
      gCmd = (-3 + corr) * D2R; thrMode = 'SPEED'; break;
    }
    case 'FLARE': gCmd = lerp(-3, -1.0, clamp((40 - ra) / 34, 0, 1)) * D2R; thrMode = ra < 12 ? 'IDLE' : 'SPEED'; break;
    case 'ROLL OUT': gCmd = 0; thrMode = 'IDLE'; break;
    default: gCmd = a.gam;
  }
  G.retard = (G.vert === 'FLARE' && ra < 12) || G.vert === 'ROLL OUT';
  if (G.vert === 'SRS' && a.onGround) gCmd = 0;
  G.gamCmd = gCmd;
  const tau = G.vert === 'FLARE' ? 1.2 : 3;
  G.nzCmd = clamp(Math.cos(a.gam) / Math.cos(a.phi) + (gCmd - a.gam) * V / (G0 * tau), 0.75, 1.3);
  // FD (directeur de vol)
  G.fdPitch = (gCmd - a.gam) * R2D * 1.5; G.fdRoll = G.bankCmd - a.phi * R2D;

  // --- A/THR ---
  if (G.togaLk) { G.athrMode = 'TOGA LK'; G.athrCmd = 1; }
  else if (a.onGround && S.tookOff) { G.athrCmd = 0; G.athrMode = 'THR IDLE'; }
  else {
    const Tav = thrustAvail(a.alt, a.V / isa(a.alt).a), idleT = 7000 * isa(a.alt).rho / RHO0;
    if (thrMode === 'THR CLB') G.athrCmd = 0.86;
    else if (thrMode === 'THR IDLE' || thrMode === 'IDLE') G.athrCmd = 0;
    else {
      const accT = clamp((tgt.tas - V) / 10, -0.8, 0.8);
      const Treq = D + a.mass * (accT + G0 * Math.sin(a.gam));
      G.athrCmd = clamp((Treq / 2 - idleT) / Tav, 0, 1);
    }
    G.athrMode = thrMode === 'THR CLB' ? 'THR CLB' : thrMode === 'THR IDLE' ? 'THR IDLE' : thrMode === 'IDLE' ? 'THR IDLE' : tgt.mach ? 'MACH' : 'SPEED';
  }
  // désengagement AP sur action manche
  if (apOn && (Math.abs(c.pitch) > 0.5 || Math.abs(c.roll) > 0.5)) apDisconnect(true);
}
function pathAlt() {
  const f = S.fms, rem = S.nav ? S.nav.rem / NM : 1e9, elev = AIRPORTS[f.to].elev;
  if (!f.pathTbl || f.pathTbl.elev !== elev) {
    // profil de descente reconstruit depuis le seuil : 3° + segments de décélération
    const t = []; let a = elev + 50, d1 = 0, d2 = 0;
    for (let nm = 0; nm <= 600; nm++) {
      t.push(a);
      if (a - elev < 2400) a += 318;
      else if (d1 < 10) { a += 110; d1++; }          // décélération d'approche
      else if (a < 10000) a += 318;
      else if (d2 < 7) { a += 60; d2++; }            // palier FL100 : 300 -> 250 kt
      else a += 318;
    }
    t.elev = elev; f.pathTbl = t;
  }
  const t = f.pathTbl, i = Math.min(599, Math.floor(rem)), fr = Math.min(1, rem - i);
  return Math.min(f.crzFL * 100, i >= 599 ? t[599] : lerp(t[i], t[i + 1], fr));
}
/* ---------- Annonces automatiques (callouts) ---------- */
const CALLS = [2500, 1000, 500, 400, 300, 200, 100, 50, 40, 30, 20, 10];
/* GPWS : alarmes de proximité du sol (modes 1 et 3 simplifiés) */
function gpws(dt) {
  const a = S.ac, g = S.gpws || (S.gpws = { lvl: '', t: 0 });
  g.lvl = '';
  if (a.onGround || !S.sys.elec.ac) return;
  const ra = radAlt(), vs = a.vs / FT * 60;
  if (ra < 2500 && ra > 30) {
    if (vs < -(1600 + ra * 1.1)) g.lvl = 'PULL UP';
    else if (vs < -(1000 + ra * 0.8)) g.lvl = 'SINK RATE';
    else if (S.tookOff && (S.phase === 'TAKEOFF' || S.phase === 'CLIMB') && ra < 1500 && vs < -300 && S.sys.flaps > 0.3) g.lvl = "DON'T SINK";
    if (S.ctl.gearDown === false && ra < 500 && vs < -200 && S.phase !== 'TAKEOFF') g.lvl = g.lvl || 'TOO LOW GEAR';
  }
  g.t -= dt;
  if (g.lvl && g.t <= 0) { say(g.lvl); g.t = 2.4; }
}
function callouts() {
  const a = S.ac; if (a.onGround || a.vs > 0) { S.callout.last = 9999; return; }
  const ra = radAlt();
  const mins = S.fms.dh || 0;
  if (mins && S.callout.last > mins + 100 && ra <= mins + 100) say('HUNDRED ABOVE');
  if (mins && S.callout.last > mins && ra <= mins) say('MINIMUM');
  for (const h of CALLS) if (S.callout.last > h && ra <= h) { say(h === 2500 ? 'TWO THOUSAND FIVE HUNDRED' : h === 1000 ? 'ONE THOUSAND' : String(h)); break; }
  if (S.callout.last > 12 && ra <= 12 && S.fg.athrState !== 'off') say('RETARD');
  S.callout.last = ra;
}
function say(txt) {
  S.callout.txt = txt; S.callout.t = 2.2;
  if (S.sound && typeof playVoice === 'function' && playVoice(txt)) return;
  if (S.sound && window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(txt.toLowerCase()); u.lang = 'en-US'; u.rate = 1.15; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { } }
}

/* =====================================================================
   ECAM : alertes et mémos
   ===================================================================== */
function ecamUpdate() {
  const a = S.ac, o = S.ovh, sy = S.sys, E = S.eng, al = [];
  const add = (id, lvl, title, lines) => al.push({ id, lvl, title, lines: lines || [] });
  const ra = radAlt(), sp = speeds(), iasK = ias();
  const toPhase = S.phase === 'TAKEOFF' && iasK > 80 && ra < 1500;
  if (!sy.elec.dc) { S.ecam.alerts = []; S.ecam.memo = []; S.ecam.mw = S.ecam.mc = false; return; }
  [0, 1].forEach(i => {
    const e = E[i], n = i + 1;
    if (e.fire) add('fire' + n, 3, `ENG ${n} FIRE`, [
      { t: `THR LEVER ${n} ........ IDLE`, d: S.ctl.tla[i] <= 0.5 }, { t: `ENG MASTER ${n} ........ OFF`, d: !S.ctl.engMaster[i] },
      { t: `ENG ${n} FIRE P/B ..... PUSH`, d: !!o['eng' + n + 'Fire'] }, { t: `AGENT 1 ......... DISCH`, d: e.ag1 }]);
    if (S.fail['eng' + n + 'fail'] && S.ctl.engMaster[i]) add('fail' + n, 2, `ENG ${n} FAIL`, [{ t: `THR LEVER ${n} ........ IDLE`, d: S.ctl.tla[i] <= 0.5 }, { t: `ENG MASTER ${n} ........ OFF`, d: !S.ctl.engMaster[i] }]);
  });
  if (sy.apu.fire) add('apufire', 3, 'APU FIRE', [{ t: 'APU FIRE P/B ....... PUSH', d: !!o.apuFire }, { t: 'AGENT ............ DISCH', d: sy.apu.ag }]);
  if (!a.onGround && S.sys.gear < 0.99 && ra < 750 && S.ctl.flapsLever >= 3 && a.vs < 0) add('gear', 3, 'L/G GEAR NOT DOWN', [{ t: 'L/G LEVER ......... DOWN', d: S.ctl.gearDown }]);
  if (!a.onGround && iasK > sp.vmax + 4) add('ovsp', 3, 'OVERSPEED', [{ t: `VMAX ${Math.round(sp.vmax)} KT · RÉDUIRE`, d: false }]);
  if (!a.onGround && a.alpha > aero().aS - 0.3 * D2R) add('stall', 3, 'STALL', [{ t: 'NOSE DOWN · THRUST TOGA', d: false }]);
  if (S.fg.apOffWarn && S.t - S.fg.apOffWarn < 4) add('apoff', 3, 'AUTO FLT AP OFF', []);
  if (S.gpws && S.gpws.lvl) add('gpws', S.gpws.lvl === 'PULL UP' ? 3 : 2, 'GPWS ' + S.gpws.lvl, [{ t: 'MANCHE ....... CABRER', d: S.ac.vs > 0 }, { t: 'MANETTES ....... TOGA', d: Math.max(...S.ctl.tla) >= TLA_TOGA - 0.5 }]);
  if (sy.cabAlt > 9550 && !a.onGround) add('cabalt', 3, 'CAB PR EXCESS CAB ALT', [{ t: 'CREW OXY MASKS ..... USE', d: false }, { t: 'DESCENT ........... INIT', d: a.vs < -5 }]);
  if (a.onGround && Math.max(...S.ctl.tla) >= TLA_FLX - 0.5 && !S.tookOff) {
    if (S.ctl.flapsLever < 1 || S.ctl.flapsLever > 3) add('cfgflap', 3, 'CONFIG FLAPS NOT IN T.O CONFIG', []);
    if (S.ctl.park) add('cfgpark', 3, 'CONFIG PARK BRK ON', []);
    if (S.ctl.spd > 0.05) add('cfgspd', 3, 'CONFIG SPD BRK NOT RETRACTED', []);
  }
  if (S.ecam.toTest > 0) {
    const bad = S.ctl.flapsLever < 1 || S.ctl.flapsLever > 3 || S.ctl.spd > 0.05;
    if (bad) add('tocfg', 3, 'CONFIG T.O NOT NORMAL', []);
  }
  // cautions
  if (!toPhase) {
    [0, 1].forEach(i => {
      const g = sy.elec.gen[i], n = i + 1;
      if (E[i].st === 'run' && !g.a && !g.b) add('gen' + n, 2, `ELEC GEN ${n}A+${n}B OFF`, [{ t: `GEN ${n}A / ${n}B ....... ON`, d: false }]);
      else if (i === 0 && S.fail.gen1a && E[0].st === 'run') add('gen1af', 2, 'ELEC GEN 1A FAULT', [{ t: 'GEN 1A ............. OFF', d: !o.gen1a }]);
      if (E[i].st === 'run' && !o['engBleed' + n] && !a.onGround) add('bleed' + n, 2, `AIR ENG ${n} BLEED OFF`, []);
      const pumps = i === 0 ? (o.lp1 || o.lp2) : (o.rp1 || o.rp2);
      if (E[i].st === 'run' && !pumps) add('fp' + n, 2, `FUEL ${i ? 'R' : 'L'} WING PUMPS OFF`, [{ t: `${i ? 'R' : 'L'} PUMPS ............ ON`, d: false }]);
    });
    if ((E[0].st === 'run' || E[1].st === 'run') && sy.hyd.G < 2500) add('hydg', 2, 'HYD G SYS LO PR', []);
    if ((E[0].st === 'run' || E[1].st === 'run') && sy.hyd.Y < 2500) add('hydy', 2, 'HYD Y SYS LO PR', []);
    if (a.onGround && a.V > 2 * KT && !irAligned()) add('ir', 2, 'NAV IR NOT ALIGNED', [{ t: 'AIRCRAFT ........... STOP', d: a.V < 1 }]);
    if (Math.abs(a.fuel.L - a.fuel.R) > 3000) add('imb', 2, 'FUEL IMBALANCE', [{ t: 'X FEED ............... ON', d: !!o.xfeed }]);
    if (fob() < 6000 && !a.onGround) add('lofuel', 2, 'FUEL LO LEVEL', []);
    if (!a.onGround && !sy.packs[0] && !sy.packs[1]) add('packs', 2, 'AIR PACK 1+2 OFF', [{ t: 'PACK 1 / PACK 2 ....... ON', d: false }]);
    if (S.ctl.park && a.onGround && Math.max(...S.ctl.tla) > 10) add('park', 2, 'BRAKES PARK BRK ON', []);
    if (!a.onGround && S.ctl.spd > 0.05 && Math.max(...S.ctl.tla) > TLA_CL - 2 && S.fg.athrState !== 'active') add('spdbrk', 2, 'F/CTL SPEED BRAKES STILL OUT', []);
    if (!o.prim1 && !o.prim2 && !o.prim3) add('prim', 2, 'F/CTL PRIM 1+2+3 FAULT', []);
    if (!a.onGround && !(o.adr1 || o.adr2 || o.adr3)) add('adr', 2, 'NAV ADR 1+2+3 FAULT', []);
    if (S.tailstrike) add('tail', 2, 'TAILSTRIKE', []);
  }
  // masters
  const ids = al.map(x => x.id);
  al.forEach(x => { if (!S.ecam.ack[x.id]) { if (x.lvl === 3) S.ecam.mw = true; else S.ecam.mc = true; } });
  for (const k in S.ecam.ack) if (!ids.includes(k)) delete S.ecam.ack[k];
  if (!al.some(x => x.lvl === 3 && !S.ecam.ack[x.id])) S.ecam.mw = false;
  if (!al.some(x => x.lvl === 2 && !S.ecam.ack[x.id])) S.ecam.mc = false;
  S.ecam.alerts = al.sort((x, y) => y.lvl - x.lvl);
  // page auto
  if (S.ecam.autoPage && !S.ecam.alerts.length) {
    const st = E.some(e => e.st === 'start'), anyRun = E.some(e => e.st === 'run');
    S.ecam.page = st ? 'ENG' : sy.apu.starting ? 'APU' : S.phase === 'PREFLIGHT' ? (anyRun ? 'WHEEL' : 'DOOR') : ['APPROACH', 'LANDED'].includes(S.phase) ? 'WHEEL' : 'ENG';
  }
  if (S.ecam.autoPage && S.ecam.alerts.length) {
    const top = S.ecam.alerts[0].id;
    const map = { gen1: 'ELEC', gen2: 'ELEC', gen1af: 'ELEC', hydg: 'HYD', hydy: 'HYD', fp1: 'FUEL', fp2: 'FUEL', imb: 'FUEL', bleed1: 'BLEED', bleed2: 'BLEED', packs: 'BLEED', cabalt: 'PRESS', fire1: 'ENG', fire2: 'ENG', fail1: 'ENG', fail2: 'ENG', apufire: 'APU', gear: 'WHEEL' };
    if (map[top]) S.ecam.page = map[top];
  }
  // mémos
  const memo = [];
  const m = (t, col) => memo.push({ t, c: col || 'g' });
  const alig = S.sys.adirs.filter(x => x > 0 && x < 1);
  if (alig.length) m(`IR IN ALIGN ${Math.ceil((1 - Math.min(...alig)) * 150 / 60)} MN`, 'g');
  if (S.phase === 'PREFLIGHT' && E.some(e => e.st === 'run') && !S.tookOff) {
    m('T.O', 'w');
    m('AUTO BRK ' + (S.ctl.autobrk === 1 ? 'RTO' : '...... RTO'), S.ctl.autobrk === 1 ? 'g' : 'b');
    m('SIGNS ' + (o.seatBelts === 0 && o.noSmoking <= 1 ? 'ON' : '........ ON'), o.seatBelts === 0 ? 'g' : 'b');
    m('CABIN ' + (!sy.doors.pax ? 'READY' : '..... CHECK'), !sy.doors.pax ? 'g' : 'b');
    m('SPLRS ' + (S.ctl.spdArmed ? 'ARM' : '........ ARM'), S.ctl.spdArmed ? 'g' : 'b');
    m('FLAPS ' + (S.ctl.flapsLever >= 1 && S.ctl.flapsLever <= 3 ? 'T.O' : '........ T.O'), S.ctl.flapsLever >= 1 && S.ctl.flapsLever <= 3 ? 'g' : 'b');
    m('T.O CONFIG ' + (S.ecam.toTest > 0 && !S.ecam.alerts.some(x => x.id === 'tocfg') ? 'NORMAL' : '... TEST'), S.ecam.toTest > 0 ? 'g' : 'b');
  } else if (!a.onGround && ra < 2000 && S.sys.flaps > 0.5 && a.vs < 0) {
    m('LDG', 'w');
    m('LDG GEAR ' + (S.ctl.gearDown ? 'DN' : '..... DN'), S.ctl.gearDown ? 'g' : 'b');
    m('SIGNS ' + (o.seatBelts === 0 ? 'ON' : '........ ON'), o.seatBelts === 0 ? 'g' : 'b');
    m('SPLRS ' + (S.ctl.spdArmed ? 'ARM' : '........ ARM'), S.ctl.spdArmed ? 'g' : 'b');
    m('FLAPS ' + (S.ctl.flapsLever >= (S.fms.ldgConf === 4 ? 4 : 3) ? (S.fms.ldgConf === 4 ? 'FULL' : 'CONF 3') : '....... ' + (S.fms.ldgConf === 4 ? 'FULL' : 'CONF 3')), S.ctl.flapsLever >= (S.fms.ldgConf === 4 ? 4 : 3) ? 'g' : 'b');
  }
  if (sy.apu.avail) m(o.apuBleed ? 'APU BLEED' : 'APU AVAIL');
  if (S.ctl.park && a.onGround) m('PARK BRK');
  if (o.seatBelts === 0) m('SEAT BELTS');
  if (o.noSmoking === 0) m('NO SMOKING');
  if (E.some(e => e.ign)) m('IGNITION');
  if (o.engAI1 || o.engAI2) m('ENG A.ICE');
  if (o.wingAI) m('WING A.ICE');
  if (o.probeHeat === 1) m('PROBE/WINDOW HEAT');
  if (S.ctl.spdArmed && !(S.phase === 'PREFLIGHT' && E.some(e => e.st === 'run'))) m('GND SPLRS ARMED');
  if (S.ctl.spd > 0.05 && !a.onGround) m('SPEED BRK', S.ctl.tla[0] > 2 ? 'a' : 'g');
  if (S.ctl.autobrk >= 2) m('AUTO BRK ' + ['', '', 'LO', '2', '3', 'HI'][S.ctl.autobrk]);
  if (o.xfeed) m('FUEL X FEED');
  if (sy.gpu && a.onGround && sy.elec.extOn) m('EXT PWR');
  if (o.rcdrGnd) m('RCDR GND CTL ON');
  if (S.fg.moreDrag && S.fg.vert === 'DES') m('MORE DRAG', 'a');
  if (o.annLt === 0) m('ANN LT TEST', 'w');
  S.ecam.memo = memo;
}
function ecamClear() {
  const first = S.ecam.alerts.find(x => !S.ecam.ack[x.id]);
  if (first) S.ecam.ack[first.id] = true;
}
function masterAck() { S.ecam.alerts.forEach(x => S.ecam.ack[x.id] = true); S.ecam.mw = S.ecam.mc = false; }

/* ---------- Pas de simulation global ---------- */
const DT = 1 / 60;
function simStep(dt) {
  S.t += dt;
  sysElec(dt); sysApu(dt); sysAdirs(dt); sysPneu(dt); sysEng(dt); sysHyd(dt);
  navUpdate(dt);
  phaseUpdate();
  if (typeof taxiUpdate === 'function') taxiUpdate(dt);
  fgUpdate(dt);
  physStep(dt);
  sysFuel(dt);
  callouts();
  gpws(dt);
  if (S.ecam.toTest > 0) S.ecam.toTest -= dt;
  if (S.ovh.beacon === 0) { S.sys.doors.pax = false; S.sys.doors.cargo = false; }
  if (S.callout.t > 0) S.callout.t -= dt;
  if (S.ac.onGround && S.tookOff && S.ac.V < 1 && S.ctl.park && S.t - S.ac.tdT > 5 && (!S.taxi || S.taxi.mode !== 'arr' || S.taxi.done) && !S.arrived && !S.crash && nearestApt(S.ac.lat, S.ac.lon).ap.icao === S.fms.to) { S.arrived = true; showMsg('Au parking à ' + AIRPORTS[S.fms.to].name + '. Coupe les moteurs : vol terminé.', 'ok', 10); }
}
/* Facteur d'accélération autorisé */
function maxRate() {
  const apOn = S.fcu.ap1 || S.fcu.ap2;
  if (S.ac.onGround) return 4;
  if (!apOn) return 2;
  if (radAlt() < 5000 || ['APPROACH', 'TAKEOFF', 'GO AROUND'].includes(S.phase)) return 4;
  return 256;
}
