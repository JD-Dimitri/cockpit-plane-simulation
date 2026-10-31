/**
 * Moteur de simulation exécuté hors du fil de l'interface.
 * Il reçoit des commandes, avance à pas fixe et publie un instantané à 30 Hz.
 */
import { Simulation } from '@a350/sim-core';
import { demoModel, type DemoCommand, type DemoSnapshot, type DemoState } from './demoModel.ts';
import { SNAPSHOT_HZ, type FromWorker, type ToWorker } from './protocol.ts';

const ctx = self as unknown as {
  postMessage(msg: FromWorker): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
};

let sim: Simulation<DemoState, DemoCommand, DemoSnapshot> | null = null;
let last = 0;
let sinceSnapshot = 0;

function tick(): void {
  if (!sim) return;
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  try {
    sim.advance(dt);
    sinceSnapshot += dt;
    if (sinceSnapshot >= 1 / SNAPSHOT_HZ) {
      sinceSnapshot = 0;
      ctx.postMessage({ kind: 'snapshot', snap: sim.snapshot() });
    }
  } catch (err) {
    ctx.postMessage({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
  }
}

ctx.onmessage = (e) => {
  const msg = e.data;
  if (msg.kind === 'start' && !sim) {
    sim = new Simulation(demoModel, { hz: 60, seed: msg.seed });
    last = performance.now();
    setInterval(tick, 1000 / 120);
    ctx.postMessage({ kind: 'snapshot', snap: sim.snapshot() });
  } else if (msg.kind === 'command' && sim) {
    sim.command(msg.cmd);
  }
};
