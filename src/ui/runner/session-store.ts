import type { EndedBy } from '../../runner/engine.ts';
import type { RunnerInstrument } from '../../runner/modes.ts';

/**
 * Where a runner session lives between keystrokes.
 *
 * This is the seam Sprint 1 replaces. The Supabase store issues `startedAtMs`
 * from the server and persists to `responses`; the local store below keeps
 * both on this device, which means a candidate who edits their own storage
 * can buy time. That is acceptable for practice and NOT for anything scored —
 * UI.md §3.2 rule 1. The runner says "practice on this device" while it is
 * on this store.
 */
export interface SessionRecord {
  readonly instrument: RunnerInstrument;
  readonly startedAtMs: number;
  readonly saved: Readonly<Record<string, string>>;
  readonly endedBy: EndedBy | null;
}

export interface SessionStore {
  load(instrument: RunnerInstrument): SessionRecord | null;
  create(instrument: RunnerInstrument, startedAtMs: number): SessionRecord;
  persist(instrument: RunnerInstrument, key: string, text: string): void;
  finish(instrument: RunnerInstrument, endedBy: EndedBy): void;
  clear(instrument: RunnerInstrument): void;
}

/** Shared by both stores: a session is a value, rewritten whole on each change. */
function storeOver(read: (k: string) => SessionRecord | null, write: (k: string, r: SessionRecord | null) => void): SessionStore {
  const update = (instrument: RunnerInstrument, fn: (r: SessionRecord) => SessionRecord) => {
    const current = read(instrument);
    if (current) write(instrument, fn(current));
  };
  return {
    load: (instrument) => read(instrument),
    create(instrument, startedAtMs) {
      const record: SessionRecord = { instrument, startedAtMs, saved: {}, endedBy: null };
      write(instrument, record);
      return record;
    },
    persist: (instrument, key, text) => update(instrument, (r) => ({ ...r, saved: { ...r.saved, [key]: text } })),
    finish: (instrument, endedBy) => update(instrument, (r) => ({ ...r, endedBy })),
    clear: (instrument) => write(instrument, null),
  };
}

export function createMemoryStore(): SessionStore {
  const records = new Map<string, SessionRecord>();
  return storeOver(
    (k) => records.get(k) ?? null,
    (k, r) => (r ? records.set(k, r) : records.delete(k)),
  );
}

const PREFIX = 'crackssb:session:';

export function createLocalStore(storage: Storage): SessionStore {
  return storeOver(
    (k) => {
      const raw = storage.getItem(PREFIX + k);
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        return isRecord(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    (k, r) => (r ? storage.setItem(PREFIX + k, JSON.stringify(r)) : storage.removeItem(PREFIX + k)),
  );
}

function isRecord(v: unknown): v is SessionRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.instrument === 'string' && typeof r.startedAtMs === 'number' && typeof r.saved === 'object' && r.saved !== null;
}
