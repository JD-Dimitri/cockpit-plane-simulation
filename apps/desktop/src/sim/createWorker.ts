/** Crée le Worker du moteur (Vite le compile en module séparé). */
export function createSimWorker(): Worker {
  return new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module', name: 'sim-engine' });
}
