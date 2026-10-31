import rawAircraft from '../data/aircraft.json' with { type: 'json' };
import rawSources from '../data/sources.json' with { type: 'json' };
import { validateAircraftData } from './load.ts';

export * from './schema.ts';
export * from './load.ts';

/** Données de l'avion, validées au chargement du module : un fichier invalide empêche le démarrage. */
export const A350 = validateAircraftData(rawAircraft, rawSources);
