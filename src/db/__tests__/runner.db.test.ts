import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { buildWorld, hasDatabase, leftovers, serviceClient, yearsAgo } from './helpers/world.ts';
import type { World } from './helpers/world.ts';
import { createServerStore } from '../../ui/runner/server-store.ts';
import { loadLiveSession, supabaseSessionApi } from '../../ui/runner/supabase-api.ts';
import type { SessionStore } from '../../ui/runner/session-store.ts';

/**
 * The runner's store against the real project, as a signed-in candidate:
 * the server issues the start time, saves land in `responses`, the server
 * refuses what is late, and a reload finds the session where it was.
 */
describe.skipIf(!hasDatabase)('the runner’s server store', () => {
  let world: World;

  beforeAll(async () => {
    world = await buildWorld({
      cand: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      minor: { role: 'candidate', org: 'a', dob: yearsAgo(16) },
    });
  });

  afterEach(async () => {
    const ids = Object.values(world.people).map((p) => p.id);
    await world.service.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString(), ended_by: 'abandon' }).in('candidate_id', ids).eq('status', 'live');
  });

  afterAll(async () => {
    await world?.destroy();
    expect(await leftovers(serviceClient())).toEqual([]);
  });

  const storeFor = (label: string): SessionStore =>
    createServerStore(supabaseSessionApi(world.people[label].client), { initial: null, serverNowMs: Date.now(), debounceMs: 50, retryMs: 200 });

  async function settled(store: SessionStore) {
    for (let i = 0; i < 100 && store.syncState() !== 'saved'; i++) await new Promise((r) => setTimeout(r, 50));
    expect(store.syncState()).toBe('saved');
  }

  const rows = async (sessionId: string) =>
    (await world.service.from('responses').select('key, response_text, final').eq('session_id', sessionId).order('key')).data;

  const liveId = async (label: string) =>
    (await world.service.from('sessions').select('id').eq('candidate_id', world.people[label].id).eq('status', 'live').single()).data!.id as string;

  it('starts on the server’s clock and saves typing, then the seal', async () => {
    const store = storeFor('cand');
    const before = Date.now();
    const record = await store.create('wat', { input: 'typed', code: null });
    expect(Math.abs(record.startedAtMs - before)).toBeLessThan(15_000);
    expect(Math.abs(store.clockOffsetMs())).toBeLessThan(15_000);

    const id = await liveId('cand');
    store.persist('wat', '0', 'Cou', false);
    store.persist('wat', '0', 'Courage', false);
    await settled(store);
    expect(await rows(id)).toEqual([{ key: '0', response_text: 'Courage', final: false }]);

    store.persist('wat', '0', 'Courage is quiet', true);
    await settled(store);
    expect(await rows(id)).toEqual([{ key: '0', response_text: 'Courage is quiet', final: true }]);
  });

  it('accepts the server’s refusal of a late answer and keeps what was saved in time', async () => {
    const store = storeFor('cand');
    await store.create('wat', { input: 'typed', code: null });
    const id = await liveId('cand');
    store.persist('wat', '0', 'in time', false);
    await settled(store);

    // Move the session 20 s into the past: word 0's window (15 s + 2 s grace) has closed.
    const { data: s } = await world.service.from('sessions').select('started_at, expires_at').eq('id', id).single();
    const back = (t: string) => new Date(Date.parse(t) - 20_000).toISOString();
    await world.service.from('sessions').update({ started_at: back(s!.started_at), expires_at: back(s!.expires_at) }).eq('id', id);

    store.persist('wat', '0', 'too late', true);
    await settled(store);
    expect(await rows(id)).toEqual([{ key: '0', response_text: 'in time', final: false }]);
  });

  it('finds the session again after a reload, with its answers', async () => {
    const store = storeFor('cand');
    await store.create('wat', { input: 'typed', code: null });
    store.persist('wat', '0', 'before the reload', false);
    await settled(store);

    const found = await loadLiveSession(world.people.cand.client, 'wat');
    expect(found).toMatchObject({ instrument: 'wat', input: 'typed', saved: { '0': 'before the reload' }, endedBy: null });
  });

  it('resumes the running session when Begin is pressed again elsewhere', async () => {
    const first = await storeFor('cand').create('wat', { input: 'typed', code: null });
    const second = await storeFor('cand').create('wat', { input: 'typed', code: null });
    expect(second.startedAtMs).toBe(first.startedAtMs);
  });

  it('ends the session on the server', async () => {
    const store = storeFor('cand');
    await store.create('wat', { input: 'typed', code: null });
    const id = await liveId('cand');
    store.finish('wat', 'abandon');
    await settled(store);
    const { data } = await world.service.from('sessions').select('status, ended_by').eq('id', id).single();
    expect(data).toEqual({ status: 'ended', ended_by: 'abandon' });
  });

  it('keeps a paper session’s code and sends no typed answers for it (D22)', async () => {
    const store = storeFor('cand');
    await store.create('wat', { input: 'paper', code: 'ACD-EFG' });
    const id = await liveId('cand');
    store.persist('wat', '0', '', true);
    await settled(store);
    expect(await rows(id)).toEqual([]);
    const { data } = await world.service.from('sessions').select('input_mode, paper_code').eq('id', id).single();
    expect(data).toEqual({ input_mode: 'paper', paper_code: 'ACD-EFG' });
  });

  it('passes the server’s reason through when a start is refused', async () => {
    await expect(storeFor('minor').create('wat', { input: 'typed', code: null })).rejects.toThrow('consent_required');
  });
});
