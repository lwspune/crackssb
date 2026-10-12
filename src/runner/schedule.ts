import { assertValidConfig } from './modes.ts';
import type { Phase, RunnerConfig } from './modes.ts';

/**
 * The timeline of a session, fixed the moment it starts.
 *
 * For the sequential modes (forced sequence, stimulus → write) every item's
 * window is determined by `startedAtMs` and the config alone — WAT word k is
 * live during [start + k·15s, start + (k+1)·15s). Nothing about the timeline
 * depends on what the candidate does, which is what makes resume a pure
 * function of the clock and lets the server issue ONE timestamp rather than a
 * stream of per-item deadlines. See UI.md §3.2.
 *
 * Global-window modes (booklet, free-write) are the degenerate case: one
 * segment. Form has no segments and no end.
 */
export interface Segment {
  /** Which item is live. `null` for global-window modes, where time does not pick the item. */
  readonly item: number | null;
  readonly phase: Phase | null;
  readonly startMs: number;
  readonly endMs: number;
  readonly stimulusVisible: boolean;
}

export interface Schedule {
  readonly config: RunnerConfig;
  readonly startedAtMs: number;
  readonly segments: readonly Segment[];
  /** `null` when the session has no clock. */
  readonly endMs: number | null;
}

export type Position =
  | { readonly status: 'untimed' }
  | { readonly status: 'expired' }
  | {
      readonly status: 'live';
      readonly item: number | null;
      readonly phase: Phase | null;
      readonly stimulusVisible: boolean;
      readonly remainingMs: number;
      readonly segment: number;
    };

export function buildSchedule(config: RunnerConfig, startedAtMs: number): Schedule {
  assertValidConfig(config);
  const segments: Segment[] = [];
  let t = startedAtMs;

  switch (config.mode) {
    case 'forced_sequence': {
      const len = config.secondsPerItem * 1000;
      for (let i = 0; i < config.itemCount; i++) {
        segments.push({ item: i, phase: null, startMs: t, endMs: t + len, stimulusVisible: false });
        t += len;
      }
      break;
    }
    case 'stimulus_write': {
      for (let i = 0; i < config.itemCount; i++) {
        for (const p of config.phases) {
          const len = p.seconds * 1000;
          segments.push({ item: i, phase: p.phase, startMs: t, endMs: t + len, stimulusVisible: p.phase === 'show' });
          t += len;
        }
      }
      break;
    }
    case 'booklet':
    case 'free_write': {
      const len = config.timeLimitSeconds * 1000;
      segments.push({ item: null, phase: null, startMs: t, endMs: t + len, stimulusVisible: false });
      t += len;
      break;
    }
    case 'form':
      return { config, startedAtMs, segments: [], endMs: null };
  }

  return { config, startedAtMs, segments, endMs: t };
}

/**
 * Where the session is at `nowMs`. Pure: the same inputs always give the same
 * answer, whether the engine has been running continuously or was just
 * reconstructed after a refresh.
 *
 * Intervals are half-open — a tick landing exactly on a boundary belongs to
 * the next segment. A clock behind `startedAtMs` clamps to the start rather
 * than failing: skew is the client's problem, not the candidate's.
 */
export function positionAt(schedule: Schedule, nowMs: number): Position {
  if (schedule.endMs === null) return { status: 'untimed' };
  const t = Math.max(nowMs, schedule.startedAtMs);
  if (t >= schedule.endMs) return { status: 'expired' };

  const i = schedule.segments.findIndex((s) => t >= s.startMs && t < s.endMs);
  const s = schedule.segments[i];
  return {
    status: 'live',
    item: s.item,
    phase: s.phase,
    stimulusVisible: s.stimulusVisible,
    remainingMs: s.endMs - t,
    segment: i,
  };
}
