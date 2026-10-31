// Types du sous-ensemble Vitest fourni par vitest-shim.mjs (contrôle hors ligne seulement).
export declare function describe(name: string, fn: () => void): void;
export declare function it(name: string, fn: () => void | Promise<void>): void;
export { it as test };
interface Matchers {
  toBe(e: unknown): void; toEqual(e: unknown): void; toBeCloseTo(e: number, digits?: number): void;
  toBeGreaterThan(e: number): void; toBeGreaterThanOrEqual(e: number): void; toBeLessThan(e: number): void;
  toBeDefined(): void; toContain(e: unknown): void; toThrow(e?: unknown): void;
}
export declare function expect(actual: unknown): Matchers;
