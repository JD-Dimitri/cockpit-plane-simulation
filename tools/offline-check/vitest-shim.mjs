// Contrôle HORS LIGNE uniquement : remplace « vitest » par node:test quand le
// registre npm est inaccessible. Le vrai lanceur du projet reste Vitest (pnpm test).
// Seul le sous-ensemble d'assertions utilisé par les tests est fourni.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export { describe, it, it as test };

export function expect(actual) {
  return {
    toBe: (e) => assert.ok(Object.is(actual, e), `attendu ${String(e)}, obtenu ${String(actual)}`),
    toEqual: (e) => assert.deepStrictEqual(actual, e),
    toBeCloseTo: (e, digits = 2) =>
      assert.ok(Math.abs(actual - e) < Math.pow(10, -digits) / 2, `attendu ≈ ${e} (${digits} déc.), obtenu ${actual}`),
    toBeGreaterThan: (e) => assert.ok(actual > e, `${actual} > ${e}`),
    toBeGreaterThanOrEqual: (e) => assert.ok(actual >= e, `${actual} ≥ ${e}`),
    toBeLessThan: (e) => assert.ok(actual < e, `${actual} < ${e}`),
    toBeDefined: () => assert.notStrictEqual(actual, undefined),
    toContain: (e) => assert.ok(actual.includes(e), `${JSON.stringify(actual)} contient ${JSON.stringify(e)}`),
    toThrow: (e) => {
      if (e === undefined) assert.throws(actual);
      else if (e instanceof RegExp) assert.throws(actual, (err) => e.test(String(err?.message ?? err)));
      else assert.throws(actual, e);
    },
  };
}
