import { describe, expect, it } from 'vitest';
import { isa, ISA_RHO0 } from '../src/index.ts';

describe('ISA', () => {
  it('niveau de la mer : 288,15 K, 101 325 Pa, 1,225 kg/m³, 340,3 m/s', () => {
    const a = isa(0);
    expect(a.T).toBeCloseTo(288.15, 6);
    expect(a.p).toBeCloseTo(101_325, 3);
    expect(a.rho).toBeCloseTo(ISA_RHO0, 2);
    expect(a.a).toBeCloseTo(340.3, 1);
  });

  it('tropopause (11 000 m) : 216,65 K, ≈ 22 632 Pa', () => {
    const a = isa(11_000);
    expect(a.T).toBeCloseTo(216.65, 6);
    expect(a.p).toBeGreaterThan(22_600);
    expect(a.p).toBeLessThan(22_700);
  });

  it('FL370 (11 278 m) : température constante, pression ≈ 21 660 Pa', () => {
    const a = isa(37_000 * 0.3048);
    expect(a.T).toBeCloseTo(216.65, 6);
    expect(a.p).toBeGreaterThan(21_500);
    expect(a.p).toBeLessThan(21_800);
  });

  it('borne basse à −500 m', () => {
    expect(isa(-2000).T).toBeCloseTo(isa(-500).T, 9);
  });
});
