import type { EndedBy } from '../../runner/engine.ts';
import type { RunnerInstrument } from '../../runner/modes.ts';
import type { InputMode, SessionRecord, SessionStore, SyncState } from './session-store.ts';

/**
 * The runner's store in the app (Sprint 1). The server is the clock and the
 * record:
 *   - start_session stamps the start time, so a phone with a wrong clock or a
 *     refresh buys nothing (UI.md §3.2);
 *   - the countdown runs on Date.now() + the measured offset to the server;
 *   - typing is batched (latest text per word, after a short pause); a seal —
 *     the moment a word's window closes — is sent at once;
 *   - a network failure is retried and shown ("offline"); an answer the
 *     server refuses as too late is dropped, not retried forever;
 *   - paper sessions send nothing: their answers are on the sheet (D22).
 *
 * Talks to the database through SessionApi, so the logic is tested against a
 * fake (server-store.test.ts) and the real adapter against the project
 * (runner.db.test.ts).
 */

export interface ServerRecord extends SessionRecord {
  readonly id: string;
}

export interface SessionApi {
  /** `testId`: an OIR mock attempt (D32), started through start_test; null for every other test. */
  start(instrument: RunnerInstrument, input: InputMode, code: string | null, testId: string | null): Promise<{ id: string; startedAtMs: number } | { error: string }>;
  /** `error` is the server's code (item_closed, …) or 'network' when the request did not complete. */
  save(id: string, key: string, text: string, final: boolean): Promise<{ error: string | null }>;
  end(id: string, endedBy: EndedBy): Promise<{ error: string | null }>;
  loadLive(instrument: RunnerInstrument): Promise<ServerRecord | null>;
}

/** Refusals that will never succeed on a retry. Anything else is treated as a transient failure. */
const PERMANENT = /item_closed|item_sealed|item_not_open|session_ended|paper_session|bad_key|bad_answer|too_long|not_your_session/;
const MAX_END_RETRIES = 5;

interface Options {
  readonly initial: ServerRecord | null;
  /** The server's Date.now() when the page was rendered. */
  readonly serverNowMs: number;
  readonly clientNowMs?: number;
  readonly debounceMs?: number;
  readonly retryMs?: number;
}

interface Pending {
  readonly id: string;
  readonly key: string;
  readonly text: string;
  readonly final: boolean;
}

export function createServerStore(api: SessionApi, options: Options): SessionStore {
  const debounceMs = options.debounceMs ?? 600;
  const retryMs = options.retryMs ?? 2_000;
  const records = new Map<string, ServerRecord>();
  if (options.initial) records.set(options.initial.instrument, options.initial);
  let offset = options.serverNowMs - (options.clientNowMs ?? Date.now());

  const pending = new Map<string, Pending>();
  let ending: { id: string; endedBy: EndedBy; attempts: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let again = false;
  let state: SyncState = 'saved';
  const listeners = new Set<() => void>();

  const setState = (next: SyncState) => {
    if (next === state) return;
    state = next;
    for (const l of listeners) l();
  };

  const schedule = (ms: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, ms);
  };

  async function flush(): Promise<void> {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      for (const [slot, item] of [...pending]) {
        const { error } = await api.save(item.id, item.key, item.text, item.final);
        if (error && !PERMANENT.test(error)) {
          setState('offline');
          schedule(retryMs);
          return;
        }
        // Only clear the slot if nothing newer was typed into it while this save was in flight.
        if (pending.get(slot) === item) pending.delete(slot);
      }
      if (pending.size > 0) {
        schedule(debounceMs);
        return;
      }
      if (ending) {
        const { error } = await api.end(ending.id, ending.endedBy);
        if (error && error !== 'session_ended' && ending.attempts < MAX_END_RETRIES) {
          ending = { ...ending, attempts: ending.attempts + 1 };
          setState('offline');
          schedule(retryMs);
          return;
        }
        ending = null;
      }
      setState('saved');
    } finally {
      running = false;
      if (again) {
        again = false;
        void flush();
      }
    }
  }

  return {
    load: (instrument) => records.get(instrument) ?? null,

    async create(instrument, { input, code, testId = null }) {
      const sentAt = Date.now();
      const result = await api.start(instrument, input, code, testId);
      const receivedAt = Date.now();
      if ('error' in result) {
        if (result.error === 'session_live') {
          const running = await api.loadLive(instrument);
          if (running) {
            records.set(instrument, running);
            return running;
          }
        }
        throw new Error(result.error);
      }
      // The server stamped the start between sending and receiving; the midpoint is the best estimate of when.
      offset = result.startedAtMs - (sentAt + receivedAt) / 2;
      const record: ServerRecord = { id: result.id, instrument, input, code, startedAtMs: result.startedAtMs, saved: {}, endedBy: null, testId };
      records.set(instrument, record);
      return record;
    },

    persist(instrument, key, text, final) {
      const r = records.get(instrument);
      if (!r) return;
      records.set(instrument, { ...r, saved: { ...r.saved, [key]: text } });
      if (r.input === 'paper') return;
      const slot = `${r.id}|${key}`;
      pending.set(slot, { id: r.id, key, text, final: final || pending.get(slot)?.final === true });
      if (state !== 'offline') setState('saving');
      schedule(final ? 0 : debounceMs);
    },

    finish(instrument, endedBy) {
      const r = records.get(instrument);
      if (!r) return;
      records.set(instrument, { ...r, endedBy });
      ending = { id: r.id, endedBy, attempts: 0 };
      if (state !== 'offline') setState('saving');
      schedule(0);
    },

    clear(instrument) {
      const r = records.get(instrument);
      records.delete(instrument);
      if (r) for (const [slot, item] of pending) if (item.id === r.id) pending.delete(slot);
    },

    clockOffsetMs: () => offset,
    syncState: () => state,
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}
