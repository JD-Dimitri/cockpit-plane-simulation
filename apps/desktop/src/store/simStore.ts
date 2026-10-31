/**
 * État de l'interface : uniquement le dernier instantané publié par le moteur.
 * L'interface ne modifie jamais l'état de la simulation ; elle envoie des commandes.
 */
import { create } from 'zustand';
import type { ClockCommand } from '@a350/sim-core';
import { createSimWorker } from '../sim/createWorker.ts';
import type { DemoCommand, DemoSnapshot } from '../sim/demoModel.ts';
import type { FromWorker, ToWorker } from '../sim/protocol.ts';

interface SimStore {
  snap: DemoSnapshot | null;
  error: string | null;
}

export const useSim = create<SimStore>(() => ({ snap: null, error: null }));

let worker: Worker | null = null;

export function startEngine(seed = 1): void {
  if (worker) return;
  worker = createSimWorker();
  worker.onmessage = (e: MessageEvent<FromWorker>) => {
    const msg = e.data;
    if (msg.kind === 'snapshot') useSim.setState({ snap: msg.snap });
    else useSim.setState({ error: msg.message });
  };
  worker.onerror = (e) => useSim.setState({ error: e.message || 'Erreur du moteur' });
  post({ kind: 'start', seed });
}

export function send(cmd: DemoCommand | ClockCommand): void {
  post({ kind: 'command', cmd });
}

function post(msg: ToWorker): void {
  worker?.postMessage(msg);
}
