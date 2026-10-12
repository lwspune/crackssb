import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryStore } from '../session-store.ts';
import type { SessionStore } from '../session-store.ts';

/**
 * The store contract every runner store keeps. The memory store is the
 * reference implementation (tests, and storage-blocked fallbacks); the
 * Supabase store keeps the same contract with the server as its clock.
 */
const T0 = 1_800_000_000_000;

describe('memory session store', () => {
  let store: SessionStore;
  beforeEach(() => {
    store = createMemoryStore({ now: () => T0 });
  });

  it('has nothing for an instrument never started', () => {
    expect(store.load('wat')).toBeNull();
  });

  it('decides the start time itself — the caller never supplies one', async () => {
    const record = await store.create('wat', { input: 'typed', code: null });
    expect(record).toMatchObject({ instrument: 'wat', startedAtMs: T0, saved: {}, endedBy: null });
    expect(store.load('wat')).toEqual(record);
  });

  it('keeps each response under its key, the latest text winning', async () => {
    await store.create('wat', { input: 'typed', code: null });
    store.persist('wat', '0', 'first', false);
    store.persist('wat', '0', 'first thought', false);
    store.persist('wat', '1', '', true);
    expect(store.load('wat')?.saved).toEqual({ '0': 'first thought', '1': '' });
  });

  it('records how the session ended', async () => {
    await store.create('wat', { input: 'typed', code: null });
    store.finish('wat', 'abandon');
    expect(store.load('wat')?.endedBy).toBe('abandon');
  });

  it('forgets a session on clear, so the next one starts fresh', async () => {
    await store.create('wat', { input: 'typed', code: null });
    store.clear('wat');
    expect(store.load('wat')).toBeNull();
  });

  it('remembers a paper session and the code written on its sheet (D22)', async () => {
    await store.create('wat', { input: 'paper', code: 'ACD-EFG' });
    expect(store.load('wat')).toMatchObject({ input: 'paper', code: 'ACD-EFG' });
  });

  it('ignores writes for a session that does not exist rather than inventing one', () => {
    store.persist('wat', '0', 'orphan', false);
    expect(store.load('wat')).toBeNull();
  });

  it('has no clock offset and is always saved — there is nowhere else to save to', () => {
    expect(store.clockOffsetMs()).toBe(0);
    expect(store.syncState()).toBe('saved');
  });

  it('can start from a session that already exists, as a reload does', () => {
    const resumed = createMemoryStore({ initial: { instrument: 'wat', input: 'typed', code: null, startedAtMs: T0, saved: { '0': 'kept' }, endedBy: null } });
    expect(resumed.load('wat')?.saved).toEqual({ '0': 'kept' });
  });
});
