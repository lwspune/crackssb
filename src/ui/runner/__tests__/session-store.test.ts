import { describe, it, expect, beforeEach } from 'vitest';
import { createLocalStore, createMemoryStore } from '../session-store.ts';
import type { SessionStore } from '../session-store.ts';

/** A Storage stand-in, so the local store is tested against the interface it uses. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

const T0 = 1_800_000_000_000;

for (const [name, make] of [
  ['memory', () => createMemoryStore()],
  ['local', () => createLocalStore(fakeStorage())],
] as const) {
  describe(`${name} session store`, () => {
    let store: SessionStore;
    beforeEach(() => { store = make(); });

    it('has nothing for an instrument never started', () => {
      expect(store.load('wat')).toBeNull();
    });

    it('fixes the start time when the session is created', () => {
      store.create('wat', T0);
      expect(store.load('wat')).toMatchObject({ instrument: 'wat', startedAtMs: T0, saved: {}, endedBy: null });
    });

    it('keeps each response under its key, the latest text winning', () => {
      store.create('wat', T0);
      store.persist('wat', '0', 'first');
      store.persist('wat', '0', 'first thought');
      store.persist('wat', '1', '');
      expect(store.load('wat')?.saved).toEqual({ '0': 'first thought', '1': '' });
    });

    it('records how the session ended', () => {
      store.create('wat', T0);
      store.finish('wat', 'abandon');
      expect(store.load('wat')?.endedBy).toBe('abandon');
    });

    it('forgets a session on clear, so the next one starts fresh', () => {
      store.create('wat', T0);
      store.clear('wat');
      expect(store.load('wat')).toBeNull();
    });

    it('is typed unless told otherwise', () => {
      store.create('wat', T0);
      expect(store.load('wat')).toMatchObject({ input: 'typed', code: null });
    });

    it('remembers a paper session and the code written on its sheet (D22)', () => {
      store.create('wat', T0, { input: 'paper', code: 'ACD-EFG' });
      expect(store.load('wat')).toMatchObject({ input: 'paper', code: 'ACD-EFG' });
    });

    it('ignores writes for a session that does not exist rather than inventing one', () => {
      store.persist('wat', '0', 'orphan');
      expect(store.load('wat')).toBeNull();
    });
  });
}

describe('local session store', () => {
  it('survives a reload — a new store over the same storage sees the session', () => {
    const storage = fakeStorage();
    const first = createLocalStore(storage);
    first.create('wat', T0);
    first.persist('wat', '0', 'kept');
    expect(createLocalStore(storage).load('wat')).toMatchObject({ startedAtMs: T0, saved: { '0': 'kept' } });
  });

  it('reads a session saved before paper mode existed as typed', () => {
    const storage = fakeStorage();
    storage.setItem('crackssb:session:wat', JSON.stringify({ instrument: 'wat', startedAtMs: T0, saved: {}, endedBy: null }));
    expect(createLocalStore(storage).load('wat')).toMatchObject({ input: 'typed', code: null });
  });

  it('treats unreadable storage as no session instead of crashing the runner', () => {
    const storage = fakeStorage();
    storage.setItem('crackssb:session:wat', '{not json');
    expect(createLocalStore(storage).load('wat')).toBeNull();
  });
});
