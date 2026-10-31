/**
 * Géodésie sur Terre sphérique (rayon 6 371 km). Portage du prototype v0.
 * Angles en degrés en entrée/sortie, distances en mètres.
 */
import { D2R, EARTH_RADIUS, R2D, wrap180, wrap360 } from './units.ts';

export interface LatLon { lat: number; lon: number }

/** Distance orthodromique (haversine), m. */
export function gcDistance(a: LatLon, b: LatLon): number {
  const p1 = a.lat * D2R, p2 = b.lat * D2R, dp = p2 - p1, dl = (b.lon - a.lon) * D2R;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Route vraie initiale de a vers b, degrés [0, 360). */
export function gcBearing(a: LatLon, b: LatLon): number {
  const p1 = a.lat * D2R, p2 = b.lat * D2R, dl = (b.lon - a.lon) * D2R;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return wrap360(Math.atan2(y, x) * R2D);
}

/** Point atteint en partant de `from` à la route vraie `bearingDeg` sur `distanceM`. */
export function gcDestination(from: LatLon, bearingDeg: number, distanceM: number): LatLon {
  const p1 = from.lat * D2R, l1 = from.lon * D2R, b = bearingDeg * D2R, dr = distanceM / EARTH_RADIUS;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(dr) + Math.cos(p1) * Math.sin(dr) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(dr) * Math.cos(p1), Math.cos(dr) - Math.sin(p1) * Math.sin(p2));
  return { lat: p2 * R2D, lon: wrap180(l2 * R2D) };
}

/** Point à la fraction f (0..1) de l'orthodromie a → b. */
export function gcInterpolate(a: LatLon, b: LatLon, f: number): LatLon {
  const p1 = a.lat * D2R, l1 = a.lon * D2R, p2 = b.lat * D2R, l2 = b.lon * D2R;
  const d = gcDistance(a, b) / EARTH_RADIUS;
  if (d < 1e-9) return { lat: a.lat, lon: a.lon };
  const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
  const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
  const z = A * Math.sin(p1) + B * Math.sin(p2);
  return { lat: Math.atan2(z, Math.hypot(x, y)) * R2D, lon: Math.atan2(y, x) * R2D };
}

/** Projection locale plane (Est, Nord) en mètres autour de `origin`, valable sur quelques dizaines de km. */
export function toLocalEN(origin: LatLon, p: LatLon): { e: number; n: number } {
  return {
    e: wrap180(p.lon - origin.lon) * D2R * EARTH_RADIUS * Math.cos(origin.lat * D2R),
    n: (p.lat - origin.lat) * D2R * EARTH_RADIUS,
  };
}

/**
 * Cap magnétique à partir du cap vrai. Déclinaison en degrés, positive vers l'Est
 * (FMEE : −19,2°, soit 19,2° W ; LFPG : +1,9° E — sources dans docs/FUNCTIONAL_AUDIT.md).
 */
export const trueToMagnetic = (trueDeg: number, declinationDeg: number): number => wrap360(trueDeg - declinationDeg);
export const magneticToTrue = (magDeg: number, declinationDeg: number): number => wrap360(magDeg + declinationDeg);
