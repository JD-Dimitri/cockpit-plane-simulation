/**
 * Réglages locaux de la phase 1. Stockés dans le stockage du WebView, protégés
 * par try/catch (stockage parfois indisponible). En phase 6, les réglages passent
 * dans un fichier du dossier de l'application et les données dans IndexedDB
 * (docs/TECHNICAL_ARCHITECTURE.md § 7).
 */
const KEY = 'a350sim.settings.v1';
/** Incrémenter quand le texte de l'avertissement change : il sera redemandé. */
export const DISCLAIMER_VERSION = 1;

interface Settings { disclaimerAccepted: number }

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Settings>;
      if (typeof v.disclaimerAccepted === 'number') return { disclaimerAccepted: v.disclaimerAccepted };
    }
  } catch { /* stockage indisponible ou corrompu : valeurs par défaut */ }
  return { disclaimerAccepted: 0 };
}

export function isDisclaimerAccepted(): boolean {
  return read().disclaimerAccepted >= DISCLAIMER_VERSION;
}

export function acceptDisclaimer(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), disclaimerAccepted: DISCLAIMER_VERSION }));
  } catch { /* l'avertissement sera simplement redemandé au prochain lancement */ }
}
