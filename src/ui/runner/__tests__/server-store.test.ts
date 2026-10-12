import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServerStore } from '../server-store.ts';
import type { SessionApi, ServerRecord } from '../server-store.ts';

/**
 * The runner's store in the app: the server issues the start time, answers
 * are saved through save_response, and the countdown runs on the server's
 * clock. Tested here against a fake API; src/db/__tests__/runner.db.test.ts
 * runs the real one.
 */
const CLIENT_NOW = 1_800_000_000_000;
const SERVER_AHEAD = 5_000;

function fakeApi(overrides: Partial<SessionApi> = {}) {
  const saves: { id: string; key: string; text: string; final: boolean }[] = [];
  const ends: { id: string; endedBy: string }[] = [];
  const api: SessionApi = {
    start: vi.fn(async () => ({ id: 's1', startedAtMs: Date.now() + SERVER_AHEAD })),
    save: vi.fn(async (id, key, text, final) => {
      saves.push({ id, key, text, final });
      return { error: null };
    }),
    end: vi.fn(async (id, endedBy) => {
      ends.push({ id, endedBy });
      return { error: null };
    }),
    loadLive: vi.fn(async () => null),
    ...overrides,
  };
  return { api, saves, ends };
}

const live = (over: Partial<ServerRecord> = {}): ServerRecord => ({
  id: 's0', instrument: 'wat', input: 'typed', code: null, startedAtMs: CLIENT_NOW - 20_000, saved: {}, endedBy: null, ...over,
});

const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(CLIENT_NOW);
});
afterEach(() => vi.useRealTimers());

describe('the clock', () => {
  it('starts from the offset between the server and this device when the page was served', () => {
    const { api } = fakeApi();
    const store = createServerStore(api, { initial: null, serverNowMs: CLIENT_NOW + 3_000 });
    expect(store.clockOffsetMs()).toBe(3_000);
  });

  it('takes the start time from the server and re-measures the offset from that answer', async () => {
    const { api } = fakeApi();
    const store = createServerStore(api, { initial: null, serverNowMs: CLIENT_NOW });
    const record = await store.create('wat', { input: 'typed', code: null });
    expect(record.startedAtMs).toBe(CLIENT_NOW + SERVER_AHEAD);
    expect(store.clockOffsetMs()).toBe(SERVER_AHEAD);
  });
});

describe('starting', () => {
  it('resumes the live session instead when one is already running (another tab, another phone)', async () => {
    const running = live({ saved: { '0': 'from the other tab' } });
    const { api } = fakeApi({ start: vi.fn(async () => ({ error: 'session_live' })), loadLive: vi.fn(async () => running) });
    const store = createServerStore(api, { initial: null, serverNowMs: CLIENT_NOW });
    expect(await store.create('wat', { input: 'typed', code: null })).toEqual(running);
  });

  it('rejects with the server’s reason, for the runner to explain', async () => {
    const { api } = fakeApi({ start: vi.fn(async () => ({ error: 'consent_required' })) });
    const store = createServerStore(api, { initial: null, serverNowMs: CLIENT_NOW });
    await expect(store.create('wat', { input: 'typed', code: null })).rejects.toThrow('consent_required');
  });

  it('passes the paper code through', async () => {
    const { api } = fakeApi();
    const store = createServerStore(api, { initial: null, serverNowMs: CLIENT_NOW });
    await store.create('wat', { input: 'paper', code: 'ACD-EFG' });
    expect(api.start).toHaveBeenCalledWith('wat', 'paper', 'ACD-EFG');
  });
});

describe('saving', () => {
  it('batches typing: only the latest text of a word is sent, once the typist pauses', async () => {
    const { api, saves } = fakeApi();
    const store = createServerStore(api, { initial: live(), serverNowMs: CLIENT_NOW, debounceMs: 600 });
    store.persist('wat', '0', 'C', false);
    store.persist('wat', '0', 'Co', false);
    store.persist('wat', '0', 'Courage', false);
    expect(store.syncState()).toBe('saving');
    await vi.advanceTimersByTimeAsync(599);
    expect(saves).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(saves).toEqual([{ id: 's0', key: '0', text: 'Courage', final: false }]);
    expect(store.syncState()).toBe('saved');
  });

  it('sends a seal at once — the word is gone, its answer must not wait', async () => {
    const { api, saves } = fakeApi();
    const store = createServerStore(api, { initial: live(), serverNowMs: CLIENT_NOW, debounceMs: 600 });
    store.persist('wat', '0', 'Courage', true);
    await flush();
    expect(saves).toEqual([{ id: 's0', key: '0', text: 'Courage', final: true }]);
  });

  it('keeps the answer on screen in step with what was typed', () => {
    const { api } = fakeApi();
    const store = createServerStore(api, { initial: live(), serverNowMs: CLIENT_NOW });
    store.persist('wat', '0', 'typed', false);
    expect(store.load('wat')?.saved['0']).toBe('typed');
  });

  it('retries after a network failure, saying so meanwhile', async () => {
    let fail = true;
    const { api, saves } = fakeApi({
      save: vi.fn(async (id: string, key: string, text: string, final: boolean) => {
        if (fail) return { error: 'network' };
        saves.push({ id, key, text, final });
        return { error: null };
      }),
    });
    const store = createServerStore(api, { initial: live(), serverNowMs: CLIENT_NOW, retryMs: 2_000 });
    const changes = vi.fn();
    store.subscribe(changes);
    store.persist('wat', '0', 'kept', true);
    await flush();
    expect(store.syncState()).toBe('offline');
    expect(changes).toHaveBeenCalled();
    fail = false;
    await vi.advanceTimersByTimeAsync(2_000);
    expect(saves).toEqual([{ id: 's0', key: '0', text: 'kept', final: true }]);
    expect(store.syncState()).toBe('saved');
  });

  it('drops what the server refuses as too late, instead of retrying it forever', async () => {
    const { api } = fakeApi({ save: vi.fn(async () => ({ error: 'item_closed' })) });
    const store = createServerStore(api, { initial: live(), serverNowMs: CLIENT_NOW });
    store.persist('wat', '0', 'too late', true);
    await flush();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(store.syncState()).toBe('saved');
  });

  it('sends nothing for a paper session — its answers are on the sheet (D22)', async () => {
    const { api } = fakeApi();
    const store = createServerStore(api, { initial: live({ input: 'paper', code: 'ACD-EFG' }), serverNowMs: CLIENT_NOW });
    store.persist('wat', '0', '', true);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(api.save).not.toHaveBeenCalled();
  });
});

describe('ending', () => {
  it('sends every pending answer before ending the session', async () => {
    const { api, saves, ends } = fakeApi();
    const store = createServerStore(api, { initial: live(), serverNowMs: CLIENT_NOW, debounceMs: 600 });
    store.persist('wat', '3', 'last words', false);
    store.finish('wat', 'abandon');
    await flush();
    await flush();
    expect(saves.map((s) => s.text)).toEqual(['last words']);
    expect(ends).toEqual([{ id: 's0', endedBy: 'abandon' }]);
    expect(store.load('wat')?.endedBy).toBe('abandon');
  });
});
