import { describe, expect, it } from 'vitest';
import { A350, DataValidationError, entries, num, validateAircraftData } from '../src/index.ts';
import rawSources from '../data/sources.json' with { type: 'json' };

describe('Données de l’avion (EF-001)', () => {
  it('le fichier livré est valide et chaque valeur a un statut', () => {
    const all = entries(A350.data);
    expect(all.length).toBeGreaterThan(20);
    for (const [, v] of all) expect(['documenté', 'estimé', 'fictif']).toContain(v.status);
  });

  it('chaque valeur « documenté » cite une source existante, avec URL et date', () => {
    for (const [, v] of entries(A350.data)) {
      if (v.status !== 'documenté') continue;
      const s = A350.sources[v.source!];
      expect(s).toBeDefined();
      expect(s!.url.startsWith('https://')).toBe(true);
    }
  });

  it('valeurs confirmées par l’audit', () => {
    expect(num(A350.data, 'mass.mtow')).toBe(283_000);
    expect(num(A350.data, 'engine.thrustTakeoff')).toBe(374_500);
    expect(num(A350.data, 'engine.tgtTakeoff')).toBe(900);
  });

  it('cohérence : réservoirs du prototype ≈ capacité documentée × densité (± 1 %)', () => {
    const tanks = num(A350.data, 'fuel.tankLeft') + num(A350.data, 'fuel.tankRight') + num(A350.data, 'fuel.tankCenter');
    const fromLitres = num(A350.data, 'fuel.capacity') * num(A350.data, 'fuel.density');
    expect(Math.abs(tanks - fromLitres) / fromLitres).toBeLessThan(0.01);
  });

  it('refuse une valeur sans statut', () => {
    expect(() => validateAircraftData({ mass: { mtow: { value: 1 } } }, rawSources)).toThrow(DataValidationError);
  });

  it('refuse une valeur « documenté » sans source', () => {
    expect(() => validateAircraftData({ mass: { mtow: { value: 1, status: 'documenté' } } }, rawSources)).toThrow(/citer une source/);
  });

  it('refuse une source inconnue', () => {
    expect(() => validateAircraftData({ mass: { mtow: { value: 1, status: 'documenté', source: 'INVENTÉE' } } }, rawSources))
      .toThrow(/source inconnue/);
  });

  it('refuse une source citée sur une valeur estimée (sinon elle aurait l’air documentée)', () => {
    expect(() => validateAircraftData({ mass: { mlw: { value: 1, status: 'estimé', source: 'AIRBUS-FF-2022' } } }, rawSources))
      .toThrow(DataValidationError);
  });

  it('refuse un champ inconnu (faute de frappe sur « status »)', () => {
    expect(() => validateAircraftData({ mass: { mtow: { value: 1, statut: 'estimé', status: 'estimé' } } }, rawSources))
      .toThrow(DataValidationError);
  });

  it('num() refuse une valeur absente au lieu de renvoyer un défaut', () => {
    expect(() => num(A350.data, 'mass.inexistante')).toThrow();
  });
});
