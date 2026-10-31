import { describe, expect, it } from 'vitest';
import { Simulation } from '@a350/sim-core';
import { demoModel, MAX_ALT_FT, MIN_ALT_FT } from '../src/sim/demoModel.ts';
import fr from '../src/i18n/fr.json' with { type: 'json' };

describe('Modèle de démonstration (phase 1)', () => {
  it('niveau de la mer : 15 °C, 1013,25 hPa', () => {
    const s = new Simulation(demoModel).snapshot();
    expect(s.isa.tempC).toBeCloseTo(15, 6);
    expect(s.isa.pressureHpa).toBeCloseTo(1013.25, 2);
  });

  it('la commande d’altitude est bornée et appliquée au pas suivant', () => {
    const sim = new Simulation(demoModel);
    sim.command({ type: 'probe.altitude', feet: 99_999 });
    expect(sim.snapshot().altitudeFt).toBe(0);
    sim.runSteps(1);
    expect(sim.snapshot().altitudeFt).toBe(MAX_ALT_FT);
    sim.command({ type: 'probe.altitude', feet: -99_999 });
    sim.runSteps(1);
    expect(sim.snapshot().altitudeFt).toBe(MIN_ALT_FT);
  });

  it('une valeur non numérique est ignorée', () => {
    const sim = new Simulation(demoModel);
    sim.command({ type: 'probe.altitude', feet: Number.NaN });
    sim.runSteps(1);
    expect(sim.snapshot().altitudeFt).toBe(0);
  });
});

describe('Textes (ENF-008)', () => {
  it('un libellé existe pour chaque statut de fidélité', () => {
    for (const s of ['documenté', 'estimé', 'fictif']) expect(Object.keys(fr)).toContain(`status.${s}`);
  });

  it('l’avertissement mentionne « non certifié » et la non-affiliation', () => {
    expect(fr['disclaimer.body1']).toContain('non certifié');
    expect(fr['disclaimer.body3']).toContain('ni affilié');
  });

  it('aucun texte vide', () => {
    for (const v of Object.values(fr)) expect(v.trim().length).toBeGreaterThan(0);
  });
});
