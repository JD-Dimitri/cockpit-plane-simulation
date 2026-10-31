/**
 * Modèle de démonstration de la phase 1 : il prouve la chaîne complète
 * commande → Worker → pas fixe → instantané → interface, sans encore porter
 * le modèle de vol (phase 2). Code pur, sans DOM.
 */
import { clamp, FT, isa, type SimModel } from '@a350/sim-core';

export interface DemoState { altitudeFt: number }
export type DemoCommand = { type: 'probe.altitude'; feet: number };

export interface DemoSnapshot {
  t: number;
  step: number;
  paused: boolean;
  timeScale: number;
  altitudeFt: number;
  isa: { tempC: number; pressureHpa: number; rho: number; soundKt: number };
}

export const MIN_ALT_FT = -1000;
export const MAX_ALT_FT = 45_000;

export const demoModel: SimModel<DemoState, DemoCommand, DemoSnapshot> = {
  init: () => ({ altitudeFt: 0 }),
  apply(s, cmd) {
    if (cmd.type === 'probe.altitude' && Number.isFinite(cmd.feet)) s.altitudeFt = clamp(cmd.feet, MIN_ALT_FT, MAX_ALT_FT);
  },
  step() { /* rien à intégrer : l'atmosphère est calculée à l'instantané */ },
  snapshot(s, clock) {
    const a = isa(s.altitudeFt * FT);
    return {
      t: clock.t, step: clock.step, paused: clock.paused, timeScale: clock.timeScale,
      altitudeFt: s.altitudeFt,
      isa: { tempC: a.T - 273.15, pressureHpa: a.p / 100, rho: a.rho, soundKt: a.a / 0.514444 },
    };
  },
};
