/* =====================================================================
   A350-900 COCKPIT SIM — CORE
   Unités internes : SI (m, m/s, kg, N, rad). Affichage : ft, kt, NM.
   ===================================================================== */
'use strict';
const KT = 0.514444, FT = 0.3048, NM = 1852, G0 = 9.80665, RE = 6371000;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const wrap360 = d => ((d % 360) + 360) % 360;
const wrap180 = d => { d = wrap360(d); return d > 180 ? d - 360 : d; };
const approach = (v, t, r) => v < t ? Math.min(t, v + r) : Math.max(t, v - r);

/* ---------- Atmosphère standard (ISA) ---------- */
function isa(h) {
  h = Math.max(-500, h);
  const T = h < 11000 ? 288.15 - 0.0065 * h : 216.65;
  const p = h < 11000 ? 101325 * Math.pow(T / 288.15, 5.25588) : 22632 * Math.exp(-(h - 11000) / 6341.6);
  return { T, p, rho: p / (287.05 * T), a: Math.sqrt(1.4 * 287.05 * T) };
}
const RHO0 = 1.225;

/* ---------- Géodésie (sphère) ---------- */
function gcDist(la1, lo1, la2, lo2) {
  const p1 = la1 * D2R, p2 = la2 * D2R, dp = p2 - p1, dl = (lo2 - lo1) * D2R;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * RE * Math.asin(Math.min(1, Math.sqrt(a)));
}
function gcBrg(la1, lo1, la2, lo2) {
  const p1 = la1 * D2R, p2 = la2 * D2R, dl = (lo2 - lo1) * D2R;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return wrap360(Math.atan2(y, x) * R2D);
}
function gcDest(la, lo, brg, d) {
  const p1 = la * D2R, l1 = lo * D2R, b = brg * D2R, dr = d / RE;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(dr) + Math.cos(p1) * Math.sin(dr) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(dr) * Math.cos(p1), Math.cos(dr) - Math.sin(p1) * Math.sin(p2));
  return { lat: p2 * R2D, lon: wrap180(l2 * R2D) };
}
function gcInterp(la1, lo1, la2, lo2, f) {
  const p1 = la1 * D2R, l1 = lo1 * D2R, p2 = la2 * D2R, l2 = lo2 * D2R;
  const d = gcDist(la1, lo1, la2, lo2) / RE;
  if (d < 1e-9) return { lat: la1, lon: lo1 };
  const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
  const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
  const z = A * Math.sin(p1) + B * Math.sin(p2);
  return { lat: Math.atan2(z, Math.hypot(x, y)) * R2D, lon: Math.atan2(y, x) * R2D };
}
/* Projection locale (Est, Nord) en mètres autour de (la0, lo0) */
function enu(la0, lo0, la, lo) {
  return { e: wrap180(lo - lo0) * D2R * RE * Math.cos(la0 * D2R), n: (la - la0) * D2R * RE };
}

/* ---------- Aéroports (positions et pistes approximatives) ----------
   Simplification assumée : le QFU de piste est traité comme cap vrai. */
const AIRPORTS = {
  FMEE: { icao: 'FMEE', name: 'Saint-Denis Roland Garros', city: 'La Réunion', lat: -20.8871, lon: 55.5103, elev: 66,
    rwys: { '12': { hdg: 120, len: 3200 }, '30': { hdg: 300, len: 3200 } }, def: '12', altn: 'FIMP' },
  LFPO: { icao: 'LFPO', name: 'Paris-Orly', city: 'Paris', lat: 48.7233, lon: 2.3794, elev: 291,
    rwys: { '24': { hdg: 240, len: 3650 }, '06': { hdg: 60, len: 3650 } }, def: '24', altn: 'LFPG' },
  LFPG: { icao: 'LFPG', name: 'Paris-Charles de Gaulle', city: 'Paris', lat: 49.0097, lon: 2.5479, elev: 392,
    rwys: { '26R': { hdg: 260, len: 4215 }, '08L': { hdg: 80, len: 4215 } }, def: '26R', altn: 'LFPO' },
};
const ROUTES = [
  { id: 'FMEE-LFPO', from: 'FMEE', to: 'LFPO', label: 'FMEE → LFPO  Saint-Denis → Orly' },
  { id: 'FMEE-LFPG', from: 'FMEE', to: 'LFPG', label: 'FMEE → LFPG  Saint-Denis → CDG' },
  { id: 'LFPO-FMEE', from: 'LFPO', to: 'FMEE', label: 'LFPO → FMEE  Orly → Saint-Denis' },
  { id: 'LFPG-FMEE', from: 'LFPG', to: 'FMEE', label: 'LFPG → FMEE  CDG → Saint-Denis' },
];
function rwyGeom(icao, id) {
  const ap = AIRPORTS[icao], r = ap.rwys[id];
  const thr = gcDest(ap.lat, ap.lon, r.hdg + 180, r.len / 2);
  const end = gcDest(ap.lat, ap.lon, r.hdg, r.len / 2);
  return { icao, id, hdg: r.hdg, len: r.len, width: 60, elev: ap.elev * FT, thr, end, mid: { lat: ap.lat, lon: ap.lon } };
}

/* ---------- Avion : A350-900 (valeurs publiques approximatives) ---------- */
const AC = {
  S: 443, oew: 142400, mtow: 283000, mlw: 207000, mzfw: 195700, fuelMax: 110500,
  tankMax: { L: 39000, R: 39000, C: 32500 },
  T0: 374000,           // Trent XWB-84, par moteur (N)
  CL0: 0.22, CLa: 5.2, CD0: 0.0165, k: 0.040,
  vmo: 340, mmo: 0.89, vle: 250, vlo: 250,
  conf: [
    { name: '0',    dCL: 0.00, clmax: 1.45, dCD: 0.000, vfe: 999, slat: 0, flap: 0 },
    { name: '1',    dCL: 0.45, clmax: 1.85, dCD: 0.010, vfe: 255, slat: 1, flap: 0 },
    { name: '2',    dCL: 0.50, clmax: 2.05, dCD: 0.024, vfe: 222, slat: 2, flap: 2 },
    { name: '3',    dCL: 0.65, clmax: 2.25, dCD: 0.040, vfe: 205, slat: 3, flap: 3 },
    { name: 'FULL', dCL: 0.85, clmax: 2.50, dCD: 0.065, vfe: 186, slat: 3, flap: 4 },
  ],
};
function confAt(f) { // f continu 0..4
  const i = clamp(Math.floor(f), 0, 3), t = clamp(f - i, 0, 1), a = AC.conf[i], b = AC.conf[Math.min(4, i + 1)];
  return { dCL: lerp(a.dCL, b.dCL, t), clmax: lerp(a.clmax, b.clmax, t), dCD: lerp(a.dCD, b.dCD, t) };
}
/* Vitesse de décrochage 1g (kt, vitesse conventionnelle) pour une masse et une conf */
function vs1g(mass, confIdx) { return Math.sqrt(2 * mass * G0 / (RHO0 * AC.S * AC.conf[confIdx].clmax)) / KT; }

/* =====================================================================
   PLAFONNIER — définition des commandes (disposition inspirée A350)
   type : pb (bouton-poussoir Airbus), sel (sélecteur rotatif),
          tog (interrupteur à levier), guard (poussoir sous capot), mom (momentané)
   cold : valeur cockpit froid · flt : valeur configuration vol
   ===================================================================== */
const OVH_DEF = [
  { col: 0, title: 'ADIRS', items: [
    { id: 'adr1', t: 'pb', l: 'ADR 1', norm: 1, cold: 0, flt: 1 }, { id: 'adr2', t: 'pb', l: 'ADR 2', norm: 1, cold: 0, flt: 1 }, { id: 'adr3', t: 'pb', l: 'ADR 3', norm: 1, cold: 0, flt: 1 },
    { id: 'ir1', t: 'pb', l: 'IR 1', norm: 1, cold: 0, flt: 1 }, { id: 'ir2', t: 'pb', l: 'IR 2', norm: 1, cold: 0, flt: 1 }, { id: 'ir3', t: 'pb', l: 'IR 3', norm: 1, cold: 0, flt: 1 } ] },
  { col: 0, title: 'F/CTL', items: [
    { id: 'prim1', t: 'pb', l: 'PRIM 1', norm: 1, cold: 1, flt: 1 }, { id: 'prim2', t: 'pb', l: 'PRIM 2', norm: 1, cold: 1, flt: 1 }, { id: 'prim3', t: 'pb', l: 'PRIM 3', norm: 1, cold: 1, flt: 1 },
    { id: 'sec1', t: 'pb', l: 'SEC 1', norm: 1, cold: 1, flt: 1 }, { id: 'sec2', t: 'pb', l: 'SEC 2', norm: 1, cold: 1, flt: 1 }, { id: 'sec3', t: 'pb', l: 'SEC 3', norm: 1, cold: 1, flt: 1 } ] },
  { col: 0, title: 'EVAC · RCDR · OXYGEN', items: [
    { id: 'evacCmd', t: 'guard', l: 'EVAC CMD', cold: 0, flt: 0 }, { id: 'evacHorn', t: 'mom', l: 'HORN OFF' },
    { id: 'rcdrGnd', t: 'pb', l: 'RCDR GND', on: 'ON', cold: 0, flt: 0 },
    { id: 'crewOxy', t: 'pb', l: 'CREW OXY', norm: 1, cold: 1, flt: 1 }, { id: 'paxOxy', t: 'guard', l: 'PAX OXY', cold: 0, flt: 0 } ] },
  { col: 0, title: 'CALLS · WIPER L', items: [
    { id: 'callAll', t: 'mom', l: 'CALL ALL' }, { id: 'callMech', t: 'mom', l: 'MECH' },
    { id: 'wiperL', t: 'sel', l: 'WIPER L', pos: ['OFF', 'SLOW', 'FAST'], cold: 0, flt: 0 }, { id: 'rainRp', t: 'pb', l: 'RAIN RPLNT', on: 'ON', cold: 0, flt: 0 } ] },

  { col: 1, title: 'FIRE', items: [
    { id: 'eng1Fire', t: 'guard', l: 'ENG 1 FIRE', fire: 0, cold: 0, flt: 0 }, { id: 'eng1Ag1', t: 'agent', l: 'AGENT 1', eng: 0, n: 1 }, { id: 'eng1Ag2', t: 'agent', l: 'AGENT 2', eng: 0, n: 2 },
    { id: 'apuFire', t: 'guard', l: 'APU FIRE', fire: 'apu', cold: 0, flt: 0 }, { id: 'apuAg', t: 'agent', l: 'AGENT', eng: 'apu', n: 1 },
    { id: 'eng2Fire', t: 'guard', l: 'ENG 2 FIRE', fire: 1, cold: 0, flt: 0 }, { id: 'eng2Ag1', t: 'agent', l: 'AGENT 1', eng: 1, n: 1 }, { id: 'eng2Ag2', t: 'agent', l: 'AGENT 2', eng: 1, n: 2 },
    { id: 'fireTest', t: 'mom', l: 'TEST' } ] },
  { col: 1, title: 'ELEC', items: [
    { id: 'bat1', t: 'pb', l: 'BAT 1', norm: 1, cold: 0, flt: 1 }, { id: 'batEmer1', t: 'pb', l: 'BAT EMER 1', norm: 1, cold: 0, flt: 1 },
    { id: 'batEmer2', t: 'pb', l: 'BAT EMER 2', norm: 1, cold: 0, flt: 1 }, { id: 'bat2', t: 'pb', l: 'BAT 2', norm: 1, cold: 0, flt: 1 },
    { id: 'extA', t: 'ext', l: 'EXT A', cold: 0, flt: 0 }, { id: 'extB', t: 'ext', l: 'EXT B', cold: 0, flt: 0 },
    { id: 'gen1a', t: 'pb', l: 'GEN 1A', norm: 1, cold: 1, flt: 1 }, { id: 'gen1b', t: 'pb', l: 'GEN 1B', norm: 1, cold: 1, flt: 1 },
    { id: 'apuGen', t: 'pb', l: 'APU GEN', norm: 1, cold: 1, flt: 1 },
    { id: 'gen2a', t: 'pb', l: 'GEN 2A', norm: 1, cold: 1, flt: 1 }, { id: 'gen2b', t: 'pb', l: 'GEN 2B', norm: 1, cold: 1, flt: 1 },
    { id: 'busTie', t: 'pb', l: 'BUS TIE', norm: 1, offL: 'OFF', cold: 1, flt: 1 }, { id: 'acEss', t: 'pb', l: 'AC ESS FEED', on: 'ALTN', cold: 0, flt: 0 },
    { id: 'galy', t: 'pb', l: 'GALY & CAB', norm: 1, cold: 1, flt: 1 }, { id: 'commercial', t: 'pb', l: 'COMMERCIAL', norm: 1, cold: 1, flt: 1 } ] },
  { col: 1, title: 'HYD', items: [
    { id: 'eng1PA', t: 'pb', l: 'ENG 1 PUMP A', norm: 1, cold: 1, flt: 1 }, { id: 'eng1PB', t: 'pb', l: 'ENG 1 PUMP B', norm: 1, cold: 1, flt: 1 },
    { id: 'elecPG', t: 'sel', l: 'ELEC PUMP G', pos: ['OFF', 'AUTO', 'ON'], cold: 1, flt: 1 },
    { id: 'elecPY', t: 'sel', l: 'ELEC PUMP Y', pos: ['OFF', 'AUTO', 'ON'], cold: 1, flt: 1 },
    { id: 'eng2PA', t: 'pb', l: 'ENG 2 PUMP A', norm: 1, cold: 1, flt: 1 }, { id: 'eng2PB', t: 'pb', l: 'ENG 2 PUMP B', norm: 1, cold: 1, flt: 1 } ] },
  { col: 1, title: 'FUEL', items: [
    { id: 'lp1', t: 'pb', l: 'L PUMP 1', norm: 1, cold: 1, flt: 1 }, { id: 'lp2', t: 'pb', l: 'L PUMP 2', norm: 1, cold: 1, flt: 1 },
    { id: 'ctrL', t: 'pb', l: 'CTR L', norm: 1, cold: 1, flt: 1 }, { id: 'ctrR', t: 'pb', l: 'CTR R', norm: 1, cold: 1, flt: 1 },
    { id: 'rp1', t: 'pb', l: 'R PUMP 1', norm: 1, cold: 1, flt: 1 }, { id: 'rp2', t: 'pb', l: 'R PUMP 2', norm: 1, cold: 1, flt: 1 },
    { id: 'xfeed', t: 'pb', l: 'X FEED', on: 'ON', cold: 0, flt: 0 } ] },

  { col: 2, title: 'AIR', items: [
    { id: 'pack1', t: 'pb', l: 'PACK 1', norm: 1, cold: 1, flt: 1 }, { id: 'pack2', t: 'pb', l: 'PACK 2', norm: 1, cold: 1, flt: 1 },
    { id: 'hotAir1', t: 'pb', l: 'HOT AIR 1', norm: 1, cold: 1, flt: 1 }, { id: 'hotAir2', t: 'pb', l: 'HOT AIR 2', norm: 1, cold: 1, flt: 1 },
    { id: 'engBleed1', t: 'pb', l: 'ENG 1 BLEED', norm: 1, cold: 1, flt: 1 }, { id: 'apuBleed', t: 'pb', l: 'APU BLEED', on: 'ON', cold: 0, flt: 0 },
    { id: 'engBleed2', t: 'pb', l: 'ENG 2 BLEED', norm: 1, cold: 1, flt: 1 },
    { id: 'xbleed', t: 'sel', l: 'X BLEED', pos: ['SHUT', 'AUTO', 'OPEN'], cold: 1, flt: 1 },
    { id: 'ckptT', t: 'knob', l: 'CKPT °C', min: 18, max: 30, cold: 22, flt: 22 }, { id: 'cabT', t: 'knob', l: 'CABIN °C', min: 18, max: 30, cold: 23, flt: 23 },
    { id: 'ramAir', t: 'guard', l: 'RAM AIR', cold: 0, flt: 0 } ] },
  { col: 2, title: 'ANTI ICE', items: [
    { id: 'wingAI', t: 'pb', l: 'WING', on: 'ON', cold: 0, flt: 0 }, { id: 'engAI1', t: 'pb', l: 'ENG 1', on: 'ON', cold: 0, flt: 0 },
    { id: 'engAI2', t: 'pb', l: 'ENG 2', on: 'ON', cold: 0, flt: 0 }, { id: 'probeHeat', t: 'sel', l: 'PROBE/WINDOW', pos: ['AUTO', 'ON'], cold: 0, flt: 0 } ] },
  { col: 2, title: 'CABIN PRESS', items: [
    { id: 'pressMode', t: 'sel', l: 'MODE SEL', pos: ['AUTO', 'MAN'], cold: 0, flt: 0 }, { id: 'ldgElev', t: 'knob', l: 'LDG ELEV', min: -2, max: 14, auto: 1, cold: -2, flt: -2 },
    { id: 'manVs', t: 'knob', l: 'MAN V/S', min: -5, max: 5, cold: 0, flt: 0 }, { id: 'ditching', t: 'guard', l: 'DITCHING', cold: 0, flt: 0 } ] },
  { col: 2, title: 'ENG · APU', items: [
    { id: 'manStart1', t: 'pb', l: 'MAN START 1', on: 'ON', cold: 0, flt: 0 }, { id: 'manStart2', t: 'pb', l: 'MAN START 2', on: 'ON', cold: 0, flt: 0 },
    { id: 'fadec1', t: 'pb', l: 'FADEC GND 1', on: 'ON', cold: 0, flt: 0 }, { id: 'fadec2', t: 'pb', l: 'FADEC GND 2', on: 'ON', cold: 0, flt: 0 },
    { id: 'apuMaster', t: 'pb', l: 'APU MASTER', on: 'ON', cold: 0, flt: 0 }, { id: 'apuStart', t: 'apustart', l: 'APU START', cold: 0, flt: 0 } ] },

  { col: 3, title: 'EXT LT', items: [
    { id: 'strobe', t: 'tog', l: 'STROBE', pos: ['ON', 'AUTO', 'OFF'], cold: 2, flt: 0 }, { id: 'beacon', t: 'tog', l: 'BEACON', pos: ['ON', 'OFF'], cold: 1, flt: 0 },
    { id: 'wingLt', t: 'tog', l: 'WING', pos: ['ON', 'OFF'], cold: 1, flt: 1 }, { id: 'navLogo', t: 'tog', l: 'NAV & LOGO', pos: ['1', '2', 'OFF'], cold: 2, flt: 0 },
    { id: 'rwyTurn', t: 'tog', l: 'RWY TURN OFF', pos: ['ON', 'OFF'], cold: 1, flt: 1 }, { id: 'land', t: 'tog', l: 'LAND', pos: ['ON', 'OFF'], cold: 1, flt: 1 },
    { id: 'nose', t: 'tog', l: 'NOSE', pos: ['T.O', 'TAXI', 'OFF'], cold: 2, flt: 2 } ] },
  { col: 3, title: 'SIGNS', items: [
    { id: 'seatBelts', t: 'tog', l: 'SEAT BELTS', pos: ['ON', 'AUTO', 'OFF'], cold: 2, flt: 1 }, { id: 'noSmoking', t: 'tog', l: 'NO SMOKING', pos: ['ON', 'AUTO', 'OFF'], cold: 1, flt: 1 },
    { id: 'emerExit', t: 'tog', l: 'EMER EXIT LT', pos: ['ON', 'ARM', 'OFF'], cold: 2, flt: 1 } ] },
  { col: 3, title: 'INT LT', items: [
    { id: 'ovhdInteg', t: 'knob', l: 'OVHD INTEG', min: 0, max: 10, cold: 5, flt: 5 }, { id: 'dome', t: 'tog', l: 'DOME', pos: ['BRT', 'DIM', 'OFF'], cold: 2, flt: 2 },
    { id: 'annLt', t: 'tog', l: 'ANN LT', pos: ['TEST', 'BRT', 'DIM'], cold: 1, flt: 1 } ] },
  { col: 3, title: 'CARGO · VENT · WIPER R', items: [
    { id: 'cargoAir', t: 'pb', l: 'CARGO AIR', norm: 1, cold: 1, flt: 1 }, { id: 'cargoSmk', t: 'mom', l: 'SMOKE TEST' },
    { id: 'avncsVent', t: 'sel', l: 'AVNCS VENT', pos: ['AUTO', 'OVRD'], cold: 0, flt: 0 },
    { id: 'wiperR', t: 'sel', l: 'WIPER R', pos: ['OFF', 'SLOW', 'FAST'], cold: 0, flt: 0 } ] },
];
const OVH_ITEMS = {}; OVH_DEF.forEach(p => p.items.forEach(it => { OVH_ITEMS[it.id] = it; it.panel = p.title; }));

/* =====================================================================
   ÉTAT DE LA SIMULATION
   ===================================================================== */
let S = null;

function newFms(routeId) {
  const r = ROUTES.find(x => x.id === routeId) || ROUTES[0];
  const from = AIRPORTS[r.from], to = AIRPORTS[r.to];
  return {
    routeId: r.id, from: r.from, to: r.to, depRwy: from.def, arrRwy: to.def, altn: to.altn,
    fltNbr: 'SIM' + (r.from === 'FMEE' ? '976' : '975'), crzFL: 370, ci: 60,
    zfw: 172.0, zfwcg: 28.0, block: 0, flex: 50, toConf: 1, thrRed: 1500, accAlt: 1500, transAlt: 5000,
    v1: 0, vr: 0, v2: 0, vapp: 0, ldgConf: 4, mda: 0, dh: 50,
    initDone: false, fuelDone: false, perfDone: false, wpts: [], active: 1, tod: null, toc: null,
  };
}

function freshState(routeId) {
  const ovh = {}; OVH_DEF.forEach(p => p.items.forEach(it => { if (it.cold !== undefined) ovh[it.id] = it.cold; }));
  return {
    t: 0, rate: 1, paused: false, utc0: Date.now(), crash: null, msg: null, msgT: 0,
    ovh, momentary: {},
    ac: { lat: 0, lon: 0, alt: 0, V: 0, gam: 0, psi: 0, phi: 0, theta: 0, alpha: 0, onGround: true,
      vs: 0, mass: 0, fuel: { L: 0, R: 0, C: 0 }, apuFuel: 0, nz: 1, lastTdVs: 0, tdT: -99, airT: 0 },
    ctl: { pitch: 0, roll: 0, yaw: 0, brake: 0, park: true, tla: [0, 0], flapsLever: 0, spd: 0, spdArmed: false,
      gearDown: true, autobrk: 0 /* 0 OFF 1 RTO 2 LO 3 2 4 3 5 HI */, rudTrim: 0, tiller: 0, engMaster: [false, false], engMode: 1 },
    sys: { flaps: 0, gear: 1, gpu: true, apu: { flap: 0, n: 0, egt: 25, avail: false, starting: false, cool: 0, fire: false, ag: false },
      adirs: [0, 0, 0], elec: {}, hyd: { G: 0, Y: 0 }, duct: [0, 0], cabAlt: 0, cabVs: 0, gndSpl: 0, ab: { active: false },
      doors: { pax: true, cargo: true } },
    eng: [0, 1].map(i => ({ i, st: 'off', n1: 0, n2: 0, n3: 0, egt: 25, ff: 0, thr: 0, d: 0, fire: false, ag1: false, ag2: false, fireOut: 0, fail: false, revP: 0 })),
    fail: { eng1fire: false, eng2fire: false, eng1fail: false, gen1a: false, hydG: false },
    fcu: { spd: 250, mach: 0.85, machMode: false, spdMan: true, hdg: 120, hdgMan: true, alt: 10000, altInc: 1000,
      vs: 0, ap1: false, ap2: false, athr: false, loc: false, appr: false, exped: false },
    efis: { fd: true, ls: false, terr: true, mode: 'ARC', range: 40, baroStd: false, qnh: 1013, ovl: 'WPT' },
    fg: { lat: 'RWY', vert: 'SRS', latArm: '', vertArm: '', athrMode: '', athrState: 'off', bankCmd: 0, gamCmd: 0,
      spdTgt: 150, altCap: false, retard: false, land: false, apOffT: -99, togaLk: false, srs: false },
    fms: newFms(routeId),
    ecam: { page: 'ENG', autoPage: true, alerts: [], ack: {}, mw: false, mc: false, toTest: 0, lastAlertIds: '' },
    callout: { last: 9999, txt: '', t: 0 }, sound: false,
    phase: 'PREFLIGHT',
  };
}

/* ---------- FMS : construction de la route ---------- */
function buildRoute(f) {
  const dep = rwyGeom(f.from, f.depRwy), arr = rwyGeom(f.to, f.arrRwy);
  const W = [];
  W.push({ id: f.from + f.depRwy.padStart(2, '0'), lat: dep.thr.lat, lon: dep.thr.lon, alt: dep.elev / FT, rwy: true });
  const d1 = gcDest(dep.end.lat, dep.end.lon, dep.hdg, 8 * NM);
  W.push({ id: 'DEP' + f.depRwy.replace(/\D/g, ''), lat: d1.lat, lon: d1.lon, cst: 'B' });
  const iaf = gcDest(arr.thr.lat, arr.thr.lon, arr.hdg + 180, 30 * NM);
  const iff = gcDest(arr.thr.lat, arr.thr.lon, arr.hdg + 180, 18 * NM);
  const ff = gcDest(arr.thr.lat, arr.thr.lon, arr.hdg + 180, 8 * NM);
  const total = gcDist(d1.lat, d1.lon, iaf.lat, iaf.lon);
  const n = Math.max(1, Math.round(total / (420 * NM)));
  for (let i = 1; i < n; i++) {
    const p = gcInterp(d1.lat, d1.lon, iaf.lat, iaf.lon, i / n);
    W.push({ id: 'GC' + String(i).padStart(2, '0'), lat: p.lat, lon: p.lon });
  }
  const sfx = f.arrRwy.replace(/\D/g, '');
  W.push({ id: 'IA' + sfx, lat: iaf.lat, lon: iaf.lon, alt: Math.round((arr.elev / FT + 9000) / 100) * 100, cst: 'B' });
  W.push({ id: 'IF' + sfx, lat: iff.lat, lon: iff.lon, alt: Math.round((arr.elev / FT + 5000) / 100) * 100 });
  W.push({ id: 'FF' + sfx, lat: ff.lat, lon: ff.lon, alt: Math.round((arr.elev / FT + 2500) / 100) * 100, faf: true });
  W.push({ id: 'RW' + f.arrRwy, lat: arr.thr.lat, lon: arr.thr.lon, alt: Math.round(arr.elev / FT + 50), rwy: true, dest: true });
  // distances cumulées
  let cum = 0;
  W.forEach((w, i) => { if (i > 0) { w.leg = gcDist(W[i - 1].lat, W[i - 1].lon, w.lat, w.lon); w.trk = gcBrg(W[i - 1].lat, W[i - 1].lon, w.lat, w.lon); } else { w.leg = 0; w.trk = dep.hdg; } cum += w.leg; w.cum = cum; });
  f.wpts = W; f.active = 1; f.totalDist = cum;
  // T/C et T/D (estimations)
  const crzFt = f.crzFL * 100;
  f.tocDist = (crzFt - dep.elev / FT) / 1000 * 4.2 * NM;     // ~4,2 NM / 1000 ft en montée
  f.todDist = null; f.pathTbl = null;
  return W;
}
function tripFuel(f) { const dNm = (f.totalDist || 5000 * NM) / NM; return Math.round(dNm * 12.6 + 2600); }
function fuelPlan(f) {
  const trip = tripFuel(f), rsv = Math.round(trip * 0.05), altn = f.from === 'FMEE' || f.to === 'FMEE' && f.altn === 'FIMP' ? 3600 : 2800,
    fin = 3700, taxi = 700;
  const minBlock = trip + rsv + altn + fin + taxi;
  return { trip, rsv, altn, fin, taxi, minBlock };
}
function perfCompute(f) {
  const tow = f.zfw * 1000 + f.block * 1000 - 700;
  const ci = f.toConf; // 1 = 1+F, 2, 3
  const vs = vs1g(tow, ci);
  f.v2 = Math.round(Math.max(vs * 1.13, 135));
  f.vr = f.v2 - 5; f.v1 = f.vr - 4;
  const lw = Math.max(AC.oew + 10000, tow - tripFuel(f));
  f.vls = Math.round(vs1g(lw, f.ldgConf) * 1.23);
  f.vapp = f.vls + 5;
  f.tow = tow; f.lw = lw;
}

/* ---------- Initialisation des scénarios ---------- */
function setOvhFlightConfig() { OVH_DEF.forEach(p => p.items.forEach(it => { if (it.flt !== undefined) S.ovh[it.id] = it.flt; })); }

function loadScenario(kind, routeId) {
  const keepSound = S ? S.sound : false;
  S = freshState(routeId);
  S.sound = keepSound;
  const f = S.fms;
  buildRoute(f);
  const fp = fuelPlan(f);
  f.block = Math.round(fp.minBlock / 100) / 10 + 2.0; // tonnes, marge 2 t
  perfCompute(f);
  const fuelKg = f.block * 1000;
  // répartition : ailes d'abord, centre ensuite
  const wing = Math.min(fuelKg / 2, AC.tankMax.L);
  S.ac.fuel = { L: wing, R: wing, C: Math.max(0, fuelKg - 2 * wing) };
  const dep = rwyGeom(f.from, f.depRwy), arr = rwyGeom(f.to, f.arrRwy);
  S.fcu.hdg = dep.hdg;
  const a = S.ac;

  if (kind === 'cold') {
    // au poste de stationnement, à côté de la piste
    const gd = rwyGeom(f.from, AIRPORTS[f.from].def), gate = gcDest(gd.mid.lat, gd.mid.lon, gd.hdg - 90, 420);   // poste de stationnement
    a.lat = gate.lat; a.lon = gate.lon; a.alt = dep.elev; a.psi = (gd.hdg + 90) * D2R; a.V = 0; S.efis.range = 2;
    S.ctl.park = true; S.ctl.engMaster = [false, false]; S.sys.gpu = true;
    S.efis.fd = true; S.fcu.alt = 10000; S.phase = 'PREFLIGHT';
    f.initDone = f.fuelDone = f.perfDone = false;
    S.sys.doors = { pax: true, cargo: true };
    S.fg.lat = ''; S.fg.vert = ''; S.fg.latArm = 'NAV'; S.fg.vertArm = 'CLB';
  } else {
    setOvhFlightConfig();
    f.initDone = f.fuelDone = f.perfDone = true;
    S.sys.adirs = [1, 1, 1];
    S.sys.doors = { pax: false, cargo: false };
    S.sys.gpu = false;
    S.ctl.engMaster = [true, true]; S.ctl.engMode = 1;
    S.eng.forEach(e => { e.st = 'run'; e.n1 = 21; e.n2 = 58; e.n3 = 68; e.egt = 520; e.ff = 380; });
    S.efis.fd = true; S.fcu.athr = true;
    S.sys.hyd = { G: 5000, Y: 5000 }; S.sys.duct = [40, 40];
  }
  if (kind === 'ready') {
    a.lat = dep.thr.lat; a.lon = dep.thr.lon; a.alt = dep.elev; a.psi = dep.hdg * D2R; a.V = 0;
    S.ctl.park = true; S.ctl.flapsLever = 1; S.sys.flaps = 1; S.ctl.spdArmed = true; S.ctl.autobrk = 1;
    S.ovh.nose = 0; S.ovh.land = 0; S.ovh.strobe = 0; S.ovh.seatBelts = 0;
    S.fcu.alt = 10000; S.fcu.athr = true; S.fcu.hdgMan = true; S.fcu.spdMan = true;
    S.fg.lat = ''; S.fg.vert = ''; S.fg.latArm = 'NAV'; S.fg.vertArm = 'CLB';
    S.phase = 'TAKEOFF'; f.active = 1;
  }
  if (kind === 'cruise') {
    const W = f.wpts; const idx = Math.floor(W.length / 2);
    const p = gcInterp(W[idx - 1].lat, W[idx - 1].lon, W[idx].lat, W[idx].lon, 0.5);
    a.lat = p.lat; a.lon = p.lon; a.alt = f.crzFL * 100 * FT; a.onGround = false;
    a.psi = gcBrg(p.lat, p.lon, W[idx].lat, W[idx].lon) * D2R;
    a.V = 0.85 * isa(a.alt).a; a.gam = 0; a.alpha = 2.2 * D2R; a.theta = a.alpha;
    // carburant consommé jusqu'ici
    const burnt = Math.min(tripFuel(f) * (W[idx - 1].cum + W[idx].leg / 2) / f.totalDist, fuelKg - 20000);
    const left = fuelKg - burnt; const w2 = Math.min(left / 2, AC.tankMax.L);
    S.ac.fuel = { L: w2, R: w2, C: Math.max(0, left - 2 * w2) };
    S.ctl.park = false; S.ctl.gearDown = false; S.sys.gear = 0; S.ctl.tla = [25, 25];
    S.fcu.alt = f.crzFL * 100; S.fcu.ap1 = true; S.fcu.athr = true; S.fcu.machMode = true;
    S.fg.lat = 'NAV'; S.fg.vert = 'ALT CRZ'; S.fg.latArm = ''; S.fg.vertArm = ''; S.fg.athrState = 'active';
    S.eng.forEach(e => { e.n1 = 84; e.n2 = 88; e.n3 = 90; e.egt = 760; e.ff = 3000; e.d = 0.55; });
    f.active = idx; S.phase = 'CRUISE'; S.ovh.seatBelts = 1; S.ovh.nose = 2; S.ovh.land = 1; S.ovh.rwyTurn = 1;
    S.efis.baroStd = true; S.efis.range = 160;
  }
  if (kind === 'approach') {
    const d = 12 * NM; const p = gcDest(arr.thr.lat, arr.thr.lon, arr.hdg + 180, d);
    a.lat = p.lat; a.lon = p.lon; a.alt = arr.elev + 15 * FT + (d + 300) * Math.tan(3 * D2R); a.onGround = false;
    a.psi = arr.hdg * D2R;
    const lw = AC.oew + 30000 + 8000; a.mass = lw;
    S.ac.fuel = { L: 4500, R: 4500, C: 0 };
    f.zfw = (lw - 9000) / 1000; f.block = 9.7;
    S.ctl.park = false; S.ctl.gearDown = true; S.sys.gear = 1; S.ctl.flapsLever = 3; S.sys.flaps = 3;
    S.ctl.spdArmed = true; S.ctl.autobrk = 3; S.ctl.tla = [25, 25];
    perfCompute(f);
    a.V = f.vapp * KT * Math.sqrt(RHO0 / isa(a.alt).rho) + 8 * KT; a.gam = -3 * D2R; a.alpha = 5 * D2R; a.theta = a.gam + a.alpha;
    S.fcu.alt = Math.round((arr.elev / FT + 3000) / 100) * 100; S.fcu.ap1 = true; S.fcu.ap2 = true; S.fcu.athr = true; S.fcu.appr = true;
    S.efis.ls = true; S.efis.mode = 'ARC'; S.efis.range = 20;
    S.fg.lat = 'LOC'; S.fg.vert = 'G/S'; S.fg.athrState = 'active';
    S.eng.forEach(e => { e.n1 = 50; e.n2 = 75; e.n3 = 80; e.egt = 620; e.ff = 1300; e.d = 0.3; });
    f.active = f.wpts.length - 1; S.phase = 'APPROACH';
    S.ovh.seatBelts = 0; S.ovh.land = 0; S.ovh.nose = 0; S.ovh.strobe = 0; S.ovh.rwyTurn = 0;
  }
  if (kind === 'cruise' || kind === 'approach') S.tookOff = true;
  updateMass();
  S.fg.spdTgt = kind === 'cruise' ? 0.85 : 150;
  S.scenario = kind;
  S.efis.baroStd = a.alt / FT > 5000;
}
function updateMass() { const fu = S.ac.fuel; S.ac.mass = S.fms.zfw * 1000 + fu.L + fu.R + fu.C; }
function fob() { const f = S.ac.fuel; return f.L + f.R + f.C; }

/* =====================================================================
   SYSTÈMES
   ===================================================================== */
function groundElev(lat, lon) {
  if (typeof surfaceElev === 'function') return surfaceElev(lat, lon);   // relief réel (terrain3d.js)
  for (const k in AIRPORTS) { const ap = AIRPORTS[k]; if (gcDist(lat, lon, ap.lat, ap.lon) < 25000) return ap.elev * FT; }
  return 0;
}
function nearestApt(lat, lon) {
  let best = null, bd = 1e12;
  for (const k in AIRPORTS) { const ap = AIRPORTS[k], d = gcDist(lat, lon, ap.lat, ap.lon); if (d < bd) { bd = d; best = ap; } }
  return { ap: best, d: bd };
}

function sysElec(dt) {
  const o = S.ovh, sy = S.sys, a = S.ac;
  if (a.onGround === false || (a.V > 3)) sy.gpu = sy.gpu && a.V < 1;
  const extAvail = sy.gpu && a.onGround;
  const batOn = !!(o.bat1 || o.bat2 || o.batEmer1 || o.batEmer2);
  const gen = [0, 1].map(i => {
    const e = S.eng[i]; const run = (e.st === 'run') && e.n3 > 55;
    const ga = i === 0 ? o.gen1a && !S.fail.gen1a : o.gen2a, gb = i === 0 ? o.gen1b : o.gen2b;
    return { a: run && ga, b: run && gb, run };
  });
  const apuGen = sy.apu.avail && o.apuGen;
  const extOn = extAvail && (o.extA || o.extB);
  const ac1 = gen[0].a || gen[0].b, ac2 = gen[1].a || gen[1].b;
  const ac = ac1 || ac2 || extOn || apuGen;
  sy.elec = { batOn, extAvail, extOn, apuGen, gen, ac, ac1: ac1 || (o.busTie && (ac2 || extOn || apuGen)), ac2: ac2 || (o.busTie && (ac1 || extOn || apuGen)),
    dc: batOn || ac, batV: batOn ? (ac ? 28.2 : 25.4) : 0, src: ac1 || ac2 ? 'GEN' : extOn ? 'EXT' : apuGen ? 'APU' : batOn ? 'BAT' : 'OFF' };
}

function sysApu(dt) {
  const o = S.ovh, ap = S.sys.apu, dc = S.sys.elec.dc;
  const on = o.apuMaster && dc && !ap.fireShut;
  ap.flap = approach(ap.flap, on ? 1 : 0, dt / 8);
  if (o.apuStart && on && ap.flap >= 1 && !ap.avail) ap.starting = true;
  if (!on) { o.apuStart = 0; ap.starting = false; }
  if (ap.starting) {
    ap.n = Math.min(100, ap.n + dt * 2.6);
    if (ap.n > 95) { ap.avail = true; ap.starting = false; o.apuStart = 0; }
  } else if (!on) {
    if (ap.n > 0 && ap.avail && ap.cool <= 0 && o.apuBleed) ap.cool = 60;
    if (ap.cool > 0) ap.cool -= dt; else ap.n = Math.max(0, ap.n - dt * 6);
    if (ap.n < 95) ap.avail = false;
  }
  const egtT = ap.n < 1 ? 25 : ap.starting ? (ap.n < 45 ? 200 + ap.n * 16 : 920 - (ap.n - 45) * 7) : 420 + (o.apuBleed ? 120 : 0);
  ap.egt = approach(ap.egt, egtT, dt * 60);
  if (ap.n > 50) S.ac.apuFuel += dt * 140 / 3600;
  ap.bleed = ap.avail && o.apuBleed && on ? 38 : 0;
}

function sysAdirs(dt) {
  const o = S.ovh, dc = S.sys.elec.dc;
  for (let i = 0; i < 3; i++) {
    const on = o['ir' + (i + 1)] && dc;
    if (!on) { S.sys.adirs[i] = 0; continue; }
    if (S.sys.adirs[i] < 1) {
      if (S.ac.onGround && S.ac.V > 1) S.sys.adirs[i] = 0; // mouvement pendant l'alignement
      else S.sys.adirs[i] = Math.min(1, S.sys.adirs[i] + dt / 150);
    }
  }
}
const irAligned = () => S.sys.adirs.some(x => x >= 1);
const adrOk = () => S.ovh.adr1 || S.ovh.adr2 || S.ovh.adr3;

function sysPneu(dt) {
  const o = S.ovh, sy = S.sys;
  const eb = [0, 1].map(i => (S.eng[i].st === 'run' && S.eng[i].n3 > 55 && o['engBleed' + (i + 1)] && !S.eng[i].fireShut) ? 36 + S.eng[i].d * 10 : 0);
  let L = Math.max(eb[0], sy.apu.bleed || 0), R = eb[1];
  const xOpen = o.xbleed === 2 || (o.xbleed === 1 && (sy.apu.bleed > 0));
  sy.xbleedOpen = xOpen;
  if (xOpen) { const m = Math.max(L, R); L = R = m; }
  sy.duct = [L, R];
  const starting = S.eng.some(e => e.st === 'start');
  sy.packs = [o.pack1 && L > 20 && !starting, o.pack2 && R > 20 && !starting];
  // pressurisation
  const altFt = S.ac.alt / FT, packsOn = sy.packs[0] || sy.packs[1];
  const fieldFt = groundElev(S.ac.lat, S.ac.lon) / FT;
  let target;
  if (S.ac.onGround) target = fieldFt;
  else if (packsOn && !o.ditching) target = clamp(altFt * 0.155, Math.min(fieldFt, altFt), 6000);
  else target = altFt;
  if (o.pressMode === 1) target = sy.cabAlt + o.manVs * 600;
  const vsMax = packsOn ? 600 : 2500;
  const want = clamp((target - sy.cabAlt) * 0.02 * 60, -vsMax, vsMax); // ft/min
  sy.cabVs = lerp(sy.cabVs, want, Math.min(1, dt * 0.5));
  sy.cabAlt += sy.cabVs / 60 * dt;
  sy.deltaP = Math.max(0, (isa(sy.cabAlt * FT).p - isa(S.ac.alt).p) / 6894.76);
}

function sysHyd(dt) {
  const o = S.ovh, h = S.sys.hyd, ac = S.sys.elec.ac;
  const e1 = S.eng[0].st === 'run' && S.eng[0].n3 > 50, e2 = S.eng[1].st === 'run' && S.eng[1].n3 > 50;
  const g = (e1 && (o.eng1PA || o.eng1PB) && !S.fail.hydG) || (ac && (o.elecPG === 2 || (o.elecPG === 1 && !e1 && S.ac.onGround && S.ovh.beacon === 0)));
  const y = (e2 && (o.eng2PA || o.eng2PB)) || (ac && (o.elecPY === 2 || (o.elecPY === 1 && !e2 && S.ac.onGround && S.ovh.beacon === 0)));
  h.G = approach(h.G, g ? 5000 : 0, dt * 3000);
  h.Y = approach(h.Y, y ? 5000 : 0, dt * 3000);
}

function sysFuel(dt) {
  const fu = S.ac.fuel, o = S.ovh;
  const burn = [S.eng[0].ff * dt / 3600, S.eng[1].ff * dt / 3600];
  const apuB = S.ac.apuFuel; S.ac.apuFuel = 0;
  const ctrPumps = (o.ctrL || o.ctrR) && S.sys.elec.ac;
  // transfert centre -> ailes
  if (ctrPumps && fu.C > 0) {
    for (const s of ['L', 'R']) if (fu[s] < AC.tankMax[s] - 3000) { const q = Math.min(fu.C, dt * 1.2); fu.C -= q; fu[s] += q; }
  }
  S.fuelUsed = S.fuelUsed || [0, 0]; S.fuelUsed[0] += burn[0]; S.fuelUsed[1] += burn[1];
  fu.L = Math.max(0, fu.L - burn[0] - apuB);
  fu.R = Math.max(0, fu.R - burn[1]);
  if (o.xfeed) { const m = (fu.L + fu.R) / 2; fu.L = approach(fu.L, m, dt * 2); fu.R = approach(fu.R, m, dt * 2); }
  S.eng.forEach((e, i) => { if ((i === 0 ? fu.L : fu.R) <= 0 && e.st === 'run' && !o.xfeed) e.st = 'shutdown'; });
  updateMass();
}

/* ---------- Moteurs Trent XWB-84 (3 attelages : N1, N2, N3) ---------- */
function thrustAvail(alt, mach) {
  const r = isa(alt).rho / RHO0;
  return AC.T0 * Math.pow(r, 0.75) * (1 - 0.28 * mach);
}
function sysEng(dt) {
  const a = S.ac, atm = isa(a.alt), mach = a.V / atm.a, amb = atm.T - 273.15;
  S.eng.forEach((e, i) => {
    const master = S.ctl.engMaster[i];
    const fireShut = S.ovh[i === 0 ? 'eng1Fire' : 'eng2Fire'];
    e.fireShut = !!fireShut;
    if (S.fail[i === 0 ? 'eng1fire' : 'eng2fire'] && !e.fireOutDone) e.fire = true;
    if (e.fire && (e.ag1 || e.ag2)) { e.fireOut += dt; if (e.fireOut > 4) { e.fire = false; e.fireOutDone = true; S.fail[i === 0 ? 'eng1fire' : 'eng2fire'] = false; } }
    if (S.fail[i === 0 ? 'eng1fail' : 'eng2fail'] && e.st === 'run') e.st = 'shutdown';
    const duct = S.sys.duct[i];
    const startSel = S.ctl.engMode === 2 || S.ovh['manStart' + (i + 1)];
    if (!master || fireShut) { if (e.st === 'run' || e.st === 'start') e.st = 'shutdown'; }
    if (e.st === 'off' || e.st === 'shutdown') {
      if (master && !fireShut && startSel && duct >= 25 && S.sys.elec.dc && !S.fail[i === 0 ? 'eng1fail' : 'eng2fail'] && !e.fire) { e.st = 'start'; e.startT = 0; }
    }
    const wind = a.onGround ? 0 : clamp(mach * 14, 0, 12);
    if (e.st === 'start') {
      e.startT += dt;
      const fuelOn = e.n3 >= 25;
      if (duct < 20 && e.n3 < 50) { e.n3 = Math.max(0, e.n3 - dt * 2); }
      else e.n3 = Math.min(68, e.n3 + dt * (fuelOn ? 1.6 : 1.3));
      e.n2 = e.n3 * 0.85; e.n1 = Math.max(0, (e.n3 - 20) * 0.44);
      e.ff = fuelOn ? lerp(e.ff, 330, dt) : 0;
      const egtT = fuelOn ? (e.n3 < 45 ? amb + (e.n3 - 25) * 34 : 700 - (e.n3 - 45) * 7.8) : amb;
      e.egt = approach(e.egt, egtT, dt * 80);
      e.ign = fuelOn && e.n3 < 55;
      if (e.n3 >= 67.5) { e.st = 'run'; e.ign = false; }
      e.thr = 0;
    } else if (e.st === 'run') {
      const D = engDemand(i);
      const rev = D < 0;
      const dAbs = Math.abs(D);
      e.d = approach(e.d, dAbs, dt * (dAbs > e.d ? 0.22 : 0.35));
      const n1t = 21 + 77 * e.d, n3t = 68 + 28 * e.d, n2t = 58 + 38 * e.d;
      e.n1 = approach(e.n1, n1t, dt * 12); e.n2 = approach(e.n2, n2t, dt * 10); e.n3 = approach(e.n3, n3t, dt * 8);
      const f = clamp((e.n1 - 21) / 77, 0, 1);
      const Tav = thrustAvail(a.alt, mach);
      const idleT = 7000 * isa(a.alt).rho / RHO0;
      e.revP = approach(e.revP, rev && a.onGround ? 1 : 0, dt / 2);
      let T = idleT + Tav * f;
      if (e.revP > 0.05) T = -(idleT + Tav * f) * 0.35 * e.revP;
      e.thr = T;
      const tsfc = 0.031 + 0.0175 * clamp(a.alt / 11000, 0, 1.1);
      e.ff = Math.max(330 * (0.7 + 0.3 * isa(a.alt).rho / RHO0), tsfc * Math.abs(T));
      e.egt = approach(e.egt, 520 + 390 * f + (amb - 15) * 0.6, dt * 30);
      e.ign = S.ctl.engMode === 2;
    } else {
      e.d = 0; e.thr = 0; e.ff = 0; e.ign = false;
      e.n1 = approach(e.n1, wind, dt * 4); e.n2 = approach(e.n2, wind * 0.6, dt * 4); e.n3 = approach(e.n3, wind * 0.5, dt * 5);
      e.egt = approach(e.egt, amb, dt * 4);
      if (e.st === 'shutdown' && e.n3 < 1) e.st = 'off';
    }
  });
}

/* Position des manettes (TLA en degrés) :
   -20 = reverse max · 0 = IDLE · 25 = CL · 35 = FLX/MCT · 45 = TOGA */
const TLA_CL = 25, TLA_FLX = 35, TLA_TOGA = 45;
function leverDemand(tla) {
  if (tla < 0) return tla / 20;
  if (tla <= TLA_CL) return tla / TLA_CL * 0.86;
  if (tla <= TLA_FLX) {
    const flexTO = S.ac.onGround || S.phase === 'TAKEOFF';
    const top = flexTO && S.fms.flex > 30 ? clamp(1 - (S.fms.flex - 25) * 0.005, 0.78, 0.95) : 0.93;
    return 0.86 + (tla - TLA_CL) / 10 * (top - 0.86);
  }
  return 0.93 + (tla - TLA_FLX) / 10 * 0.07;
}
function athrActive() {
  const t = Math.max(S.ctl.tla[0], S.ctl.tla[1]);
  return S.fcu.athr && t > 0.5 && t <= TLA_CL + 0.5 && (!S.ac.onGround || S.tookOff);
}
function engDemand(i) {
  const tla = S.ctl.tla[i];
  if (S.fg.togaLk) return 1;
  if (S.fg.athrState === 'active' && tla > 0.5 && tla <= TLA_CL + 0.5) return clamp(S.fg.athrCmd || 0, 0, leverDemand(tla));
  if (S.fg.athrState === 'active' && S.fg.retard) return 0;
  return leverDemand(tla);
}

/* =====================================================================
   VITESSES CARACTÉRISTIQUES
   ===================================================================== */
function speeds() {
  const m = S.ac.mass, fl = Math.round(S.sys.flaps);
  const vsC = vs1g(m, clamp(fl, 0, 4));
  const vls = (S.ac.onGround || S.phase === 'TAKEOFF' ? 1.13 : 1.23) * vsC;
  const gd = vs1g(m, 0) * 1.32;
  const sSpd = vs1g(m, 1) * 1.25, fSpd = vs1g(m, 2) * 1.25;
  const vfeNext = fl < 4 ? AC.conf[fl + 1].vfe : null;
  const vfe = AC.conf[fl].vfe;
  const atm = isa(S.ac.alt);
  const vmoTas = AC.vmo * KT * Math.sqrt(RHO0 / atm.rho);
  const mmoTas = AC.mmo * atm.a;
  const vmax = Math.min(vfe, S.sys.gear > 0.05 ? AC.vle : 999, Math.min(vmoTas, mmoTas) / KT / Math.sqrt(RHO0 / atm.rho));
  const valphaMax = vsC * 1.0, valphaProt = vsC * 1.07;
  return { vls, gd, s: sSpd, f: fSpd, vfeNext, vfe, vmax, vaprot: valphaProt, vamax: valphaMax, vs: vsC };
}
const ias = () => S.ac.V * Math.sqrt(isa(S.ac.alt).rho / RHO0) / KT;   // kt (approx. EAS)
const machNow = () => S.ac.V / isa(S.ac.alt).a;
const iasToTas = (kt, h) => kt * KT * Math.sqrt(RHO0 / isa(h).rho);
const radAlt = () => (S.ac.alt - groundElev(S.ac.lat, S.ac.lon)) / FT;
