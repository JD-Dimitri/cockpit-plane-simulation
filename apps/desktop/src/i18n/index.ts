import fr from './fr.json';

export type TextKey = keyof typeof fr;

/** Texte de l'interface. Aucun texte en dur dans les composants (ENF-008). */
export function t(key: TextKey): string {
  return fr[key];
}
