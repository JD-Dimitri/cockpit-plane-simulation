/**
 * Générateur pseudo-aléatoire déterministe (mulberry32). Toute source d'aléa du
 * moteur (turbulence, pannes aléatoires) passe par lui : même graine → même vol (ENF-005).
 */
export interface Rng {
  /** Réel uniforme dans [0, 1) */ next(): number;
  /** État interne, pour la sauvegarde */ readonly state: number;
}

export function createRng(seed: number, state?: number): Rng {
  let s = (state ?? seed) >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    },
    get state() { return s; },
  };
}
