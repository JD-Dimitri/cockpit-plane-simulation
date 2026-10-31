import { describe, expect, it } from 'vitest';
import { gcBearing, gcDestination, gcDistance, gcInterpolate, magneticToTrue, NM, toLocalEN, trueToMagnetic } from '../src/index.ts';

// Points de référence ARP (prototype v0, core.js)
const FMEE = { lat: -20.8871, lon: 55.5103 };
const LFPG = { lat: 49.0097, lon: 2.5479 };

describe('Géodésie', () => {
  it('FMEE → LFPG ≈ 5 000 NM (ordre de grandeur de la route réelle)', () => {
    const nm = gcDistance(FMEE, LFPG) / NM;
    expect(nm).toBeGreaterThan(4_900);
    expect(nm).toBeLessThan(5_100);
  });

  it('distance symétrique et nulle sur un même point', () => {
    expect(gcDistance(FMEE, LFPG)).toBeCloseTo(gcDistance(LFPG, FMEE), 3);
    expect(gcDistance(FMEE, FMEE)).toBe(0);
  });

  it('cap initial FMEE → LFPG vers le nord-ouest', () => {
    const b = gcBearing(FMEE, LFPG);
    expect(b).toBeGreaterThan(300);
    expect(b).toBeLessThan(340);
  });

  it('destination puis distance : aller-retour cohérent', () => {
    const p = gcDestination(FMEE, 102, 10_000);
    expect(gcDistance(FMEE, p)).toBeCloseTo(10_000, 3);
    expect(gcBearing(FMEE, p)).toBeCloseTo(102, 1);
  });

  it('interpolation : f = 0 et f = 1 retombent sur les extrémités, f = 0,5 à mi-distance', () => {
    const a = gcInterpolate(FMEE, LFPG, 0), b = gcInterpolate(FMEE, LFPG, 1), m = gcInterpolate(FMEE, LFPG, 0.5);
    expect(a.lat).toBeCloseTo(FMEE.lat, 6);
    expect(b.lon).toBeCloseTo(LFPG.lon, 6);
    expect(gcDistance(FMEE, m)).toBeCloseTo(gcDistance(m, LFPG), 0);
  });

  it('projection locale : 1 km à l’est ≈ (1000, 0)', () => {
    const p = gcDestination(FMEE, 90, 1000);
    const en = toLocalEN(FMEE, p);
    expect(en.e).toBeCloseTo(1000, 0);
    expect(Math.abs(en.n)).toBeLessThan(1);
  });

  it('déclinaison : piste 12 FMEE, 102° vrai avec 19,2° W ≈ 121° magnétique (eAIP FMEE)', () => {
    expect(trueToMagnetic(102, -19.2)).toBeCloseTo(121.2, 6);
    expect(magneticToTrue(121.2, -19.2)).toBeCloseTo(102, 6);
  });
});
