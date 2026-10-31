import type { ClockCommand } from '@a350/sim-core';
import type { DemoCommand, DemoSnapshot } from './demoModel.ts';

/** Messages interface → moteur. */
export type ToWorker =
  | { kind: 'start'; seed: number }
  | { kind: 'command'; cmd: DemoCommand | ClockCommand };

/** Messages moteur → interface. */
export type FromWorker =
  | { kind: 'snapshot'; snap: DemoSnapshot }
  | { kind: 'error'; message: string };

/** Fréquence de publication des instantanés (docs/TECHNICAL_ARCHITECTURE.md § 3). */
export const SNAPSHOT_HZ = 30;
