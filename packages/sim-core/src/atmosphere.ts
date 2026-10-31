/**
 * Atmosphère type OACI (ISA), troposphère et basse stratosphère (< 20 km).
 * Portage fidèle de `isa()` du prototype v0 : mêmes constantes, mêmes résultats.
 * Limite connue : pas d'écart ISA ni de QNH (cible phase 5).
 */
export interface Atmosphere {
  /** Température (K) */ T: number;
  /** Pression statique (Pa) */ p: number;
  /** Masse volumique (kg/m³) */ rho: number;
  /** Vitesse du son (m/s) */ a: number;
}

export const ISA_T0 = 288.15; // K
export const ISA_P0 = 101_325; // Pa
export const ISA_RHO0 = 1.225; // kg/m³
export const ISA_LAPSE = 0.0065; // K/m
export const ISA_TROPOPAUSE = 11_000; // m
export const R_AIR = 287.05; // J/(kg·K)
export const GAMMA_AIR = 1.4;

export function isa(altitudeM: number): Atmosphere {
  const h = Math.max(-500, altitudeM);
  const T = h < ISA_TROPOPAUSE ? ISA_T0 - ISA_LAPSE * h : 216.65;
  const p = h < ISA_TROPOPAUSE
    ? ISA_P0 * Math.pow(T / ISA_T0, 5.25588)
    : 22_632 * Math.exp(-(h - ISA_TROPOPAUSE) / 6341.6);
  return { T, p, rho: p / (R_AIR * T), a: Math.sqrt(GAMMA_AIR * R_AIR * T) };
}
