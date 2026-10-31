/* =====================================================================
   INTERFACE : panneaux, FMS, guide, clavier, boucle principale
   ===================================================================== */
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const UIC = { covers: {}, stick: { active: false, x: 0, y: 0 }, tiller: { active: false, x: 0 }, cache: {}, mfdPage: 'INIT', guideDone: new Set(), skip: new Set(), nws: true, brkfan: false,
  vhf: [118.700, 121.500], xpdr: { code: '2000', mode: 0 }, wxr: false, et0: 0 };
const keys = {};
let VIEW = 'main';

/* ---------------- PLAFONNIER ---------------- */
function buildOvhd() {
  const root = $('ovhd'); root.innerHTML = '';
  const cols = [0, 1, 2, 3].map(() => el('div', 'ocol'));
  OVH_DEF.forEach(p => {
    const pn = el('div', 'opnl'); pn.appendChild(el('h3', '', p.title));
    const its = el('div', 'oitems'); p.items.forEach(it => its.appendChild(buildItem(it)));
    pn.appendChild(its); cols[p.col].appendChild(pn);
  });
  cols.forEach(c => root.appendChild(c));
}
function legendDefaults(it) {
  switch (it.t) {
    case 'pb': return it.norm ? ['FAULT', it.offL || 'OFF'] : ['FAULT', it.on || 'ON'];
    case 'ext': return ['AVAIL', 'ON'];
    case 'apustart': return ['AVAIL', 'ON'];
    case 'agent': return ['SQUIB', 'DISCH'];
    case 'guard': return it.fire !== undefined ? ['FIRE', ''] : it.id === 'evacCmd' ? ['EVAC', 'ON'] : it.id === 'paxOxy' ? ['', 'MAN ON'] : ['FAULT', 'ON'];
  }
  return ['', ''];
}
function buildItem(it) {
  const w = el('div', 'it' + (it.t === 'knob' ? ' wide' : '')); w.id = 'ctl-' + it.id;
  const nm = () => w.appendChild(el('div', 'nm', it.l));
  const mkPb = (extra) => { const b = el('button', 'pb' + (extra || '')); const d = legendDefaults(it); b.innerHTML = `<span class="lt u">${d[0]}</span><span class="lt d">${d[1]}</span>`; b.setAttribute('aria-label', it.l); b.onclick = () => ovhClick(it); return b; };
  switch (it.t) {
    case 'pb': case 'ext': case 'apustart': case 'agent': w.appendChild(mkPb()); nm(); break;
    case 'guard': {
      const g = el('div', 'guardw'); const b = mkPb(it.fire !== undefined ? ' fire' : '');
      const cv = el('button', 'cover'); cv.setAttribute('aria-label', 'Ouvrir le capot ' + it.l); cv.onclick = () => { UIC.covers[it.id] = true; uiRefresh(true); };
      g.append(b, cv); w.appendChild(g); nm();
      const close = el('button', 'k sm', 'capot'); close.title = 'Refermer le capot'; close.onclick = () => { UIC.covers[it.id] = false; uiRefresh(true); }; w.appendChild(close);
      break;
    }
    case 'mom': { const b = el('button', 'k mom', it.l); b.onclick = () => momentary(it.id); w.appendChild(b); break; }
    case 'sel': {
      const s = el('div', 'sel');
      const l = el('button', 'arr', '◀'), r = el('button', 'arr', '▶'), k = el('div', 'knob');
      l.setAttribute('aria-label', it.l + ' précédent'); r.setAttribute('aria-label', it.l + ' suivant');
      l.onclick = () => { S.ovh[it.id] = Math.max(0, S.ovh[it.id] - 1); uiRefresh(true); };
      r.onclick = () => { S.ovh[it.id] = Math.min(it.pos.length - 1, S.ovh[it.id] + 1); uiRefresh(true); };
      s.append(l, k, r); w.appendChild(s); w.appendChild(el('div', 'pos')); nm(); break;
    }
    case 'tog': {
      const t = el('div', 'tog');
      it.pos.forEach((p, i) => { const b = el('button', '', p); b.onclick = () => { S.ovh[it.id] = i; uiRefresh(true); }; t.appendChild(b); });
      w.appendChild(t); nm(); break;
    }
    case 'knob': {
      const k = el('div', 'knv');
      const m = el('button', 'k', '−'), p = el('button', 'k', '+'), d = el('div', 'disp');
      m.onclick = () => { S.ovh[it.id] = Math.max(it.min, S.ovh[it.id] - 1); uiRefresh(true); };
      p.onclick = () => { S.ovh[it.id] = Math.min(it.max, S.ovh[it.id] + 1); uiRefresh(true); };
      k.append(m, d, p); w.appendChild(k); nm(); break;
    }
  }
  return w;
}
function ovhClick(it) {
  const o = S.ovh, id = it.id;
  switch (it.t) {
    case 'pb': case 'ext': o[id] = o[id] ? 0 : 1; break;
    case 'apustart': if (o.apuMaster) o.apuStart = 1; else showMsg('APU START : mettre d\'abord APU MASTER sur ON', 'warn'); break;
    case 'agent': {
      const armed = it.eng === 'apu' ? o.apuFire : o[it.eng === 0 ? 'eng1Fire' : 'eng2Fire'];
      if (!armed) { showMsg('AGENT : pousser d\'abord le bouton FIRE correspondant', 'warn'); break; }
      if (it.eng === 'apu') S.sys.apu.ag = true; else S.eng[it.eng]['ag' + it.n] = true;
      break;
    }
    case 'guard':
      if (!UIC.covers[id]) { UIC.covers[id] = true; break; }
      o[id] = o[id] ? 0 : 1;
      if (id === 'apuFire' && o[id]) { S.sys.apu.fireShut = true; o.apuMaster = 0; }
      if (id === 'apuFire' && !o[id]) S.sys.apu.fireShut = false;
      break;
  }
  uiRefresh(true);
}
function momentary(id) {
  if (id === 'fireTest') { S.fireTestT = S.t + 3; showMsg('Test feu : voyants FIRE allumés 3 s', 'info', 3); }
  else if (id === 'cargoSmk') showMsg('Test fumée soute : détecteurs OK', 'info', 3);
  else if (id === 'evacHorn') showMsg('Klaxon d\'évacuation coupé', 'info', 2);
  else showMsg('Appel cabine envoyé', 'info', 2);
}
function faultOf(id) {
  const o = S.ovh, E = S.eng;
  const genIdx = { gen1a: [0, 'a'], gen1b: [0, 'b'], gen2a: [1, 'a'], gen2b: [1, 'b'] }[id];
  if (genIdx) { const [i, k] = genIdx; if (o[id] && S.ctl.engMaster[i] && !S.sys.elec.gen[i][k] && !E[i].fireShut) return ['FAULT', 'a']; if (id === 'gen1a' && S.fail.gen1a && o.gen1a) return ['FAULT', 'a']; }
  if (/^ir[123]$/.test(id)) { const v = S.sys.adirs[+id[2] - 1]; if (v > 0 && v < 1) return ['ALIGN', 'w']; }
  if (id === 'eng1PA' || id === 'eng1PB') if (E[0].st === 'run' && S.sys.hyd.G < 2500 && o[id]) return ['FAULT', 'a'];
  if (id === 'eng2PA' || id === 'eng2PB') if (E[1].st === 'run' && S.sys.hyd.Y < 2500 && o[id]) return ['FAULT', 'a'];
  if (id === 'apuMaster' && S.sys.apu.fire) return ['FAULT', 'a'];
  if ((id === 'lp1' || id === 'lp2') && S.ac.fuel.L < 50 && o[id]) return ['FAULT', 'a'];
  if ((id === 'rp1' || id === 'rp2') && S.ac.fuel.R < 50 && o[id]) return ['FAULT', 'a'];
  if ((id === 'ctrL' || id === 'ctrR') && S.ac.fuel.C < 50 && o[id] && S.sys.elec.ac) return ['FAULT', 'a'];
  return null;
}
function legends(it) {
  const o = S.ovh, v = o[it.id]; let u = null, d = null;
  switch (it.t) {
    case 'pb':
      if (it.norm) { if (!v) d = [it.offL || 'OFF', 'w']; }
      else if (v) d = [it.on || 'ON', it.on === 'ALTN' ? 'w' : 'b'];
      u = faultOf(it.id); break;
    case 'ext': if (S.sys.elec.extAvail && !v) u = ['AVAIL', 'g']; if (v && S.sys.elec.extAvail) d = ['ON', 'b']; break;
    case 'apustart': if (S.sys.apu.avail) u = ['AVAIL', 'g']; if (S.sys.apu.starting || v) d = ['ON', 'b']; break;
    case 'agent': {
      const armed = it.eng === 'apu' ? o.apuFire : o[it.eng === 0 ? 'eng1Fire' : 'eng2Fire'];
      const dis = it.eng === 'apu' ? S.sys.apu.ag : S.eng[it.eng]['ag' + it.n];
      if (armed && !dis) u = ['SQUIB', 'w']; if (dis) d = ['DISCH', 'a']; break;
    }
    case 'guard':
      if (it.fire !== undefined) { const f = it.fire === 'apu' ? S.sys.apu.fire : S.eng[it.fire].fire; if (f || S.fireTestT > S.t) u = ['FIRE', 'r']; }
      else if (v) { if (it.id === 'evacCmd') u = ['EVAC', 'r']; d = [legendDefaults(it)[1], it.id === 'paxOxy' ? 'w' : 'b']; }
      break;
  }
  return [u, d];
}
function refreshOvhd(force) {
  const dc = S.sys.elec.dc, test = S.ovh.annLt === 0 && dc;
  for (const id in OVH_ITEMS) {
    const it = OVH_ITEMS[id], w = $('ctl-' + id); if (!w) continue;
    let key;
    if (['pb', 'ext', 'apustart', 'agent', 'guard'].includes(it.t)) {
      let [u, d] = dc ? legends(it) : [null, null];
      const def = legendDefaults(it);
      if (test) { u = def[0] ? [def[0], it.fire !== undefined ? 'r' : 'a'] : null; d = def[1] ? [def[1], 'w'] : null; }
      key = JSON.stringify([u, d, UIC.covers[id], S.ovh[id]]);
      if (!force && UIC.cache[id] === key) continue; UIC.cache[id] = key;
      const sp = w.querySelectorAll('.lt');
      sp[0].textContent = u ? u[0] : def[0]; sp[0].className = 'lt u' + (u ? ' ' + u[1] : '');
      sp[1].textContent = d ? d[0] : def[1]; sp[1].className = 'lt d' + (d ? ' ' + d[1] : '');
      const pb = w.querySelector('.pb'); if (pb && it.fire !== undefined) pb.classList.toggle('lit', !!(u && u[1] === 'r'));
      const cv = w.querySelector('.cover'); if (cv) cv.classList.toggle('open', !!UIC.covers[id]);
    } else if (it.t === 'sel') {
      key = String(S.ovh[id]); if (!force && UIC.cache[id] === key) continue; UIC.cache[id] = key;
      const n = it.pos.length, ang = (S.ovh[id] - (n - 1) / 2) * 50;
      w.querySelector('.knob').style.transform = `rotate(${ang}deg)`; w.querySelector('.pos').textContent = it.pos[S.ovh[id]];
    } else if (it.t === 'tog') {
      key = String(S.ovh[id]); if (!force && UIC.cache[id] === key) continue; UIC.cache[id] = key;
      w.querySelectorAll('.tog button').forEach((b, i) => b.classList.toggle('cur', i === S.ovh[id]));
    } else if (it.t === 'knob') {
      key = String(S.ovh[id]); if (!force && UIC.cache[id] === key) continue; UIC.cache[id] = key;
      w.querySelector('.disp').textContent = it.auto && S.ovh[id] <= it.min ? 'AUTO' : id === 'ldgElev' ? S.ovh[id] + 'k' : String(S.ovh[id]);
    }
  }
}

/* ---------------- ACTIONS (glareshield, panneau principal, pédestal) ---------------- */
const RANGES = [0.5, 1, 2, 5, 10, 20, 40, 80, 160, 320, 640], MODES = ['ROSE', 'ARC', 'PLAN'];
const TLA_DET = [-20, 0, TLA_CL, TLA_FLX, TLA_TOGA];
function act(a, ev) {
  const F = S.fcu, E = S.efis, c = S.ctl, G = S.fg, big = ev && ev.shiftKey;
  switch (a) {
    case 'baro-': E.qnh--; break; case 'baro+': E.qnh++; break; case 'std': E.baroStd = !E.baroStd; break;
    case 'fd': E.fd = !E.fd; break; case 'terr': E.terr = !E.terr; break; case 'ls': E.ls = !E.ls; break;
    case 'mode-': E.mode = MODES[Math.max(0, MODES.indexOf(E.mode) - 1)]; break;
    case 'mode+': E.mode = MODES[Math.min(2, MODES.indexOf(E.mode) + 1)]; break;
    case 'rng-': E.range = RANGES[Math.max(0, RANGES.indexOf(E.range) - 1)]; break;
    case 'rng+': E.range = RANGES[Math.min(RANGES.length - 1, RANGES.indexOf(E.range) + 1)]; break;
    case 'master': masterAck(); break;
    case 'spdmach': F.machMode = !F.machMode; if (F.machMode) F.mach = Math.round(machNow() * 100) / 100 || 0.78; else F.spd = Math.round(ias()); break;
    case 'spd-': case 'spd+': {
      const s = a === 'spd+' ? 1 : -1;
      if (F.machMode) F.mach = clamp(Math.round((F.mach + s * 0.01) * 100) / 100, 0.1, 0.89);
      else { if (F.spdMan) F.spdPre = (F.spdPre ?? Math.round(ias())) + s * (big ? 10 : 1); else F.spd = clamp(F.spd + s * (big ? 10 : 1), 100, 399); }
      break;
    }
    case 'spdpush': F.spdMan = true; F.spdPre = null; break;
    case 'spdpull': F.spdMan = false; if (!F.machMode) F.spd = clamp(F.spdPre ?? Math.round(G.spd ? G.spd.ktEq : ias()), 100, 399); F.spdPre = null; break;
    case 'hdg-': case 'hdg+': {
      const s = (a === 'hdg+' ? 1 : -1) * (big ? 10 : 1);
      if (F.hdgMan) F.hdgPre = wrap360((F.hdgPre ?? Math.round(S.ac.psi * R2D)) + s); else F.hdg = wrap360(F.hdg + s);
      break;
    }
    case 'hdgpush': F.hdgMan = true; F.hdgPre = null; if (S.ac.onGround) G.latArm = 'NAV'; else G.lat = 'NAV'; break;
    case 'hdgpull': F.hdgMan = false; F.hdg = Math.round(F.hdgPre ?? S.ac.psi * R2D); F.hdgPre = null; if (!S.ac.onGround) { G.lat = 'HDG'; } if (G.latArm === 'NAV') G.latArm = ''; break;
    case 'alt-': F.alt = clamp(F.alt - F.altInc, 100, 43000); break;
    case 'alt+': F.alt = clamp(F.alt + F.altInc, 100, 43000); break;
    case 'altinc': F.altInc = F.altInc === 1000 ? 100 : 1000; break;
    case 'altpush': fcuAltPush(false); break;
    case 'altpull': fcuAltPush(true); break;
    case 'vs-': case 'vs+': F.vs = clamp(F.vs + (a === 'vs+' ? 100 : -100) * (big ? 5 : 1), -6000, 6000); break;
    case 'vspush': if (!S.ac.onGround) { F.vs = 0; G.vert = 'V/S'; } break;
    case 'vspull': if (!S.ac.onGround) { if (G.vert !== 'V/S') F.vs = Math.round(S.ac.vs / FT * 60 / 100) * 100; G.vert = 'V/S'; } break;
    case 'loc': F.loc = !F.loc; if (!F.loc) { if (G.latArm === 'LOC') G.latArm = ''; } F.appr = false; break;
    case 'appr': F.appr = !F.appr; if (!F.appr) { if (G.latArm === 'LOC') G.latArm = ''; if (G.vertArm === 'G/S') G.vertArm = ''; } else if (!S.efis.ls) showMsg('APPR armé : pense à appuyer sur LS pour voir les écarts ILS', 'info'); break;
    case 'ap1': apEngage(1); break; case 'ap2': apEngage(2); break;
    case 'athr': F.athr = !F.athr; G.togaLk = false; break;
    case 'exped': F.exped = !F.exped; if (F.exped && !S.ac.onGround) fcuAltPush(true); break;
    case 'gear':
      if (S.ac.onGround && c.gearDown) { showMsg('Train verrouillé : impossible de le rentrer au sol', 'warn'); break; }
      c.gearDown = !c.gearDown; break;
    case 'nws': UIC.nws = !UIC.nws; break; case 'brkfan': UIC.brkfan = !UIC.brkfan; break;
    case 'tla-toga': c.tla = [TLA_TOGA, TLA_TOGA]; break;
    case 'tla-flx': c.tla = [TLA_FLX, TLA_FLX]; break;
    case 'tla-cl': c.tla = [TLA_CL, TLA_CL]; break;
    case 'tla-idle': c.tla = [0, 0]; break;
    case 'tla-rev': if (S.ac.onGround) c.tla = [-20, -20]; else showMsg('Inverseurs : uniquement au sol', 'warn'); break;
    case 'athrdisc': F.athr = false; G.togaLk = false; break;
    case 'taxi-auto': taxiToggleAuto(); break;
    case 'tla-fine+': c.tla = c.tla.map(v => clamp(v + 0.5, 0, TLA_TOGA)); break;
    case 'tla-fine-': c.tla = c.tla.map(v => clamp(v - 0.5, 0, TLA_TOGA)); break;
    case 'tla-up': stepTla(1); break;
    case 'tla-dn': stepTla(-1); break;
    case 'flap+': c.flapsLever = Math.min(4, c.flapsLever + 1); break;
    case 'flap-': c.flapsLever = Math.max(0, c.flapsLever - 1); break;
    case 'tb-rev': if (S.ac.onGround) c.tla = c.tla[0] < 0 ? [0, 0] : [-20, -20]; break;
    case 'master1': c.engMaster[0] = !c.engMaster[0]; break;
    case 'master2': c.engMaster[1] = !c.engMaster[1]; break;
    case 'mode-l': c.engMode = Math.max(0, c.engMode - 1); break;
    case 'mode-r': c.engMode = Math.min(2, c.engMode + 1); break;
    case 'park': c.park = !c.park; break;
    case 'rud-': c.rudTrim = clamp(c.rudTrim - 0.5, -20, 20); break; case 'rud+': c.rudTrim = clamp(c.rudTrim + 0.5, -20, 20); break; case 'rud0': c.rudTrim = 0; break;
    case 'swap': UIC.vhf.reverse(); break;
    case 'vhf-': UIC.vhf[1] = Math.max(118, +(UIC.vhf[1] - 0.025).toFixed(3)); break;
    case 'vhf+': UIC.vhf[1] = Math.min(136.975, +(UIC.vhf[1] + 0.025).toFixed(3)); break;
    case 'sq': { const codes = ['2000', '1000', '7000', '3426', '4521']; UIC.xpdr.code = codes[(codes.indexOf(UIC.xpdr.code) + 1) % codes.length]; break; }
    case 'xpdr': UIC.xpdr.mode = (UIC.xpdr.mode + 1) % 3; break;
    case 'ident': showMsg('IDENT transmis', 'info', 2); break;
    case 'wxr': UIC.wxr = !UIC.wxr; break;
    case 'gpu': if (S.ac.onGround && S.ac.V < 0.5) { S.sys.gpu = !S.sys.gpu; showMsg(S.sys.gpu ? 'Groupe de parc branché' : 'Groupe de parc débranché', 'info', 3); } break;
    case 'doors': if (S.ac.onGround && S.ac.V < 0.5) { if (S.ovh.beacon === 0) { showMsg('Portes : éteindre d\'abord le BEACON', 'warn'); break; } const op = !S.sys.doors.pax; S.sys.doors.pax = op; S.sys.doors.cargo = op; } break;
  }
  uiRefresh(true);
}

/* boutons construits dynamiquement */
function buildDyn() {
  const ab = $('abBtns'); ab.innerHTML = '';
  [['RTO', 1], ['LO', 2], ['2', 3], ['3', 4], ['HI', 5], ['DISARM', 0]].forEach(([l, v]) => { const b = el('button', 'pbg', '<i></i>' + l); b.dataset.ab = v; b.onclick = () => { S.ctl.autobrk = v; uiRefresh(true); }; ab.appendChild(b); });
  const ecp = $('ecpBtns'); ecp.innerHTML = '';
  ['ENG', 'BLEED', 'PRESS', 'ELEC', 'HYD', 'FUEL', 'APU', 'COND', 'DOOR', 'WHEEL', 'F/CTL', 'ALL', 'CLR', 'STS', 'RCL', 'T.O CONFIG', 'EMER CANC'].forEach(p => {
    const b = el('button', 'k', p); b.dataset.page = p;
    b.onclick = () => {
      if (p === 'CLR') ecamClear();
      else if (p === 'RCL') { S.ecam.ack = {}; }
      else if (p === 'EMER CANC') masterAck();
      else if (p === 'STS') showMsg('STATUS : ' + (S.ecam.alerts.length ? S.ecam.alerts.map(z => z.title).join(' · ') : 'aucune limitation'), 'info', 6);
      else if (p === 'T.O CONFIG') { S.ecam.toTest = 6; UIC.toTested = true; }
      else if (p === 'ALL') { const L = Object.keys(SD_PAGES); S.ecam.page = L[(L.indexOf(S.ecam.page) + 1) % L.length]; S.ecam.autoPage = false; }
      else { if (S.ecam.page === p && !S.ecam.autoPage) S.ecam.autoPage = true; else { S.ecam.page = p; S.ecam.autoPage = false; } }
      uiRefresh(true);
    };
    ecp.appendChild(b);
  });
  const sb = $('spdbrkSteps'); sb.innerHTML = '';
  [['FULL', 1], ['1/2', 0.5], ['RET', 0], ['ARM', -1]].forEach(([l, v]) => { const b = el('button', '', l); b.dataset.v = v; b.onclick = () => { if (v === -1) { S.ctl.spdArmed = !S.ctl.spdArmed; S.ctl.spd = 0; } else { S.ctl.spd = v; if (v > 0) S.ctl.spdArmed = false; } uiRefresh(true); }; sb.appendChild(b); });
  const fl = $('flapSteps'); fl.innerHTML = '';
  [['0', 0], ['1', 1], ['2', 2], ['3', 3], ['FULL', 4]].forEach(([l, v]) => { const b = el('button', '', l); b.dataset.v = v; b.onclick = () => { S.ctl.flapsLever = v; uiRefresh(true); }; fl.appendChild(b); });
  // crans des manettes
  const det = document.querySelector('.detents'); det.style.position = 'relative'; det.style.width = '48px';
  det.querySelectorAll('span').forEach((s, i) => { s.style.position = 'absolute'; s.style.right = '0'; s.style.top = (tlaToY([TLA_TOGA, TLA_FLX, TLA_CL, 0, -20][i]) - 6) + 'px'; s.style.margin = '0'; });
}
function tlaToY(t) { const P = [[45, 14], [35, 66], [25, 118], [0, 186], [-20, 228]]; for (let i = 0; i < P.length - 1; i++) { const [a1, y1] = P[i], [a2, y2] = P[i + 1]; if (t <= a1 && t >= a2) return y1 + (t - a1) / (a2 - a1) * (y2 - y1); } return t > 45 ? 14 : 228; }
function yToTla(y) { const P = [[45, 14], [35, 66], [25, 118], [0, 186], [-20, 228]]; if (y <= 14) return 45; if (y >= 228) return -20; for (let i = 0; i < P.length - 1; i++) { const [a1, y1] = P[i], [a2, y2] = P[i + 1]; if (y >= y1 && y <= y2) return a1 + (y - y1) / (y2 - y1) * (a2 - a1); } return 0; }

/* Temps restant prévu (h) pour une distance restante, avec les vitesses planifiées :
   croisière Mach 0,85 au FL370 ≈ 488 kt, descente et approche ≈ 300 kt de moyenne sur les 130 derniers NM,
   + 20 min de roulage et de montée tant que l'avion n'a pas décollé. Pas de vent simulé. */
const CRZ_TAS = 488;
function eteHours(remM) {
  const rem = remM / NM;
  let h = Math.max(0, rem - 130) / CRZ_TAS + Math.min(rem, 130) / 300;
  if (!S.tookOff) h += 0.33;
  if (S.ac.onGround && S.tookOff) h = 0;
  return h;
}
const hhmm = h => Math.floor(h) + ' h ' + String(Math.round((h % 1) * 60) % 60).padStart(2, '0');
/* ---------------- FMS / MFD ---------------- */
const MFD_PAGES = ['INIT', 'FUEL&LOAD', 'PERF', 'F-PLN', 'POSITION'];
function buildMfdTabs() {
  const t = $('mfdTabs'); t.innerHTML = '';
  MFD_PAGES.forEach(p => { const b = el('button', '', p); b.id = 'mfdtab-' + p.replace(/\W/g, ''); b.onclick = () => { UIC.mfdPage = p; renderMfd(); }; t.appendChild(b); });
}
function fmt(n, d) { return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
function renderMfd() {
  const f = S.fms, b = $('mfdBody');
  document.querySelectorAll('#mfdTabs button').forEach(x => x.classList.toggle('on', x.textContent === UIC.mfdPage));
  const from = AIRPORTS[f.from], to = AIRPORTS[f.to];
  const onGnd = S.ac.onGround && !S.tookOff;
  if (UIC.mfdPage === 'INIT') {
    const rwOpt = (icao, cur) => Object.keys(AIRPORTS[icao].rwys).map(r => `<option ${r === cur ? 'selected' : ''}>${r}</option>`).join('');
    b.innerHTML = `<h4>ACTIVE / INIT</h4>
    <div class="mf-grid">
      <span class="l">CO RTE</span><span class="v">${f.from}${f.to}01</span>
      <span class="l">FLT NBR</span><input id="mfFlt" value="${f.fltNbr}" maxlength="8">
      <span class="l">FROM</span><span class="v">${f.from} · ${from.name}</span>
      <span class="l">TO</span><span class="v">${f.to} · ${to.name}</span>
      <span class="l">DEP RWY</span><select id="mfDep" ${onGnd ? '' : 'disabled'}>${rwOpt(f.from, f.depRwy)}</select>
      <span class="l">ARR RWY</span><select id="mfArr">${rwOpt(f.to, f.arrRwy)}</select>
      <span class="l">ALTN</span><span class="v">${f.altn}</span>
      <span class="l">CRZ FL</span><input id="mfCrz" type="number" min="290" max="430" step="10" value="${f.crzFL}" class="${f.initDone ? '' : 'req'}">
      <span class="l">CI</span><input id="mfCi" type="number" min="0" max="999" value="${f.ci}">
      <span class="l">TROPO</span><span class="v">36 090 FT</span>
    </div>
    <div class="mf-act"><button class="mf-btn ${f.initDone ? '' : 'amber'}" data-mf="init">INSERT</button>
      <span class="mf-ok">${f.initDone ? 'Route active : ' + fmt(f.totalDist / NM) + ' NM · ' + f.wpts.length + ' points' : ''}</span></div>
    <p class="mf-note">La route suit l'orthodromie (le plus court chemin sur la sphère) entre la sortie de piste et l'approche finale, avec un point tous les 420 NM environ. Pour changer de vol, utilise le menu « Vol » en haut puis « Charger ».</p>`;
  } else if (UIC.mfdPage === 'FUEL&LOAD') {
    const fp = fuelPlan(f), tow = f.zfw * 1000 + f.block * 1000 - fp.taxi, lw = tow - fp.trip;
    const extra = f.block * 1000 - fp.minBlock, tripH = Math.max(0, f.totalDist / NM - 130) / CRZ_TAS + 130 / 300 + 0.33;
    b.innerHTML = `<h4>ACTIVE / FUEL&amp;LOAD</h4>
    <div class="mf-grid">
      <span class="l">ZFW (T)</span><input id="mfZfw" type="number" step="0.1" min="150" max="195.7" value="${f.zfw.toFixed(1)}">
      <span class="l">ZFWCG (%)</span><input id="mfZfwcg" type="number" step="0.1" value="${f.zfwcg.toFixed(1)}">
      <span class="l">BLOCK (T)</span><input id="mfBlock" type="number" step="0.1" min="10" max="110.5" value="${f.block.toFixed(1)}" class="${f.fuelDone ? '' : 'req'}">
      <span class="l">TAXI</span><span class="v">${fmt(fp.taxi)} KG</span>
      <span class="l">TRIP</span><span class="v">${fmt(fp.trip)} KG · ${Math.floor(tripH)} h ${String(Math.round(tripH % 1 * 60)).padStart(2, '0')}</span>
      <span class="l">RTE RSV 5 %</span><span class="v">${fmt(fp.rsv)} KG</span>
      <span class="l">ALTN ${f.altn}</span><span class="v">${fmt(fp.altn)} KG</span>
      <span class="l">FINAL 30 MN</span><span class="v">${fmt(fp.fin)} KG</span>
      <span class="l">EXTRA</span><span class="${extra < 0 ? 'c' : 'v'}" style="${extra < 0 ? 'color:var(--amber)' : ''}">${fmt(extra)} KG</span>
      <span class="l">TOW</span><span class="v" style="${tow > AC.mtow ? 'color:var(--amber)' : ''}">${fmt(tow)} KG</span>
      <span class="l">LW</span><span class="v" style="${lw > AC.mlw ? 'color:var(--amber)' : ''}">${fmt(lw)} KG</span>
      <span class="l">FOB ACTUEL</span><span class="v">${fmt(fob())} KG</span>
    </div>
    <div class="mf-act"><button class="mf-btn" data-mf="minblock">BLOC MINI + 2 T</button><button class="mf-btn ${f.fuelDone ? '' : 'amber'}" data-mf="fuel">CHARGER LE CARBURANT</button>
      <span class="mf-ok">${f.fuelDone ? 'Carburant chargé' : ''}</span></div>
    <p class="mf-note">Masse maximale au décollage : 283 t. À l'atterrissage : 207 t. Le carburant se charge au sol, moteurs arrêtés ou au ralenti.</p>`;
  } else if (UIC.mfdPage === 'PERF') {
    b.innerHTML = `<h4>ACTIVE / PERF</h4>
    <div class="mf-grid">
      <span class="l">T.O RWY</span><span class="v">${f.from} ${f.depRwy}</span>
      <span class="l">T.O CONF</span><select id="mfConf"><option value="1" ${f.toConf === 1 ? 'selected' : ''}>1+F</option><option value="2" ${f.toConf === 2 ? 'selected' : ''}>2</option><option value="3" ${f.toConf === 3 ? 'selected' : ''}>3</option></select>
      <span class="l">FLEX TO TEMP</span><input id="mfFlex" type="number" min="0" max="70" value="${f.flex}">
      <span class="l">THR RED / ACC</span><input id="mfThrRed" type="number" step="100" min="800" max="5000" value="${f.thrRed}">
      <span class="l">V1</span><span class="${f.perfDone ? 'c' : 'v'}">${f.perfDone ? f.v1 + ' KT' : '---'}</span>
      <span class="l">VR</span><span class="${f.perfDone ? 'c' : 'v'}">${f.perfDone ? f.vr + ' KT' : '---'}</span>
      <span class="l">V2</span><span class="${f.perfDone ? 'c' : 'v'}">${f.perfDone ? f.v2 + ' KT' : '---'}</span>
      <span class="l">TRANS ALT</span><input id="mfTrans" type="number" step="1000" value="${f.transAlt}">
      <span class="l">LDG CONF</span><select id="mfLdg"><option value="4" ${f.ldgConf === 4 ? 'selected' : ''}>FULL</option><option value="3" ${f.ldgConf === 3 ? 'selected' : ''}>3</option></select>
      <span class="l">VAPP / VLS</span><span class="c">${f.vapp} / ${f.vls || '--'} KT</span>
      <span class="l">DH (CAT 3)</span><input id="mfDh" type="number" min="0" max="500" value="${f.dh}">
      <span class="l">TOW / LW</span><span class="v">${fmt(f.tow || 0)} / ${fmt(f.lw || 0)} KG</span>
    </div>
    <div class="mf-act"><button class="mf-btn ${f.perfDone ? '' : 'amber'}" data-mf="perf">CALCULER ET INSÉRER</button><span class="mf-ok">${f.perfDone ? 'Vitesses insérées sur le PFD' : ''}</span></div>
    <p class="mf-note">V1 : vitesse de décision · VR : rotation · V2 : vitesse de sécurité au décollage. Elles dépendent de la masse et de la configuration des volets. FLEX : poussée réduite calculée pour une température fictive, ce qui ménage les moteurs.</p>`;
  } else if (UIC.mfdPage === 'F-PLN') {
    b.innerHTML = `<h4>ACTIVE / F-PLN · ${f.from} → ${f.to}</h4><div class="fpln-wrap"><table class="fpln"><thead><tr><th>POINT</th><th>TRK</th><th>DIST</th><th>RESTE</th><th>ALT</th><th>EFOB T</th><th>UTC</th><th></th></tr></thead><tbody id="fplnBody"></tbody></table></div>`;
    fillFpln();
  } else if (UIC.mfdPage === 'POSITION') {
    b.innerHTML = '<h4>POSITION / MONITOR</h4><div class="mf-grid" id="posGrid"></div>';
    fillPos();
  }
}
function fpEta(i) {
  const f = S.fms, W = f.wpts, n = S.nav; if (!n) return { d: 0 };
  let d;
  if (i < n.i) return null;
  d = n.dist; for (let k = n.i + 1; k <= i; k++) d += W[k].leg;
  const gs = Math.max(S.ac.V * Math.cos(S.ac.gam), S.ac.onGround ? 0 : 1) / KT;
  const t = eteHours(n.rem) - eteHours(Math.max(0, n.rem - d));   // temps prévu jusqu'à ce point
  return { d, eta: simUtc() + Math.max(0, t) * 3600e3, efob: fob() - d / NM * 12.6 };
}
function fillFpln() {
  const tb = $('fplnBody'); if (!tb) return;
  const f = S.fms, W = f.wpts, crz = 'FL' + f.crzFL;
  let rows = '';
  W.forEach((w, i) => {
    const e = fpEta(i), past = i < f.active, act = i === f.active;
    rows += `<tr class="${act ? 'act' : past ? 'past' : ''}"><td>${w.id}</td><td>${i ? pad3(w.trk) + '°' : ''}</td><td>${i ? fmt(w.leg / NM) : ''}</td><td>${e ? fmt(e.d / NM) : ''}</td><td class="${w.alt ? 'm' : ''}">${w.alt ? (w.rwy ? w.alt : (w.cst === 'B' ? '≤' : '') + w.alt) : (past ? '' : crz)}</td><td>${e ? (e.efob / 1000).toFixed(1) : ''}</td><td>${e ? utcStr(e.eta) : ''}</td><td>${!past && !act && i > 0 && !S.ac.onGround ? `<button class="mf-btn" data-mf="dir" data-i="${i}">DIR</button>` : ''}</td></tr>`;
  });
  tb.innerHTML = rows;
}
function fillPos() {
  const g = $('posGrid'); if (!g) return;
  const a = S.ac, n = S.nav, f = S.fms;
  const ll = (v, p, q) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? p : q}`;
  const e = n ? fpEta(f.wpts.length - 1) : null;
  const opt = clamp(Math.round((310 + (AC.mtow - a.mass) / 1000 * 0.6) / 10) * 10, 290, 410);
  const ir = S.sys.adirs.map((v, i) => `IR${i + 1} ${v >= 1 ? 'NAV' : v > 0 ? 'ALIGN' : 'OFF'}`).join(' · ');
  g.innerHTML = `<span class="l">LAT</span><span class="v">${ll(a.lat, 'N', 'S')}</span><span class="l">LON</span><span class="v">${ll(a.lon, 'E', 'W')}</span>
    <span class="l">NAV</span><span class="v">GPS PRIMARY</span><span class="l">ADIRS</span><span class="v">${ir}</span>
    <span class="l">DEST ${f.to}</span><span class="v">${e ? fmt(e.d / NM) + ' NM' : '--'}</span><span class="l">ETA</span><span class="v">${e ? utcStr(e.eta) + ' UTC' : '--'}</span>
    <span class="l">EFOB DEST</span><span class="v">${e ? (e.efob / 1000).toFixed(1) + ' T' : '--'}</span><span class="l">GW</span><span class="v">${(a.mass / 1000).toFixed(1)} T</span>
    <span class="l">OPT FL</span><span class="v">FL${opt}</span><span class="l">REC MAX</span><span class="v">FL${Math.min(430, opt + 20)}</span>
    <span class="l">VENT</span><span class="v">calme (non simulé)</span><span class="l">PHASE</span><span class="v">${S.phase}</span>`;
}
function mfdAction(k, btn) {
  const f = S.fms, v = id => $(id) ? $(id).value : null, onGnd = S.ac.onGround && !S.tookOff;
  if (k === 'init') {
    f.fltNbr = (v('mfFlt') || f.fltNbr).toUpperCase();
    const crz = clamp(Math.round(+v('mfCrz') / 10) * 10 || 370, 290, 430);
    const dep = v('mfDep') || f.depRwy, arr = v('mfArr') || f.arrRwy;
    const changed = crz !== f.crzFL || dep !== f.depRwy || arr !== f.arrRwy || !f.wpts.length;
    f.crzFL = crz; f.ci = +v('mfCi') || 0;
    if (changed) {
      const act = f.active; f.depRwy = dep; f.arrRwy = arr; buildRoute(f);
      if (!onGnd) f.active = clamp(act, 1, f.wpts.length - 1);
      if (onGnd && dep !== S.fcu._lastDep) S.fcu.hdg = rwyGeom(f.from, dep).hdg;
    }
    f.initDone = true; perfCompute(f); showMsg('F-PLN inséré : ' + f.from + ' → ' + f.to + ', FL' + f.crzFL, 'ok', 4);
  } else if (k === 'minblock') { const fp = fuelPlan(f); f.block = Math.round((fp.minBlock + 2000) / 100) / 10; }
  else if (k === 'fuel') {
    f.zfw = clamp(+v('mfZfw') || f.zfw, 150, AC.mzfw / 1000); f.zfwcg = +v('mfZfwcg') || f.zfwcg;
    f.block = clamp(+v('mfBlock') || f.block, 10, AC.fuelMax / 1000);
    if (onGnd && S.ac.V < 0.5) {
      const kg = f.block * 1000, w = Math.min(kg / 2, AC.tankMax.L);
      S.ac.fuel = { L: w, R: w, C: Math.max(0, kg - 2 * w) }; updateMass(); f.fuelDone = true; perfCompute(f);
      showMsg('Carburant chargé : ' + fmt(kg) + ' kg', 'ok', 4);
    } else showMsg('Carburant : chargement possible uniquement au sol, avion arrêté', 'warn');
  } else if (k === 'perf') {
    f.toConf = +v('mfConf') || 1; f.flex = +v('mfFlex') || 0; f.thrRed = f.accAlt = +v('mfThrRed') || 1500;
    f.transAlt = +v('mfTrans') || 5000; f.ldgConf = +v('mfLdg') || 4; f.dh = +v('mfDh') || 0;
    perfCompute(f); f.perfDone = true; showMsg(`V1 ${f.v1} · VR ${f.vr} · V2 ${f.v2} kt insérées`, 'ok', 5);
  } else if (k === 'dir') { f.active = +btn.dataset.i; S.fcu.hdgMan = true; S.fg.lat = 'NAV'; showMsg('DIR TO ' + f.wpts[f.active].id, 'ok', 3); }
  renderMfd(); uiRefresh(true);
}

/* ---------------- GUIDE (check-list commentée) ---------------- */
const GROUPS = ['prep', 'start', 'taxi', 'to', 'clb', 'crz', 'des', 'app', 'after'];
const GROUP_LBL = { prep: 'PRÉPARATION', start: 'MISE EN ROUTE', taxi: 'ROULAGE', to: 'DÉCOLLAGE', clb: 'MONTÉE', crz: 'CROISIÈRE', des: 'DESCENTE', app: 'APPROCHE', after: 'APRÈS ATTERRISSAGE' };
const o_ = () => S.ovh;
const STEPS = [
  { g: 'prep', t: 'Batteries : BAT 1, BAT 2, BAT EMER 1 et BAT EMER 2 sur ON (le voyant OFF s\'éteint).', v: 'ovhd', e: 'ctl-bat1', ok: () => o_().bat1 && o_().bat2 && o_().batEmer1 && o_().batEmer2 },
  { g: 'prep', t: 'Groupe de parc : EXT A sur ON quand AVAIL est allumé. Les écrans s\'allument.', v: 'ovhd', e: 'ctl-extA', ok: () => S.sys.elec.ac },
  { g: 'prep', t: 'ADIRS : ADR 1-2-3 et IR 1-2-3 sur ON. Les centrales s\'alignent (≈ 2 min 30, accélérable).', v: 'ovhd', e: 'ctl-ir1', ok: () => [1, 2, 3].every(k => o_()['ir' + k] && o_()['adr' + k]) },
  { g: 'prep', t: 'Feux NAV & LOGO sur 1.', v: 'ovhd', e: 'ctl-navLogo', ok: () => o_().navLogo < 2 },
  { g: 'prep', t: 'APU : MASTER SW sur ON, puis START. Attendre AVAIL (≈ 40 s).', v: 'ovhd', e: 'ctl-apuMaster', ok: () => S.sys.apu.avail },
  { g: 'prep', t: 'APU BLEED sur ON : l\'APU fournit l\'air pour démarrer les moteurs.', v: 'ovhd', e: 'ctl-apuBleed', ok: () => o_().apuBleed },
  { g: 'prep', t: 'FMS, page INIT : vérifier le niveau de croisière puis INSERT.', v: 'ped', e: 'mfdtab-INIT', mfd: 'INIT', ok: () => S.fms.initDone },
  { g: 'prep', t: 'FMS, page FUEL&LOAD : CHARGER LE CARBURANT.', v: 'ped', e: 'mfdtab-FUELLOAD', mfd: 'FUEL&LOAD', ok: () => S.fms.fuelDone },
  { g: 'prep', t: 'FMS, page PERF : CALCULER ET INSÉRER les vitesses V1, VR, V2.', v: 'ped', e: 'mfdtab-PERF', mfd: 'PERF', ok: () => S.fms.perfDone },
  { g: 'prep', t: 'FCU : altitude autorisée 10 000 ft (ALT + / −).', v: 'main', e: 'fcuAlt', ok: () => S.fcu.alt >= 5000 },
  { g: 'prep', t: 'SIGNS : SEAT BELTS et NO SMOKING sur ON.', v: 'ovhd', e: 'ctl-seatBelts', ok: () => o_().seatBelts === 0 },
  { g: 'start', t: 'BEACON sur ON (les portes se ferment, roulage imminent).', v: 'ovhd', e: 'ctl-beacon', ok: () => o_().beacon === 0 },
  { g: 'start', t: 'ENG MODE sur IGN START.', v: 'ped', e: 'engModeDisp', ok: () => S.ctl.engMode === 2 || (S.eng[0].st === 'run' && S.eng[1].st === 'run') },
  { g: 'start', t: 'ENG MASTER 2 sur ON. Suivre N3, puis EGT sur l\'EWD jusqu\'à stabilisation (≈ 50 s).', v: 'ped', e: 'master2', ok: () => S.eng[1].st === 'run' },
  { g: 'start', t: 'ENG MASTER 1 sur ON.', v: 'ped', e: 'master1', ok: () => S.eng[0].st === 'run' },
  { g: 'start', t: 'ENG MODE sur NORM.', v: 'ped', e: 'engModeDisp', ok: () => S.ctl.engMode === 1 && S.eng.every(e => e.st === 'run') },
  { g: 'start', t: 'APU BLEED OFF puis APU MASTER OFF. EXT A OFF, groupe de parc débranché.', v: 'ovhd', e: 'ctl-apuBleed', ok: () => !o_().apuBleed && !o_().apuMaster && !o_().extA },
  { g: 'taxi', t: 'Volets sur 1 (1+F au décollage).', v: 'ped', e: 'flapSteps', ok: () => S.ctl.flapsLever >= 1 && S.ctl.flapsLever <= 3 },
  { g: 'taxi', t: 'SPEED BRAKE sur ARM (spoilers sol armés).', v: 'ped', e: 'spdbrkSteps', ok: () => S.ctl.spdArmed },
  { g: 'taxi', t: 'AUTO BRK sur RTO (freinage maximal si décollage interrompu).', v: 'main', e: 'abBtns', ok: () => S.ctl.autobrk === 1 },
  { g: 'taxi', t: 'NOSE sur TAXI, STROBE sur AUTO.', v: 'ovhd', e: 'ctl-nose', ok: () => o_().nose <= 1 && o_().strobe <= 1 },
  { g: 'taxi', t: 'T.O CONFIG sur l\'ECP : le mémo T.O doit être entièrement vert.', v: 'main', e: 'ecpBtns', ok: () => !!UIC.toTested },
  { g: 'taxi', t: 'Rouler jusqu\'à la piste en suivant le trait magenta du ND : « Roulage auto », ou à la main (PARK BRK OFF, « Gaz fin + », volant). 30 kt max, 10 kt en virage.', v: 'main', e: 'tbAutoTaxi', ok: () => onRunwayThr() },
  { g: 'to', t: 'PARK BRK sur OFF.', v: 'ped', e: 'parkBtn', ok: () => !S.ctl.park },
  { g: 'to', t: 'LAND sur ON, NOSE sur T.O, STROBE sur ON.', v: 'ovhd', e: 'ctl-land', ok: () => o_().land === 0 && o_().nose === 0 && o_().strobe === 0 },
  { g: 'to', t: 'Manettes sur FLX/MCT (touche Z deux fois). Le FMA affiche MAN FLX, SRS, RWY.', v: 'ped', e: 'thrTrack', ok: () => Math.max(...S.ctl.tla) >= TLA_FLX - 0.5 || S.tookOff },
  { g: 'to', t: 'À VR (point bleu sur la bande vitesse) : cabrer jusqu\'à ≈ 10° (flèche ↓, ou glisser le manche vers le BAS sur téléphone), puis suivre les barres FD.', v: 'main', e: 'stickPad', ok: () => S.tookOff },
  { g: 'to', t: 'Vario positif : rentrer le train (G).', v: 'main', e: 'gearLever', ok: () => !S.ctl.gearDown },
  { g: 'to', t: 'LVR CLB clignote : manettes sur CL (touche S). L\'A/THR devient actif.', v: 'ped', e: 'thrTrack', ok: () => !S.ac.onGround && Math.max(...S.ctl.tla) <= TLA_CL + 0.5 },
  { g: 'to', t: 'Engager AP 1 (touche A) au-dessus de 100 ft.', v: 'main', e: 'pbAP1', ok: () => S.fcu.ap1 || S.fcu.ap2 },
  { g: 'to', t: 'Rentrer les volets : 1 au repère F, 0 au repère S (touche V).', v: 'ped', e: 'flapSteps', ok: () => S.ctl.flapsLever === 0 },
  { g: 'clb', t: 'FCU : ALT au niveau de croisière (FL370), puis PUSH pour la montée gérée.', v: 'main', e: 'fcuAlt', ok: () => S.fcu.alt >= S.fms.crzFL * 100 - 50 },
  { g: 'clb', t: 'Altimètre sur STD au-dessus de l\'altitude de transition (5 000 ft).', v: 'main', e: 'baroDisp', ok: () => S.efis.baroStd },
  { g: 'clb', t: 'Au-dessus de 10 000 ft : LAND, NOSE et RWY TURN OFF sur OFF.', v: 'ovhd', e: 'ctl-land', ok: () => o_().land === 1 && o_().nose === 2 && o_().rwyTurn === 1 },
  { g: 'crz', t: 'Croisière : accélérer le temps avec « + » (jusqu\'à ×256 sous AP). Surveiller le carburant sur la page FUEL.', v: 'main', e: 'rateUp', ok: () => S.phase === 'CRUISE' && S.rate >= 16 || ['DESCENT', 'APPROACH', 'LANDED'].includes(S.phase) },
  { g: 'des', t: 'Avant T/D (sur le ND) : FCU ALT 3000 ft puis PUSH. L\'avion descend sur le profil géré (DES).', v: 'main', e: 'fcuAlt', ok: () => S.fcu.alt <= 4000 && (['DES', 'OP DES', 'ALT', 'ALT*', 'G/S', 'G/S*', 'LAND', 'FLARE', 'ROLL OUT'].includes(S.fg.vert)) },
  { g: 'des', t: 'Sous FL50 : altimètre sur QNH (bouton STD).', v: 'main', e: 'baroDisp', ok: () => !S.efis.baroStd },
  { g: 'app', t: 'LS sur l\'EFIS, puis APPR : LOC et G/S apparaissent en bleu (armés).', v: 'main', e: 'pbAPPR', ok: () => S.efis.ls && S.fcu.appr },
  { g: 'app', t: 'Engager AP 2 : CAT 3 DUAL pour l\'atterrissage automatique.', v: 'main', e: 'pbAP2', ok: () => S.fcu.ap1 && S.fcu.ap2 },
  { g: 'app', t: 'Volets 1 au repère vert (point), puis 2 au repère S (touche F).', v: 'ped', e: 'flapSteps', ok: () => S.ctl.flapsLever >= 2 },
  { g: 'app', t: 'Sortir le train (G).', v: 'main', e: 'gearLever', ok: () => S.ctl.gearDown },
  { g: 'app', t: 'Volets 3 puis FULL au repère F.', v: 'ped', e: 'flapSteps', ok: () => S.ctl.flapsLever >= (S.fms.ldgConf === 4 ? 4 : 3) },
  { g: 'app', t: 'SPEED BRAKE ARM, AUTO BRK sur 2 ou 3. Mémo LDG tout vert.', v: 'ped', e: 'spdbrkSteps', ok: () => S.ctl.spdArmed && S.ctl.autobrk >= 2 },
  { g: 'app', t: 'Annonce RETARD : manettes sur IDLE (touche S), puis inverseurs (R) après le toucher.', v: 'ped', e: 'thrTrack', ok: () => S.tookOff && S.ac.onGround },
  { g: 'after', t: 'Sous 70 kt : manettes IDLE, volets 0, SPEED BRAKE désarmé, STROBE sur AUTO.', v: 'ped', e: 'flapSteps', ok: () => S.ctl.flapsLever === 0 && !S.ctl.spdArmed && S.ac.V < 36 },
  { g: 'after', t: 'Dégager la piste et rouler jusqu\'au parking (trait magenta du ND) : « Roulage auto » ou volant et gaz fin.', v: 'main', e: 'tbAutoTaxi', ok: () => !!(S.taxi && S.taxi.mode === 'arr' && S.taxi.done) || (S.ac.onGround && S.tookOff && S.ac.V < 1 && S.ctl.park && gcDist(S.ac.lat, S.ac.lon, aptFrame(S.fms.to).ll(aptFrame(S.fms.to).len / 2, -420).lat, aptFrame(S.fms.to).ll(aptFrame(S.fms.to).len / 2, -420).lon) < 150) },
  { g: 'after', t: 'Au parking : PARK BRK ON, ENG MASTER 1 et 2 OFF, BEACON OFF. Vol terminé.', v: 'ped', e: 'parkBtn', ok: () => S.ctl.park && !S.ctl.engMaster[0] && !S.ctl.engMaster[1] && o_().beacon === 1 },
];
function onRunwayThr() {
  const r = rwyGeom(S.fms.from, S.fms.depRwy);
  const d = gcDist(S.ac.lat, S.ac.lon, r.thr.lat, r.thr.lon);
  return (d < 400 && Math.abs(wrap180(S.ac.psi * R2D - r.hdg)) < 20) || S.tookOff;
}
function guideReset(kind) {
  UIC.guideDone = new Set(); UIC.skip = new Set(); UIC.skip2 = new Set(); UIC.toTested = kind !== 'cold';
  const startG = { cold: 'prep', ready: 'to', cruise: 'crz', approach: 'app' }[kind];
  const gi = GROUPS.indexOf(startG);
  STEPS.forEach((s, i) => { if (GROUPS.indexOf(s.g) < gi) UIC.guideDone.add(i); });
}
/* Étape en cours.
   -1 : vol réellement terminé (avion arrêté à destination).
   -2 : plus rien à proposer pour l'instant, mais le vol continue. */
/* Groupe d'étapes correspondant à la phase réelle : les étapes d'une phase déjà dépassée ne sont plus proposées */
function phaseGroup() {
  const a = S.ac;
  if (a.onGround) return S.tookOff ? GROUPS.indexOf('after') : -1;
  return GROUPS.indexOf({ TAKEOFF: 'to', 'GO AROUND': 'app', CLIMB: 'clb', CRUISE: 'crz', DESCENT: 'des', APPROACH: 'app' }[S.phase] || 'to');
}
function stepMoot(i) {
  const pg = phaseGroup(), gi = GROUPS.indexOf(STEPS[i].g);
  if (pg === GROUPS.indexOf('after')) return gi < pg;          // au sol après l'atterrissage
  return pg >= 0 && gi < pg - 1;                                // en vol : on tolère un groupe de retard
}
function currentStep() {
  UIC.revisit = false;
  for (let i = 0; i < STEPS.length; i++) {
    if (UIC.guideDone.has(i) || UIC.skip.has(i) || stepMoot(i)) continue;
    if (STEPS[i].ok()) { UIC.guideDone.add(i); continue; }
    return i;
  }
  if (S.arrived) return -1;
  UIC.skip2 = UIC.skip2 || new Set();
  for (let i = 0; i < STEPS.length; i++) {          // étapes passées sans être faites : on les repropose
    if (!UIC.skip.has(i) || UIC.guideDone.has(i) || UIC.skip2.has(i) || stepMoot(i)) continue;
    if (STEPS[i].ok()) { UIC.guideDone.add(i); continue; }
    UIC.revisit = true; return i;
  }
  return -2;
}
const PHASE_FR = { PREFLIGHT: 'PRÉVOL', TAKEOFF: 'DÉCOLLAGE', CLIMB: 'MONTÉE', CRUISE: 'CROISIÈRE', DESCENT: 'DESCENTE', APPROACH: 'APPROCHE', 'GO AROUND': 'REMISE DES GAZ', LANDED: 'ATTERRI' };
function flightStatusText() {
  const n = S.nav, dest = AIRPORTS[S.fms.to];
  if (S.crash) return 'Accident : ' + S.crash + '. Appuie sur « Recommencer ce scénario ».';
  if (S.ac.onGround && S.tookOff) return 'Au sol, mais pas à l\'arrêt à ' + dest.name + '. Freine jusqu\'à l\'arrêt complet.';
  return 'Vol en cours vers ' + dest.name + (n ? ' : reste ' + fmt(n.rem / NM) + ' NM' : '') + '. Toutes les étapes ont été faites ou passées ; le vol n\'est terminé qu\'une fois arrêté à destination.';
}
function refreshGuide() {
  const i = currentStep();
  $('gReturn').hidden = i !== -1;
  if (i === -1) { $('gPhase').textContent = 'TERMINÉ'; $('gN').textContent = '✓'; $('gTxt').textContent = 'Vol terminé à ' + AIRPORTS[S.fms.to].name + '. Charge le trajet retour avec le menu « Vol ».'; $('gShow').hidden = true; $('gSkip').hidden = true; }
  else if (i === -2) {
    $('gPhase').textContent = PHASE_FR[S.phase] || S.phase; $('gN').textContent = '…';
    const t = flightStatusText(); if ($('gTxt').textContent !== t) $('gTxt').textContent = t;
    $('gShow').hidden = true; $('gSkip').hidden = !(UIC.skip2 && UIC.skip2.size); $('gSkip').textContent = 'Revoir les étapes passées';
  }
  else {
    const s = STEPS[i]; $('gPhase').textContent = GROUP_LBL[s.g]; $('gN').textContent = (i + 1) + '/' + STEPS.length + (UIC.revisit ? ' · passée' : ''); $('gSkip').textContent = 'Passer';
    if ($('gTxt').textContent !== s.t) $('gTxt').textContent = s.t;
    $('gShow').hidden = false; $('gSkip').hidden = false;
  }
  $('gRwy').hidden = !(S.ac.onGround && !S.tookOff && S.ac.V < 3 && !onRunwayThr());
  $('gRestart').hidden = !S.crash;
  // message
  const m = $('gMsg');
  if (S.msg && S.msgT > 0) { m.hidden = false; m.textContent = S.msg.t; m.className = 'g-msg' + (S.msg.kind === 'warn' ? ' warn' : ''); }
  else m.hidden = true;
}
function showStep() {
  const i = currentStep(); if (i < 0) return;
  const s = STEPS[i]; setView(s.v);
  if (s.mfd) { UIC.mfdPage = s.mfd; renderMfd(); }
  const t = $(s.e); if (!t) return;
  t.classList.remove('hl'); void t.offsetWidth; t.classList.add('hl');
  t.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  setTimeout(() => t.classList.remove('hl'), 4000);
}
function alignOnRunway() {
  const r = rwyGeom(S.fms.from, S.fms.depRwy);
  S.ac.lat = r.thr.lat; S.ac.lon = r.thr.lon; S.ac.psi = r.hdg * D2R; S.ac.V = 0; S.ctl.park = true;
  showMsg('Avion aligné au seuil de la piste ' + S.fms.depRwy + '. Frein de parking serré.', 'ok', 5);
}

/* ---------------- RAFRAÎCHISSEMENT DES PANNEAUX ---------------- */
function setPbg(id, on) { const b = $(id); if (b) b.classList.toggle('on', !!on); }
function uiRefresh(force) {
  const F = S.fcu, E = S.efis, c = S.ctl, G = S.fg, ac = S.sys.elec.ac;
  if (VIEW === 'ovhd' || force) refreshOvhd(force);
  // FCU / EFIS
  const lcd = (id, t) => { const e = $(id); const v = ac ? t : ''; if (e.textContent !== v) e.textContent = v; };
  lcd('baroDisp', E.baroStd ? 'STD' : 'QNH ' + E.qnh);
  lcd('ndModeDisp', E.mode); lcd('ndRngDisp', String(E.range));
  lcd('spdDisp', F.spdMan ? (F.spdPre != null ? String(F.spdPre) : '---•') : F.machMode ? '.' + String(Math.round(F.mach * 100)) : String(F.spd));
  lcd('hdgDisp', F.hdgMan ? (F.hdgPre != null ? pad3(F.hdgPre) : '---•') : pad3(F.hdg));
  lcd('altDisp', String(F.alt).padStart(5, '0') + ((G.vert === 'CLB' || G.vert === 'DES' || G.vertArm === 'CLB') ? '•' : ''));
  lcd('vsDisp', G.vert === 'V/S' ? (F.vs >= 0 ? '+' : '−') + String(Math.abs(F.vs)).padStart(4, '0') : '-----');
  $('altIncBtn').textContent = F.altInc;
  setPbg('pbFD', E.fd && ac); setPbg('pbTERR', E.terr && ac); setPbg('pbLS', E.ls && ac); setPbg('pbLOC', (F.loc || G.lat.startsWith('LOC')) && ac && !F.appr);
  setPbg('pbAP1', F.ap1); setPbg('pbAP2', F.ap2); setPbg('pbATHR', F.athr); setPbg('pbEXPED', F.exped); setPbg('pbAPPR', F.appr && ac);
  const mw = S.ecam.mw && flash(1.5), mc = S.ecam.mc;
  $('mwBtn').classList.toggle('on', mw); $('mcBtn').classList.toggle('on', mc);
  lcd('clockDisp', utcStr(simUtc()));
  const et = S.tookOff ? (S.t - (S.ac.airT || 0)) : 0; lcd('etDisp', 'ET ' + String(Math.floor(et / 3600)).padStart(2, '0') + ':' + String(Math.floor(et % 3600 / 60)).padStart(2, '0'));
  // train
  const g = S.sys.gear, glc = g > 0.99 ? 'dn' : g < 0.01 ? '' : 'tr';
  ['gl1', 'gl2', 'gl3'].forEach(i => $(i).className = ac || S.sys.elec.dc ? glc : '');
  $('gearLever').classList.toggle('up', !c.gearDown); $('gearLever').firstElementChild.textContent = c.gearDown ? 'DOWN' : 'UP';
  document.querySelectorAll('#abBtns .pbg').forEach(b => b.classList.toggle('on', +b.dataset.ab === c.autobrk && (c.autobrk !== 0)));
  setPbg('pbBtv', UIC.nws); setPbg('pbBrkFan', UIC.brkfan);
  document.querySelectorAll('#ecpBtns .k').forEach(b => b.classList.toggle('on', b.dataset.page === S.ecam.page && !S.ecam.autoPage));
  // pédestal
  $('thrLever').style.top = tlaToY((c.tla[0] + c.tla[1]) / 2) + 'px';
  $('master1').classList.toggle('on', c.engMaster[0]); $('master2').classList.toggle('on', c.engMaster[1]);
  $('engModeDisp').textContent = ['CRANK', 'NORM', 'IGN START'][c.engMode];
  [0, 1].forEach(i => { $('fireLt' + (i + 1)).classList.toggle('on', S.eng[i].fire || S.fireTestT > S.t); $('faultLt' + (i + 1)).classList.toggle('on', S.eng[i].st === 'start' && S.sys.duct[i] < 20); });
  document.querySelectorAll('#spdbrkSteps button').forEach(b => { const v = +b.dataset.v; b.classList.toggle('cur', v === -1 ? c.spdArmed : (!c.spdArmed || v !== 0) && Math.abs(c.spd - v) < 0.01 && !(v === 0 && c.spdArmed)); });
  document.querySelectorAll('#flapSteps button').forEach(b => { const v = +b.dataset.v; b.classList.toggle('cur', v === c.flapsLever); b.classList.toggle('tgt', v === c.flapsLever && Math.abs(S.sys.flaps - v) > 0.05); });
  $('parkBtn').classList.toggle('off', !c.park); $('parkBtn').firstElementChild.textContent = c.park ? 'ON' : 'OFF';
  $('rudDisp').textContent = (c.rudTrim >= 0 ? 'R ' : 'L ') + Math.abs(c.rudTrim).toFixed(1);
  $('vhfAct').textContent = UIC.vhf[0].toFixed(3); $('vhfStby').textContent = UIC.vhf[1].toFixed(3);
  $('xpdrDisp').textContent = UIC.xpdr.code; $('xpdrMode').textContent = ['STBY', 'AUTO', 'ON'][UIC.xpdr.mode];
  $('wxrDisp').textContent = UIC.wxr ? 'WX ON' : 'OFF';
  $('gpuBtn').textContent = S.sys.gpu ? 'GPU : branché' : 'GPU : débranché';
  $('doorsBtn').textContent = S.sys.doors.pax ? 'Portes : ouvertes' : 'Portes : fermées';
  // ligne d'état
  const n = S.nav, gs = S.ac.V * Math.cos(S.ac.gam) / KT;
  const ete = n ? eteHours(n.rem) : 0;
  const etaTxt = n && !(S.ac.onGround && S.tookOff) ? ' · reste <b>' + hhmm(ete) + '</b> · ETA <b>' + utcStr(simUtc() + ete * 3600e3) + '</b> UTC' : '';
  const st = `${S.phase} · ${S.fms.from}→${S.fms.to} · reste <b>${n ? fmt(n.rem / NM) : '--'}</b> NM${etaTxt} · ×${S.rate}${S.paused ? ' · PAUSE' : ''}`;
  if ($('statusLine').innerHTML !== st) $('statusLine').innerHTML = st;
  $('rateLbl').textContent = '×' + S.rate;
  $('btnPause').textContent = S.paused ? 'Reprendre' : 'Pause';
  // info
  const a = S.ac, sp = speeds();
  const rows = [['Vol', S.fms.fltNbr + ' · ' + S.fms.from + ' → ' + S.fms.to], ['Phase', S.phase], ['Vitesse', Math.round(ias()) + ' kt · M ' + machNow().toFixed(2)], ['Altitude', Math.round(a.alt / FT) + ' ft · ' + Math.round(a.vs / FT * 60) + ' ft/min'],
    ['Reste', n ? fmt(n.rem / NM) + ' NM · ' + hhmm(eteHours(n.rem)) : '--'], ['Durée prévue', hhmm(Math.max(0, S.fms.totalDist / NM - 130) / CRZ_TAS + 130 / 300 + 0.33)], ['En vol depuis', S.tookOff ? hhmm((S.t - (S.ac.airT || 0)) / 3600) : '--'], ['Carburant', fmt(fob()) + ' kg'], ['Masse', (a.mass / 1000).toFixed(1) + ' t'], ['VLS · VMAX', Math.round(sp.vls) + ' · ' + Math.round(Math.min(sp.vmax, 999)) + ' kt']];
  const ih = '<div class="ttl">DONNÉES DE VOL</div>' + rows.map(r => `<div class="r"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
  if ($('infoPanel').innerHTML !== ih) $('infoPanel').innerHTML = ih;
  // pages FMS dynamiques
  if (VIEW === 'ped' && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('.mfd'))) {
    if (UIC.mfdPage === 'F-PLN') fillFpln(); else if (UIC.mfdPage === 'POSITION') fillPos();
  }
  refreshGuide();
  if (!$('touchBar').hidden) {
    const gp = S.gpws && S.gpws.lvl;
    const rd = `<span><b>VIT</b> ${Math.round(ias())} kt</span><span><b>ALT</b> ${Math.round(S.ac.alt / FT)} ft</span><span><b>V/S</b> ${Math.round(S.ac.vs / FT * 60)}</span><span><b>ASSIETTE</b> ${(S.ac.theta * R2D).toFixed(1)}°</span><span><b>VR</b> ${S.fms.vr} kt</span>${gp ? `<span class="warn">${gp}</span>` : ''}${S.ac.onGround && S.taxi && !S.taxi.done ? `<span class="taxi">${taxiLine()}${S.taxi.auto ? ' · AUTO' : ''}</span>` : ''}`;
    if ($('tbRead').innerHTML !== rd) $('tbRead').innerHTML = rd;
    $('tbGear').classList.toggle('on', S.ctl.gearDown); $('tbAP').classList.toggle('on', S.fcu.ap1); $('tbAutoTaxi').classList.toggle('on', !!(S.taxi && S.taxi.auto));
  }
}

/* ---------------- VUES, ENTRÉES, BOUCLE ---------------- */
function setView(v) {
  VIEW = v;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.view === v));
  ['main', 'ovhd', 'ped', 'radio', 'log', 'calc'].forEach(k => $('v-' + k).hidden = k !== v);
  $('stageWrap').hidden = ['radio', 'log', 'calc'].includes(v);
  if (v === 'calc') { buildCalc(); calcRefresh(true); }
  if (v === 'log') { $('logBody').dataset.h = ''; renderLog(); }
  if (v === 'radio') { $('radioBody').dataset.h = ''; renderRadio(); }
  $('touchBar').hidden = v !== 'main';   // commandes de vol et de roulage : en vue pilote
  if (v === 'ped') renderMfd();
  uiRefresh(true);
}
const RATES = [1, 2, 4, 8, 16, 32, 64, 128, 256];
function changeRate(dir) {
  let i = RATES.indexOf(S.rate) + dir; i = clamp(i, 0, RATES.length - 1);
  const mr = maxRate();
  if (RATES[i] > mr) { showMsg(`Accélération limitée à ×${mr} ici. Jusqu'à ×256 en croisière, sous pilote automatique, au-dessus de 5 000 ft.`, 'warn', 5); i = RATES.indexOf(mr); }
  S.rate = RATES[i]; uiRefresh(true);
}
function stepTla(dir) {
  const c = S.ctl, cur = Math.max(...c.tla);
  let nt;
  if (dir > 0) nt = TLA_DET.find(d => d > cur + 0.5); else nt = [...TLA_DET].reverse().find(d => d < cur - 0.5);
  if (nt === undefined) return;
  if (nt < 0 && !S.ac.onGround) return;
  c.tla = [nt, nt];
}
function onKey(e, down) {
  const tg = e.target;
  if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'SELECT' || tg.tagName === 'TEXTAREA')) return;
  const k = e.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) { e.preventDefault(); keys[k] = down; return; }
  const lk = k.length === 1 ? k.toLowerCase() : k;
  if (lk === 'q' || lk === 'd') { keys[lk] = down; return; }
  if (!down || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const c = S.ctl;
  switch (lk) {
    case 'z': case 'w': if (e.shiftKey) act('tla-fine+'); else stepTla(1); break;
    case 's': if (e.shiftKey) act('tla-fine-'); else stepTla(-1); break;
    case 'k': taxiToggleAuto(); break;
    case 'r': if (S.ac.onGround) c.tla = c.tla[0] < 0 ? [0, 0] : [-20, -20]; break;
    case 'f': c.flapsLever = Math.min(4, c.flapsLever + 1); break;
    case 'v': c.flapsLever = Math.max(0, c.flapsLever - 1); break;
    case 'g': act('gear'); break;
    case 'e': if (e.shiftKey) { c.spdArmed = !c.spdArmed; c.spd = 0; } else { c.spd = c.spd >= 1 ? 0 : c.spd + 0.5; if (c.spd > 0) c.spdArmed = false; } break;
    case 'b': c.park = !c.park; break;
    case 'a': apEngage(1); break;
    case 'x': apDisconnect(false); break;
    case 't': S.fcu.athr = !S.fcu.athr; S.fg.togaLk = false; break;
    case 'p': S.paused = !S.paused; break;
    case '+': case '=': changeRate(1); break;
    case '-': case '_': changeRate(-1); break;
    case '1': setView('main'); break; case '2': setView('ovhd'); break; case '3': setView('ped'); break; case '4': setView('radio'); break; case '5': setView('log'); break; case '6': setView('calc'); break;
    case 'c': readback(true); break;
    default: return;
  }
  e.preventDefault(); uiRefresh(true);
}
function inputUpdate(dt) {
  const c = S.ctl;
  let tp = 0, tr = 0, ty = 0;
  if (keys.ArrowUp) tp -= 0.8; if (keys.ArrowDown) tp += 0.8;
  if (keys.ArrowLeft) tr -= 0.8; if (keys.ArrowRight) tr += 0.8;
  if (keys.q) ty -= 1; if (keys.d) ty += 1;
  if (UIC.stick.active) { tp = UIC.stick.y; tr = UIC.stick.x; }
  c.pitch = approach(c.pitch, tp, dt * 3); c.roll = approach(c.roll, tr, dt * 4); c.yaw = approach(c.yaw, ty, dt * 3);
  c.brake = keys[' '] ? 1 : 0;
  if (!(S.taxi && S.taxi.auto)) c.tiller = approach(c.tiller, UIC.tiller.active ? UIC.tiller.x : 0, dt * 5);
  const tk = $('tillerKnob'); if (tk) tk.style.left = (50 + c.tiller * 42) + '%';
  ['stickDot', 'stickDot2'].forEach(id => { const dot = $(id); dot.style.left = (50 + c.roll * 38) + '%'; dot.style.top = (50 + c.pitch * 38) + '%'; });
}
function bindStick(pad) {
  const mv = e => { const r = pad.getBoundingClientRect(); UIC.stick.x = clamp(((e.clientX - r.left) / r.width - 0.5) * 2.4, -1, 1); UIC.stick.y = clamp(((e.clientY - r.top) / r.height - 0.5) * 2.4, -1, 1); };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); pad.setPointerCapture(e.pointerId); UIC.stick.active = true; mv(e); });
  pad.addEventListener('pointermove', e => { if (UIC.stick.active) mv(e); });
  const up = () => { UIC.stick.active = false; UIC.stick.x = UIC.stick.y = 0; };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('lostpointercapture', up);
}
function bindTiller(el) {
  if (!el) return;
  const mv = e => { const r = el.getBoundingClientRect(); UIC.tiller.x = clamp(((e.clientX - r.left) / r.width - 0.5) * 2.2, -1, 1); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); UIC.tiller.active = true; mv(e); });
  el.addEventListener('pointermove', e => { if (UIC.tiller.active) mv(e); });
  const up = () => { UIC.tiller.active = false; UIC.tiller.x = 0; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}
function bindPointer() {
  bindStick($('stickPad')); bindStick($('stickPad2'));
  bindTiller($('tiller'));
  const br = $('tbBrake');
  br.addEventListener('pointerdown', e => { e.preventDefault(); keys[' '] = true; br.classList.add('on'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => br.addEventListener(ev, () => { keys[' '] = false; br.classList.remove('on'); }));
  const tr = $('thrTrack');
  const tm = e => { const r = tr.getBoundingClientRect(); const y = (e.clientY - r.top) / r.height * 244; let t = yToTla(y); for (const d of TLA_DET) if (Math.abs(t - d) < 2.5) t = d; if (t < 0 && !S.ac.onGround) t = 0; S.ctl.tla = [t, t]; uiRefresh(false); };
  let drag = false;
  tr.addEventListener('pointerdown', e => { tr.setPointerCapture(e.pointerId); drag = true; tm(e); });
  tr.addEventListener('pointermove', e => { if (drag) tm(e); });
  tr.addEventListener('pointerup', () => drag = false); tr.addEventListener('pointercancel', () => drag = false);
}
function fitStage() {
  const wrap = $('stageWrap'), w = wrap.clientWidth;
  let z = Math.min(1.5, w / 1280);
  const zoomIn = TUT.on && w < 900;              // en mode pédagogique sur téléphone : commandes plus grosses, défilement horizontal
  if (zoomIn) z = Math.max(z, 0.62);
  wrap.classList.toggle('scroll', zoomIn);
  document.querySelector('.app').classList.toggle('tut-on', TUT.on);
  $('stage').style.setProperty('--z', z.toFixed(4));
}

let lastT = performance.now(), acc = 0, uiT = 0;
function frame(now) {
  requestAnimationFrame(frame);          // planifiée d'abord : une erreur ne peut plus figer la simulation
  try { frameBody(now); } catch (e) { if (!frame.err) { frame.err = true; console.error(e); } }
}
function frameBody(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  inputUpdate(dt);
  if (!S.paused && !S.crash) {
    const mr = maxRate(); if (S.rate > mr) S.rate = mr;
    acc += dt * S.rate; let n = 0;
    while (acc >= DT && n < 900) { simStep(DT); acc -= DT; n++; }
    if (n >= 900) acc = 0;
  }
  if (S.msgT > 0) S.msgT -= dt;
  ecamUpdate();
  if (VIEW === 'main') {
    drawWindow($('cvWin'), 1280, 320);
    drawPFD($('cvPFD')); drawND($('cvND')); drawEWD($('cvEWD')); drawSD($('cvSD')); drawISIS($('cvISIS'));
  }
  uiT += dt; if (uiT > 0.12) { uiT = 0; uiRefresh(false); }
  tutorUpdate(dt); sndUpdate(dt); helpTrack();
  commsUpdate(); logUpdate(); renderRadioBar();
  frameBody.t2 = (frameBody.t2 || 0) + dt; if (frameBody.t2 > 1) { frameBody.t2 = 0; renderRadio(); renderLog(); calcRefresh(false); }
}

function loadFromMenus() {
  const r = $('routeSel').value, k = $('scenSel').value;
  loadScenario(k, r);
  guideReset(k); UIC.cache = {}; UIC.covers = {}; commsReset(k); logReset();
  if (k !== 'cold') UIC.toTested = true;
  S.paused = false; acc = 0;
  uiRefresh(true); if (VIEW === 'ped') renderMfd();
  showMsg(k === 'cold' ? 'Cockpit froid au poste de stationnement de ' + AIRPORTS[S.fms.from].name + '. Suis le guide.' :
    k === 'ready' ? 'Aligné piste ' + S.fms.depRwy + ' à ' + AIRPORTS[S.fms.from].name + '. Moteurs en marche, FMS prêt.' :
    k === 'cruise' ? 'En croisière FL' + S.fms.crzFL + ' vers ' + AIRPORTS[S.fms.to].name + ', pilote automatique engagé.' :
    'Approche finale piste ' + S.fms.arrRwy + ' à ' + AIRPORTS[S.fms.to].name + ', atterrissage automatique armé.', 'ok', 7);
}

function init() {
  const rs = $('routeSel'); ROUTES.forEach(r => rs.appendChild(new Option(r.label, r.id)));
  $('scenSel').value = 'ready';
  loadScenario('ready', 'FMEE-LFPO'); guideReset('ready'); commsReset('ready'); logReset();
  buildOvhd(); buildDyn(); buildMfdTabs(); bindPointer(); t3Init(); helpInit();
  document.addEventListener('click', e => {
    if (e.target.closest('button')) sndClick();
    const b = e.target.closest('[data-act]'); if (b) { act(b.dataset.act, e); return; }
    const m = e.target.closest('[data-mf]'); if (m) mfdAction(m.dataset.mf, m);
  });
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => setView(t.dataset.view));
  $('btnLoad').onclick = loadFromMenus;
  $('rateUp').onclick = () => changeRate(1); $('rateDown').onclick = () => changeRate(-1);
  $('btnPause').onclick = () => { S.paused = !S.paused; uiRefresh(true); };
  $('btnSound').onclick = toggleSound;
  $('btnTutor').onclick = () => TUT.on ? tutorStop() : tutorStart();
  $('tutPrev').onclick = () => { TUT.view = Math.max(0, tutorShown() - 1); TUT.scrolledFor = -1; };
  $('tutNext').onclick = () => { const cur = currentStep(); if (TUT.view != null && TUT.view < cur) { TUT.view = TUT.view + 1 >= cur ? null : TUT.view + 1; } else if (cur >= 0) { (UIC.revisit ? UIC.skip2 : UIC.skip).add(cur); TUT.view = null; } TUT.scrolledFor = -1; };
  $('btnHelp').onclick = () => { try { $('helpDlg').showModal(); } catch (e) { $('helpDlg').setAttribute('open', ''); } };
  $('failSel').onchange = e => { const v = e.target.value; if (v) { S.fail[v] = true; showMsg('Panne déclenchée : ' + e.target.selectedOptions[0].text + '. Lis l\'ECAM (EWD) et applique la procédure.', 'warn', 8); } e.target.value = ''; };
  $('gShow').onclick = showStep;
  $('rbBtn').onclick = () => readback(true);
  $('tutLesson').onclick = tutorLesson;
  $('tutDetail').onclick = () => { TUT.detail = !TUT.detail; $('tutDetail').textContent = 'Détails : ' + (TUT.detail ? 'oui' : 'non'); };
  $('gSkip').onclick = () => { const i = currentStep(); if (i === -2) UIC.skip2 = new Set(); else if (i >= 0) (UIC.revisit ? UIC.skip2 : UIC.skip).add(i); uiRefresh(true); };
  $('gRwy').onclick = () => { alignOnRunway(); uiRefresh(true); };
  $('tutReturn').onclick = () => $('gReturn').click();
  $('gReturn').onclick = () => {
    const back = ROUTES.find(r => r.from === S.fms.to && r.to === S.fms.from);
    if (!back) return;
    $('routeSel').value = back.id; $('scenSel').value = 'cold';
    if (TUT.on) tutorStart(); else loadFromMenus();
    showMsg('Vol retour ' + back.from + ' → ' + back.to + ' : cockpit froid au parking, environ 11 h de vol.', 'ok', 8);
  };
  $('gRestart').onclick = () => { $('scenSel').value = S.scenario || 'ready'; loadFromMenus(); };
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  $('touchBar').hidden = VIEW !== 'main';
  window.addEventListener('keydown', e => onKey(e, true));
  window.addEventListener('keyup', e => onKey(e, false));
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  fitStage(); new ResizeObserver(fitStage).observe($('stageWrap'));
  showMsg('Première fois ? Appuie sur « Mode pédagogique » en haut : une bulle numérotée te guide du cockpit froid jusqu\'au parking.', 'ok', 15);
  uiRefresh(true);
  requestAnimationFrame(frame);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
