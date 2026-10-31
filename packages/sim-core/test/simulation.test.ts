import { describe, expect, it } from 'vitest';
import { createRng, replay, Simulation, type SimModel } from '../src/index.ts';

/** Modèle de test : un intégrateur bruité, piloté par une commande de consigne. */
interface S { x: number; target: number; noise: number }
type C = { type: 'set'; target: number };
const model: SimModel<S, C, { t: number; x: number; step: number }> = {
  init: () => ({ x: 0, target: 0, noise: 0 }),
  apply: (s, c) => { s.target = c.target; },
  step: (s, dt, rng) => { s.noise = rng.next() - 0.5; s.x += (s.target - s.x) * dt + s.noise * 1e-3; },
  snapshot: (s, clock) => ({ t: clock.t, x: s.x, step: clock.step }),
};

describe('Simulation à pas fixe', () => {
  it('60 Hz : 1 s réelle à ×1 = 60 pas', () => {
    const sim = new Simulation(model, { hz: 60 });
    let n = 0;
    for (let i = 0; i < 60; i++) n += sim.advance(1 / 60 + 1e-9);
    expect(n).toBe(60);
    expect(sim.snapshot().t).toBeCloseTo(1, 9);
  });

  it('accélération ×64 : 64 fois plus de pas', () => {
    const sim = new Simulation(model, { hz: 60 });
    sim.command({ type: 'sim.timeScale', value: 64 });
    expect(sim.advance(0.1 + 1e-6)).toBe(384);
  });

  it('accélération non autorisée ignorée', () => {
    const sim = new Simulation(model);
    sim.command({ type: 'sim.timeScale', value: 3 });
    sim.advance(0);
    expect(sim.clockState.timeScale).toBe(1);
  });

  it('pause : aucun pas, reprise ensuite', () => {
    const sim = new Simulation(model);
    sim.command({ type: 'sim.pause', paused: true });
    expect(sim.advance(1)).toBe(0);
    sim.command({ type: 'sim.pause', paused: false });
    expect(sim.advance(0.051)).toBe(3);
  });

  it('plafond de pas par appel : l’affichage ne gèle jamais', () => {
    const sim = new Simulation(model, { maxStepsPerAdvance: 100 });
    sim.command({ type: 'sim.timeScale', value: 256 });
    expect(sim.advance(0.25)).toBe(100);
    expect(sim.droppedSteps).toBeGreaterThan(0);
  });

  it('déterminisme : rejeu du journal → état identique au bit près (ENF-005)', () => {
    const sim = new Simulation(model, { seed: 42 });
    sim.runSteps(10);
    sim.command({ type: 'set', target: 5 });
    sim.runSteps(200);
    sim.command({ type: 'set', target: -2 });
    sim.runSteps(390);
    const replayed = replay(model, sim.commandLog, 600, { seed: 42 });
    expect(replayed).toEqual(sim.snapshot());
  });

  it('sauvegarde puis reprise → même suite que sans interruption', () => {
    const a = new Simulation(model, { seed: 7 });
    a.command({ type: 'set', target: 3 });
    a.runSteps(300);
    const saved = a.serialize();
    a.runSteps(300);

    const b = new Simulation(model, { seed: 7 });
    b.restore(structuredClone(saved));
    b.runSteps(300);
    expect(b.snapshot()).toEqual(a.snapshot());
  });

  it('reprise refusée si la graine diffère', () => {
    const a = new Simulation(model, { seed: 1 });
    const b = new Simulation(model, { seed: 2 });
    expect(() => b.restore(a.serialize())).toThrow();
  });

  it('rng : même graine → même suite, valeurs dans [0, 1)', () => {
    const r1 = createRng(123), r2 = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = r1.next();
      expect(v).toBe(r2.next());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
