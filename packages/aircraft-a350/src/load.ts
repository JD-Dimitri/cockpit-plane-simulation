import { DataFileSchema, SourcesSchema, type DataFile, type SourcedValue, type Sources } from './schema.ts';

export class DataValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Données de l'avion invalides :\n- ${issues.join('\n- ')}`);
    this.name = 'DataValidationError';
  }
}

export interface ValidatedData { data: DataFile; sources: Sources }

/** Valide un fichier de données et ses sources ; lève DataValidationError avec toutes les erreurs. */
export function validateAircraftData(rawData: unknown, rawSources: unknown): ValidatedData {
  const issues: string[] = [];
  const s = SourcesSchema.safeParse(rawSources);
  if (!s.success) for (const i of s.error.issues) issues.push(`sources.${i.path.join('.')} : ${i.message}`);
  const d = DataFileSchema.safeParse(rawData);
  if (!d.success) for (const i of d.error.issues) issues.push(`${i.path.join('.')} : ${i.message}`);
  if (s.success && d.success) {
    for (const [path, v] of entries(d.data)) {
      if (v.source && !(v.source in s.data)) issues.push(`${path} : source inconnue « ${v.source} »`);
    }
  }
  if (issues.length || !s.success || !d.success) throw new DataValidationError(issues);
  return { data: d.data, sources: s.data };
}

/** Liste « groupe.clé » → valeur, pour les contrôles et l'aide « ? ». */
export function entries(data: DataFile): [string, SourcedValue][] {
  const out: [string, SourcedValue][] = [];
  for (const [group, values] of Object.entries(data)) {
    if (group === '$comment' || typeof values !== 'object' || values === null) continue;
    for (const [key, v] of Object.entries(values as Record<string, SourcedValue>)) out.push([`${group}.${key}`, v]);
  }
  return out;
}

/** Lit une valeur numérique ; lève une erreur si elle n'existe pas (pas de valeur par défaut silencieuse). */
export function num(data: DataFile, path: `${string}.${string}`): number {
  const [group, key] = path.split('.') as [string, string];
  const g = data[group];
  const v = typeof g === 'object' ? g[key] : undefined;
  if (!v || typeof v.value !== 'number') throw new Error(`Valeur numérique absente : ${path}`);
  return v.value;
}
