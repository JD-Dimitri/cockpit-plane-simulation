/**
 * Boucle à pas fixe et contrat du moteur (docs/TECHNICAL_ARCHITECTURE.md § 4).
 *
 * Règles :
 * - l'interface n'envoie que des commandes ; elle ne modifie jamais l'état ;
 * - les commandes sont appliquées au début du pas suivant et journalisées avec
 *   le numéro de pas, ce qui permet le rejeu exact (ENF-005) ;
 * - le temps réel n'entre que dans `advance()`, jamais dans le modèle.
 */
import { createRng, type Rng } from './rng.ts';

/** Commandes communes à tous les modèles. */
export type ClockCommand =
  | { type: 'sim.pause'; paused: boolean }
  | { type: 'sim.timeScale'; value: number };

export interface BaseCommand { type: string }

export interface ClockState {
  /** Temps simulé écoulé (s) */ t: number;
  /** Nombre de pas exécutés */ step: number;
  paused: boolean;
  timeScale: number;
}

/** Un modèle (un avion, un système de démonstration…) branché sur la boucle. */
export interface SimModel<S, C extends BaseCommand, Snap> {
  init(rng: Rng): S;
  /** Applique une commande propre au modèle. */
  apply(state: S, cmd: C): void;
  /** Avance le modèle d'un pas de `dt` secondes. */
  step(state: S, dt: number, rng: Rng): void;
  /** État publié vers l'interface : copie, sans référence partagée. */
  snapshot(state: S, clock: Readonly<ClockState>): Snap;
}

export interface LoggedCommand<C> { step: number; cmd: C | ClockCommand }

export interface SavedState<S, C> {
  version: 1;
  seed: number;
  rngState: number;
  clock: ClockState;
  model: S;
  log: LoggedCommand<C>[];
}

export interface SimulationOptions {
  /** Fréquence du pas fixe (Hz). 60 à 120 selon docs/SIMULATION_ENGINE.md. */
  hz?: number;
  /** Plafond de pas par appel à advance(), pour ne jamais geler l'affichage. */
  maxStepsPerAdvance?: number;
  seed?: number;
}

export const ALLOWED_TIME_SCALES = [1, 2, 4, 8, 16, 32, 64, 128, 256] as const;

export class Simulation<S, C extends BaseCommand, Snap> {
  readonly dt: number;
  readonly seed: number;
  private readonly maxSteps: number;
  private rng: Rng;
  private state: S;
  private clock: ClockState = { t: 0, step: 0, paused: false, timeScale: 1 };
  private queue: (C | ClockCommand)[] = [];
  private log: LoggedCommand<C>[] = [];
  private accumulator = 0;
  /** Pas que la limite maxStepsPerAdvance a empêché d'exécuter (diagnostic). */
  droppedSteps = 0;

  constructor(private readonly model: SimModel<S, C, Snap>, opts: SimulationOptions = {}) {
    const hz = opts.hz ?? 60;
    if (!(hz >= 30 && hz <= 240)) throw new RangeError(`Fréquence hors plage : ${hz} Hz`);
    this.dt = 1 / hz;
    this.maxSteps = opts.maxStepsPerAdvance ?? 1000;
    this.seed = (opts.seed ?? 1) >>> 0;
    this.rng = createRng(this.seed);
    this.state = model.init(this.rng);
  }

  /** Met une commande en file ; elle sera appliquée au début du prochain pas. */
  command(cmd: C | ClockCommand): void {
    this.queue.push(cmd);
  }

  /**
   * Avance selon le temps réel écoulé. Retourne le nombre de pas exécutés.
   * Les commandes d'horloge sont prises en compte même en pause.
   */
  advance(realDtSeconds: number): number {
    this.applyClockCommandsOnly();
    if (this.clock.paused) { this.accumulator = 0; return 0; }
    this.accumulator += Math.max(0, Math.min(realDtSeconds, 0.25)) * this.clock.timeScale;
    let n = 0;
    while (this.accumulator >= this.dt && n < this.maxSteps) {
      this.stepOnce();
      this.accumulator -= this.dt;
      n++;
    }
    if (this.accumulator >= this.dt) {
      this.droppedSteps += Math.floor(this.accumulator / this.dt);
      this.accumulator = 0;
    }
    return n;
  }

  /** Exécute exactement `count` pas (tests, rejeu), indépendamment du temps réel et de la pause. */
  runSteps(count: number): void {
    for (let i = 0; i < count; i++) this.stepOnce();
  }

  snapshot(): Snap {
    return this.model.snapshot(this.state, { ...this.clock });
  }

  get clockState(): Readonly<ClockState> { return { ...this.clock }; }

  serialize(): SavedState<S, C> {
    return {
      version: 1,
      seed: this.seed,
      rngState: this.rng.state,
      clock: { ...this.clock },
      model: structuredClone(this.state),
      log: structuredClone(this.log),
    };
  }

  restore(saved: SavedState<S, C>): void {
    if (saved.version !== 1) throw new Error(`Version de sauvegarde inconnue : ${String(saved.version)}`);
    if (saved.seed >>> 0 !== this.seed) throw new Error('Graine différente de celle de la simulation');
    this.rng = createRng(this.seed, saved.rngState);
    this.clock = { ...saved.clock };
    this.state = structuredClone(saved.model);
    this.log = structuredClone(saved.log);
    this.queue = [];
    this.accumulator = 0;
  }

  /** Journal des commandes appliquées (pour le rejeu et les vols de référence). */
  get commandLog(): readonly LoggedCommand<C>[] { return this.log; }

  private applyClockCommandsOnly(): void {
    const rest: (C | ClockCommand)[] = [];
    for (const cmd of this.queue) {
      if (isClockCommand(cmd)) { this.applyClock(cmd); this.log.push({ step: this.clock.step, cmd }); }
      else rest.push(cmd);
    }
    this.queue = rest;
  }

  private stepOnce(): void {
    const pending = this.queue;
    this.queue = [];
    for (const cmd of pending) {
      if (isClockCommand(cmd)) this.applyClock(cmd);
      else this.model.apply(this.state, cmd);
      this.log.push({ step: this.clock.step, cmd });
    }
    this.model.step(this.state, this.dt, this.rng);
    this.clock.step++;
    this.clock.t = this.clock.step * this.dt;
  }

  private applyClock(cmd: ClockCommand): void {
    if (cmd.type === 'sim.pause') this.clock.paused = cmd.paused;
    else if ((ALLOWED_TIME_SCALES as readonly number[]).includes(cmd.value)) this.clock.timeScale = cmd.value;
  }
}

function isClockCommand(cmd: BaseCommand): cmd is ClockCommand {
  return cmd.type === 'sim.pause' || cmd.type === 'sim.timeScale';
}

/**
 * Rejoue un journal de commandes sur une simulation neuve et retourne l'instantané
 * après `totalSteps` pas. Sert aux tests de déterminisme et aux vols de référence.
 */
export function replay<S, C extends BaseCommand, Snap>(
  model: SimModel<S, C, Snap>,
  log: readonly LoggedCommand<C>[],
  totalSteps: number,
  opts: SimulationOptions = {},
): Snap {
  const sim = new Simulation(model, opts);
  let i = 0;
  for (let step = 0; step < totalSteps; step++) {
    while (i < log.length && log[i]!.step === step) sim.command(log[i++]!.cmd);
    sim.runSteps(1);
  }
  return sim.snapshot();
}
