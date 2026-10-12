import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { buildWorld, FIXTURE_ITEM_PREFIX, hasDatabase, leftovers, serviceClient } from './helpers/world.ts';
import type { World } from './helpers/world.ts';

/**
 * The item bank (0005). A signed-in user reads the questions; nobody but the
 * server reads the answers. Run as real users through the public key.
 */

const ADULT = '2005-01-15';
const SPECS = {
  cand: { role: 'candidate', org: 'a', dob: ADULT },
  mentor: { role: 'mentor', org: 'a', dob: '1990-06-01' },
} as const;

describe.skipIf(!hasDatabase)('item bank access rules', () => {
  let world: World;
  let live: string;
  let retired: string;

  const row = (id: string, active = true) => ({
    id,
    assessment_type: 'oir_verbal',
    difficulty: 3,
    payload: { stem: '2, 4, 6, ?', options: { A: '7', B: '8', C: '9', D: '10' }, reasoningType: 'series', direction: 'Find the missing number.' },
    active,
    source: 'fixture',
    source_ref: 'fixture',
  });

  beforeAll(async () => {
    world = await buildWorld(SPECS);
    live = `${FIXTURE_ITEM_PREFIX}${world.run}-live`;
    retired = `${FIXTURE_ITEM_PREFIX}${world.run}-retired`;
    const { error } = await world.service.from('items').insert([row(live), row(retired, false)]);
    if (error) throw new Error(`fixture items: ${error.message}`);
    const keys = await world.service.from('item_keys').insert([
      { item_id: live, key: 'B', key_basis: 'derived', rule: '+2' },
      { item_id: retired, key: 'B', key_basis: 'derived', rule: '+2' },
    ]);
    if (keys.error) throw new Error(`fixture keys: ${keys.error.message}`);
  });

  afterAll(async () => {
    if (world) await world.service.from('items').delete().like('id', `${FIXTURE_ITEM_PREFIX}${world.run}-%`);
    await world?.destroy();
    expect(await leftovers(serviceClient())).toEqual([]);
  });

  it('a signed-in candidate and a mentor can read an active item', async () => {
    for (const who of ['cand', 'mentor'] as const) {
      const { data, error } = await world.people[who].client.from('items').select('id, payload').eq('id', live);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].payload).not.toHaveProperty('key');
    }
  });

  it('a retired item is not served', async () => {
    const { data } = await world.people.cand.client.from('items').select('id').eq('id', retired);
    expect(data ?? []).toEqual([]);
  });

  it('no signed-in user can read an answer key', async () => {
    for (const who of ['cand', 'mentor'] as const) {
      const { data } = await world.people[who].client.from('item_keys').select('key').eq('item_id', live);
      expect(data ?? []).toEqual([]);
    }
  });

  it('a visitor who is not signed in reads nothing', async () => {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect((await anon.from('items').select('id').eq('id', live)).data ?? []).toEqual([]);
    expect((await anon.from('item_keys').select('key').eq('item_id', live)).data ?? []).toEqual([]);
  });

  it('a signed-in user cannot add or change an item', async () => {
    const c = world.people.cand.client;
    expect((await c.from('items').insert(row(`${FIXTURE_ITEM_PREFIX}${world.run}-sneak`))).error).not.toBeNull();
    await c.from('items').update({ difficulty: 5 }).eq('id', live);
    const { data } = await world.service.from('items').select('difficulty').eq('id', live).single();
    expect(data!.difficulty).toBe(3);
  });

  it('the database refuses an item that carries its key in the payload', async () => {
    const leaky = row(`${FIXTURE_ITEM_PREFIX}${world.run}-leaky`);
    const { error } = await world.service.from('items').insert({ ...leaky, payload: { ...leaky.payload, key: 'B' } });
    expect(error?.code).toBe('23514'); // check_violation
  });

  it('refuses a key that is not A-D or a basis it does not know', async () => {
    const bad = [
      { item_id: live, key: 'E', key_basis: 'derived' },
      { item_id: live, key: 'A', key_basis: 'guessed' },
    ];
    for (const k of bad) {
      const { error } = await world.service.from('item_keys').upsert(k);
      expect(error?.code).toBe('23514');
    }
  });
});
