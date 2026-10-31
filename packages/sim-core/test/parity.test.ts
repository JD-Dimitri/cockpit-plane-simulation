/**
 * Parité avec le prototype v0 : le portage doit donner exactement les mêmes
 * résultats que `legacy/prototype-v0/src/core.js` (stratégie : docs/TEST_STRATEGY.md § 2).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { gcBearing, gcDestination, gcDistance, gcInterpolate, isa } from '../src/index.ts';

const corePath = fileURLToPath(new URL('../../../legacy/prototype-v0/src/core.js', import.meta.url));
type LegacyIsa = (h: number) => { T: number; p: number; rho: number; a: number };
interface Legacy {
  isa: LegacyIsa;
  gcDist(a: number, b: number, c: number, d: number): number;
  gcBrg(a: number, b: number, c: number, d: number): number;
  gcDest(a: number, b: number, c: number, d: number): { lat: number; lon: number };
  gcInterp(a: number, b: number, c: number, d: number, f: number): { lat: number; lon: number };
}

function loadLegacy(): Legacy {
  const sandbox: Record<string, unknown> = { console, Math, Object, Array, JSON, String, Number };
  runInNewContext(readFileSync(corePath, 'utf8'), sandbox, { filename: 'core.js' });
  return sandbox as unknown as Legacy;
}

describe('Parité avec le prototype v0', () => {
  const v0 = loadLegacy();

  it('isa() identique de −500 m à 20 000 m', () => {
    for (let h = -500; h <= 20_000; h += 250) {
      const a = isa(h), b = v0.isa(h);
      expect(a.T).toBe(b.T);
      expect(a.p).toBe(b.p);
      expect(a.rho).toBe(b.rho);
      expect(a.a).toBe(b.a);
    }
  });

  it('orthodromie identique sur les quatre routes du prototype', () => {
    const pts = [
      { lat: -20.8871, lon: 55.5103 }, // FMEE
      { lat: 48.7233, lon: 2.3794 }, // LFPO
      { lat: 49.0097, lon: 2.5479 }, // LFPG
    ];
    for (const a of pts) for (const b of pts) {
      if (a === b) continue;
      expect(gcDistance(a, b)).toBe(v0.gcDist(a.lat, a.lon, b.lat, b.lon));
      expect(gcBearing(a, b)).toBe(v0.gcBrg(a.lat, a.lon, b.lat, b.lon));
      for (const f of [0.1, 0.5, 0.9]) {
        const p = gcInterpolate(a, b, f), q = v0.gcInterp(a.lat, a.lon, b.lat, b.lon, f);
        expect(p.lat).toBe(q.lat);
        expect(p.lon).toBe(q.lon);
      }
      const d = gcDestination(a, 45, 123_456), e = v0.gcDest(a.lat, a.lon, 45, 123_456);
      expect(d.lat).toBe(e.lat);
      expect(d.lon).toBe(e.lon);
    }
  });
});
