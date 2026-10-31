// Contrôle HORS LIGNE : le Worker est compilé à part par esbuild (Vite le fait automatiquement).
export function createSimWorker(): Worker {
  return new Worker(new URL('./sim.worker.js', import.meta.url), { type: 'module', name: 'sim-engine' });
}
