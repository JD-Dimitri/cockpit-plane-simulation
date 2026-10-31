/**
 * Schéma des données sourcées (exigence EF-001, docs/SPECIFICATIONS.md § 1.1).
 * Une valeur sans statut, ou « documenté » sans source connue, est refusée au chargement.
 */
import { z } from 'zod';

export const FidelityStatus = z.enum(['documenté', 'estimé', 'fictif']);
export type FidelityStatus = z.infer<typeof FidelityStatus>;

export const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  consulted: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date AAAA-MM-JJ'),
});
export const SourcesSchema = z.record(z.string(), SourceSchema);
export type Sources = z.infer<typeof SourcesSchema>;

export const SourcedValueSchema = z.object({
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  status: FidelityStatus,
  source: z.string().optional(),
  note: z.string().optional(),
}).strict().superRefine((v, ctx) => {
  if (v.status === 'documenté' && !v.source) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'une valeur « documenté » doit citer une source' });
  }
  if (v.status !== 'documenté' && v.source) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'seule une valeur « documenté » cite une source ; sinon utiliser note' });
  }
});
export type SourcedValue = z.infer<typeof SourcedValueSchema>;

/** Fichier de données : groupes de valeurs sourcées, plus un commentaire facultatif. */
export const DataFileSchema = z.object({ $comment: z.string().optional() })
  .catchall(z.record(z.string(), SourcedValueSchema));
export type DataFile = z.infer<typeof DataFileSchema>;
