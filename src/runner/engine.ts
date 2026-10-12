import { assertValidConfig, inputPhases, isSequential, MODE_RULES } from './modes.ts';
import type { Phase, RunnerConfig } from './modes.ts';
import { buildSchedule, positionAt } from './schedule.ts';
import type { Position, Schedule } from './schedule.ts';

/**
 * The runner engine — a pure reducer over a server-issued start time.
 *
 * No timers, no DOM, no network. `nowMs` is injected on every call, so the
 * engine is deterministic and the never-pause rule (UI.md §3.2) is structural
 * rather than enforced: a state rebuilt from `startedAtMs` + what the server
 * has persisted is the same state a continuously-running engine would hold.
 *
 * The React component wraps this in Sprint 1. It owns nothing the engine
 * does not tell it.
 */

export type RunnerEvent =
  | { readonly type: 'tick' }
  | { readonly type: 'input'; readonly text: string }
  | { readonly type: 'navigate'; readonly item: number }
  | { readonly type: 'submit' }
  | { readonly type: 'abandon' };

export type Effect =
  /** Serve this item to the client. Carries the reference and nothing else — never a key, never an answer. */
  | { readonly type: 'release'; readonly item: number }
  /** Save this response. `final` marks the seal an item receives when its window closes. */
  | {
      readonly type: 'persist';
      readonly key: string;
      readonly item: number;
      readonly phase: Phase | null;
      readonly text: string;
      readonly final: boolean;
    }
  | { readonly type: 'submitted'; readonly responses: Readonly<Record<string, string>> }
  | { readonly type: 'abandoned'; readonly responses: Readonly<Record<string, string>> };

export type EndedBy = 'submit' | 'expiry' | 'abandon';

export interface RunnerState {
  readonly config: RunnerConfig;
  readonly schedule: Schedule;
  readonly status: 'live' | 'ended';
  readonly endedBy: EndedBy | null;
  /** The item the candidate is on. Time-driven in sequential modes, navigation-driven otherwise. */
  readonly currentItem: number;
  readonly position: Position;
  /** Everything persisted so far, by response key. */
  readonly saved: Readonly<Record<string, string>>;
}

export interface Step {
  readonly state: RunnerState;
  readonly effects: readonly Effect[];
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/** Stimulus → write items hold one response per input phase; every other mode holds one per item. */
export function keyFor(item: number, phase: Phase | null): string {
  return phase === null ? String(item) : `${item}:${phase}`;
}

function keysForItem(config: RunnerConfig, item: number): readonly { key: string; phase: Phase | null }[] {
  return inputPhases(config).map((phase) => ({ key: keyFor(item, phase), phase }));
}

function itemCount(config: RunnerConfig): number {
  return 'itemCount' in config ? config.itemCount : 0;
}

/** Every response the instrument expects, blanks filled — what a submission carries. */
function responsesOf(state: RunnerState): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < itemCount(state.config); i++) {
    for (const { key } of keysForItem(state.config, i)) out[key] = state.saved[key] ?? '';
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sealing and catch-up
// ---------------------------------------------------------------------------

/**
 * Close an item's window: a final persist per input phase, blank if nothing
 * was typed. With `trustSaved`, keys the server already holds are not
 * re-sent — that is the resume path, where `saved` came FROM the server.
 */
function seal(
  state: RunnerState,
  item: number,
  trustSaved: boolean,
): { saved: Record<string, string>; effects: Effect[] } {
  const saved: Record<string, string> = { ...state.saved };
  const effects: Effect[] = [];
  for (const { key, phase } of keysForItem(state.config, item)) {
    const had = key in saved;
    const text = saved[key] ?? '';
    saved[key] = text;
    if (!(trustSaved && had)) effects.push({ type: 'persist', key, item, phase, text, final: true });
  }
  return { saved, effects };
}

function end(state: RunnerState, endedBy: EndedBy, position: Position, priorEffects: Effect[] = []): Step {
  const next: RunnerState = { ...state, status: 'ended', endedBy, position };
  const responses = responsesOf(next);
  const done: Effect = endedBy === 'abandon' ? { type: 'abandoned', responses } : { type: 'submitted', responses };
  return { state: next, effects: [...priorEffects, done] };
}

/**
 * Move the engine to where the clock says it is. Every reduce runs this
 * first, because time has passed whatever the event was. In sequential modes
 * it seals every item whose window has closed — one or fifty, a refresh looks
 * the same as a tick — then releases the live one. On expiry it seals the
 * remainder and submits.
 */
function catchUp(state: RunnerState, nowMs: number, trustSaved: boolean): Step {
  const position = positionAt(state.schedule, nowMs);
  const effects: Effect[] = [];
  let saved = state.saved;
  let currentItem = state.currentItem;

  if (position.status === 'expired') {
    if (isSequential(state.config)) {
      for (let i = currentItem; i < itemCount(state.config); i++) {
        const r = seal({ ...state, saved }, i, trustSaved);
        saved = r.saved;
        effects.push(...r.effects);
      }
    }
    return end({ ...state, saved }, 'expiry', position, effects);
  }

  if (position.status === 'live' && isSequential(state.config) && position.item !== null) {
    while (currentItem < position.item) {
      const r = seal({ ...state, saved }, currentItem, trustSaved);
      saved = r.saved;
      effects.push(...r.effects);
      currentItem++;
    }
    if (currentItem !== state.currentItem) effects.push({ type: 'release', item: currentItem });
  }

  return { state: { ...state, position, saved, currentItem }, effects };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reconstruct a session from what the server holds. This is also how a
 * session starts — `start` is resume with nothing saved.
 */
export function resume(
  config: RunnerConfig,
  startedAtMs: number,
  saved: Readonly<Record<string, string>>,
  nowMs: number,
): Step {
  assertValidConfig(config);
  const schedule = buildSchedule(config, startedAtMs);
  const base: RunnerState = {
    config,
    schedule,
    status: 'live',
    endedBy: null,
    currentItem: 0,
    position: positionAt(schedule, startedAtMs),
    saved,
  };

  // What the client is served on arrival. Sequential modes get only the live
  // item; everything else is served whole (without keys — see `release`).
  const served: Effect[] = isSequential(config)
    ? []
    : Array.from({ length: itemCount(config) }, (_, item) => ({ type: 'release', item }));

  const caught = catchUp(base, nowMs, true);
  if (caught.state.status === 'ended') return { state: caught.state, effects: [...served, ...caught.effects] };

  // catchUp releases only when it moved. On arrival the live item is always served.
  const releasedLive = caught.effects.some((e) => e.type === 'release');
  const live: Effect[] = isSequential(config) && !releasedLive ? [{ type: 'release', item: caught.state.currentItem }] : [];
  return { state: caught.state, effects: [...served, ...caught.effects, ...live] };
}

export function start(config: RunnerConfig, startedAtMs: number, nowMs: number = startedAtMs): Step {
  return resume(config, startedAtMs, {}, nowMs);
}

export function reduce(state: RunnerState, event: RunnerEvent, nowMs: number): Step {
  if (state.status === 'ended') return { state, effects: [] };

  const caught = catchUp(state, nowMs, false);
  if (caught.state.status === 'ended') return caught;
  const s = caught.state;
  const effects: Effect[] = [...caught.effects];
  const rules = MODE_RULES[s.config.mode];

  switch (event.type) {
    case 'tick':
      return { state: s, effects };

    case 'input': {
      const phase = s.position.status === 'live' ? s.position.phase : null;
      // In stimulus → write, the show phase is for looking. Nothing is accepted.
      if (phase !== null && !rules.inputPhases.includes(phase)) return { state: s, effects };
      const inputPhase = rules.inputPhases.length === 0 ? null : phase;
      const key = keyFor(s.currentItem, inputPhase);
      return {
        state: { ...s, saved: { ...s.saved, [key]: event.text } },
        effects: [...effects, { type: 'persist', key, item: s.currentItem, phase: inputPhase, text: event.text, final: false }],
      };
    }

    case 'navigate': {
      if (!rules.freeNavigation) return { state: s, effects };
      if (event.item < 0 || event.item >= itemCount(s.config)) return { state: s, effects };
      return { state: { ...s, currentItem: event.item }, effects };
    }

    case 'submit':
      return end(s, 'submit', s.position, effects);

    case 'abandon':
      return end(s, 'abandon', s.position, effects);
  }
}
