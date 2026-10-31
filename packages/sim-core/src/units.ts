/**
 * Unités et constantes. Unités internes SI (m, m/s, kg, N, rad, s) ;
 * affichage en ft, kt, NM, degrés (docs/SIMULATION_ENGINE.md § 1).
 * Valeurs reprises du prototype v0 (core.js).
 */
export const KT = 0.514444; // m/s par nœud
export const FT = 0.3048; // m par pied
export const NM = 1852; // m par mille nautique
export const G0 = 9.80665; // m/s²
export const EARTH_RADIUS = 6_371_000; // m, Terre sphérique
export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const wrap360 = (deg: number): number => ((deg % 360) + 360) % 360;
export const wrap180 = (deg: number): number => {
  const d = wrap360(deg);
  return d > 180 ? d - 360 : d;
};
/** Rapproche v de target d'au plus `rate` (même comportement que `approach` du prototype). */
export const approach = (v: number, target: number, rate: number): number =>
  v < target ? Math.min(target, v + rate) : Math.max(target, v - rate);
