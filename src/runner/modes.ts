import { INSTRUMENT_SPECS } from '../scoring/thresholds.ts';

/**
 * The seven runner modes — D18, UI.md §3.
 *
 * Every SSB instrument is an instance of one of these. The mode, not the
 * instrument, is what the engine implements and the tests pin. Adding an
 * instrument is a config entry; adding a mode is a decision.
 */
export type Mode = 'booklet' | 'forced_sequence' | 'stimulus_write' | 'free_write' | 'form' | 'speak' | 'room';

/** Phases inside one stimulus → write item. `show` is for looking; the others accept input. */
export type Phase = 'show' | 'note' | 'write';

export interface PhaseSpec {
  readonly phase: Phase;
  readonly seconds: number;
}

/** One global clock, N items, free navigation. OIR, SRT. */
export interface BookletConfig {
  readonly mode: 'booklet';
  readonly itemCount: number;
  readonly timeLimitSeconds: number;
}

/** Per-item clock, auto-advance, no back. WAT. */
export interface ForcedSequenceConfig {
  readonly mode: 'forced_sequence';
  readonly itemCount: number;
  readonly secondsPerItem: number;
}

/** Phased clock per item; stimulus hidden once writing starts. TAT, PPDT. */
export interface StimulusWriteConfig {
  readonly mode: 'stimulus_write';
  readonly itemCount: number;
  readonly phases: readonly PhaseSpec[];
}

/** One clock, fixed prompts, word guidance shown not enforced. SDT. */
export interface FreeWriteConfig {
  readonly mode: 'free_write';
  readonly itemCount: number;
  readonly timeLimitSeconds: number;
}

/** No clock, saved, resumable. PIQ, medical self-check. */
export interface FormConfig {
  readonly mode: 'form';
  readonly itemCount: number;
}

/** Prep timer → record → transcript. Lecturette, interview. Phase 2 — declared, not runnable. */
export interface SpeakConfig {
  readonly mode: 'speak';
  readonly prepSeconds: number;
  readonly speakSeconds: number;
}

/** Scheduled, multi-party. GD, GPE. Phase 3 — declared, not runnable. */
export interface RoomConfig {
  readonly mode: 'room';
}

export type RunnerConfig =
  | BookletConfig
  | ForcedSequenceConfig
  | StimulusWriteConfig
  | FreeWriteConfig
  | FormConfig
  | SpeakConfig
  | RoomConfig;

/** What the engine may do in each mode. The contracts of UI.md §3.1, as data. */
export interface ModeRules {
  /** Booklet-style: the candidate picks the item. Otherwise the clock does. */
  readonly freeNavigation: boolean;
  /** Which phases accept input. Empty means the mode has no phases — input goes to the item itself. */
  readonly inputPhases: readonly Phase[];
}

export const MODE_RULES: Readonly<Record<Mode, ModeRules>> = {
  booklet: { freeNavigation: true, inputPhases: [] },
  forced_sequence: { freeNavigation: false, inputPhases: [] },
  stimulus_write: { freeNavigation: false, inputPhases: ['note', 'write'] },
  free_write: { freeNavigation: true, inputPhases: [] },
  form: { freeNavigation: true, inputPhases: [] },
  speak: { freeNavigation: false, inputPhases: [] },
  room: { freeNavigation: false, inputPhases: [] },
};

/** Modes where time, not the candidate, decides which item is live. */
export function isSequential(config: RunnerConfig): boolean {
  return config.mode === 'forced_sequence' || config.mode === 'stimulus_write';
}

/**
 * The phases of one item that hold a response. For stimulus → write that is
 * each configured phase except `show`; for everything else a single `null`
 * phase, meaning the item itself.
 */
export function inputPhases(config: RunnerConfig): readonly (Phase | null)[] {
  if (config.mode === 'stimulus_write') {
    return config.phases.map((p) => p.phase).filter((p) => MODE_RULES.stimulus_write.inputPhases.includes(p));
  }
  return [null];
}

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------

export type RunnerInstrument = 'oir' | 'ppdt' | 'tat' | 'wat' | 'srt' | 'sdt' | 'piq' | 'lecturette';

/**
 * Timings are the SSB's, from ARCHITECTURE.md §2. Item counts for the psych
 * instruments come from `INSTRUMENT_SPECS` so there is one source of truth.
 *
 * OIR is one mixed booklet (D32): 30 verbal + 10 non-verbal in 20 minutes,
 * the same as instrument_timings 'oir' (0009). Each mock carries its own
 * length and limit in `tests`; these are the defaults they are built to.
 */
export const INSTRUMENT_CONFIGS: Readonly<Record<RunnerInstrument, RunnerConfig>> = {
  oir: { mode: 'booklet', itemCount: 40, timeLimitSeconds: 20 * 60 },

  // Picture 30 s, one minute to note characters / mood / action, four minutes for the story.
  ppdt: {
    mode: 'stimulus_write',
    itemCount: 1,
    phases: [
      { phase: 'show', seconds: 30 },
      { phase: 'note', seconds: 60 },
      { phase: 'write', seconds: 4 * 60 },
    ],
  },

  // 12 slides — the twelfth is blank — 30 s to view, 4 min to write, then the next appears.
  tat: {
    mode: 'stimulus_write',
    itemCount: INSTRUMENT_SPECS.tat.items,
    phases: [
      { phase: 'show', seconds: 30 },
      { phase: 'write', seconds: 4 * 60 },
    ],
  },

  wat: { mode: 'forced_sequence', itemCount: INSTRUMENT_SPECS.wat.items, secondsPerItem: 15 },
  srt: { mode: 'booklet', itemCount: INSTRUMENT_SPECS.srt.items, timeLimitSeconds: 30 * 60 },
  sdt: { mode: 'free_write', itemCount: INSTRUMENT_SPECS.sdt.items, timeLimitSeconds: 15 * 60 },

  // Sections of the form, not questions. Untimed.
  piq: { mode: 'form', itemCount: 8 },

  lecturette: { mode: 'speak', prepSeconds: 3 * 60, speakSeconds: 3 * 60 },
};

// ---------------------------------------------------------------------------
// Validation — reject at the boundary, before any schedule is built
// ---------------------------------------------------------------------------

function positive(name: string, n: number): void {
  if (!Number.isFinite(n) || n <= 0) throw new RangeError(`${name} must be a positive number, got ${String(n)}`);
}

export function assertValidConfig(config: RunnerConfig): void {
  switch (config.mode) {
    case 'speak':
    case 'room':
      throw new Error(`Mode "${config.mode}" is declared but not implemented (UI.md §3)`);
    case 'booklet':
    case 'free_write':
      positive('itemCount', config.itemCount);
      positive('timeLimitSeconds', config.timeLimitSeconds);
      return;
    case 'forced_sequence':
      positive('itemCount', config.itemCount);
      positive('secondsPerItem', config.secondsPerItem);
      return;
    case 'stimulus_write':
      positive('itemCount', config.itemCount);
      if (config.phases.length === 0) throw new RangeError('phases must not be empty');
      for (const p of config.phases) positive(`phase ${p.phase} seconds`, p.seconds);
      return;
    case 'form':
      positive('itemCount', config.itemCount);
      return;
  }
}
