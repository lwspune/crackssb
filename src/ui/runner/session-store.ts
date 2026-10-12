import type { EndedBy } from '../../runner/engine.ts';
import type { RunnerInstrument } from '../../runner/modes.ts';

/**
 * Where a runner session lives between keystrokes.
 *
 * The runner talks only to this contract. In the app it is the Supabase
 * store (supabase-store.ts): the server issues the start time, and every
 * answer goes through save_response, which refuses anything outside its
 * window (UI.md §3.2, migration 0001). The memory store below is the
 * reference implementation, used by the tests.
 */

/** D22: answers typed into the runner, or written on a paper sheet and uploaded as photos. */
export type InputMode = 'typed' | 'paper';

export interface SessionRecord {
  readonly instrument: RunnerInstrument;
  readonly input: InputMode;
  /** Paper only: the code written at the top of the sheet, linking its scan to this session. */
  readonly code: string | null;
  readonly startedAtMs: number;
  readonly saved: Readonly<Record<string, string>>;
  readonly endedBy: EndedBy | null;
}

/** Saved: everything has reached the store. Saving: on its way. Offline: retrying. */
export type SyncState = 'saved' | 'saving' | 'offline';

export interface SessionStore {
  load(instrument: RunnerInstrument): SessionRecord | null;
  /** Start a session. The STORE decides the start time — in the app, the server's clock. */
  create(instrument: RunnerInstrument, options: { input: InputMode; code: string | null }): Promise<SessionRecord>;
  /** `final` marks the seal an item gets when its window closes; a store saves those at once. */
  persist(instrument: RunnerInstrument, key: string, text: string, final: boolean): void;
  finish(instrument: RunnerInstrument, endedBy: EndedBy): void;
  clear(instrument: RunnerInstrument): void;
  /** Add to Date.now() to read the store's clock. The countdown runs on this, never on the device alone. */
  clockOffsetMs(): number;
  syncState(): SyncState;
  subscribe(onChange: () => void): () => void;
}

/** In memory only. `now` and `initial` are injected so tests control the clock and the reload. */
export function createMemoryStore(options: { now?: () => number; initial?: SessionRecord | null } = {}): SessionStore {
  const now = options.now ?? Date.now;
  const records = new Map<string, SessionRecord>();
  if (options.initial) records.set(options.initial.instrument, options.initial);
  const update = (instrument: RunnerInstrument, fn: (r: SessionRecord) => SessionRecord) => {
    const current = records.get(instrument);
    if (current) records.set(instrument, fn(current));
  };

  return {
    load: (instrument) => records.get(instrument) ?? null,
    async create(instrument, { input, code }) {
      const record: SessionRecord = { instrument, input, code, startedAtMs: now(), saved: {}, endedBy: null };
      records.set(instrument, record);
      return record;
    },
    persist: (instrument, key, text) => update(instrument, (r) => ({ ...r, saved: { ...r.saved, [key]: text } })),
    finish: (instrument, endedBy) => update(instrument, (r) => ({ ...r, endedBy })),
    clear: (instrument) => void records.delete(instrument),
    clockOffsetMs: () => 0,
    syncState: () => 'saved',
    subscribe: () => () => {},
  };
}
