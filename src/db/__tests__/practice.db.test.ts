import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { buildWorld, FIXTURE_ITEM_PREFIX, hasDatabase, leftovers, serviceClient, yearsAgo } from './helpers/world.ts';
import type { World } from './helpers/world.ts';

/**
 * Chapter practice (0007, D26). A candidate answers one question and only then
 * learns the key and its rule; the answer is kept, so progress survives. The
 * key is never readable any other way (items.db.test.ts), and staff answers
 * are flagged so item statistics can leave them out — as for sessions (D25).
 */

const ADULT = '2005-01-15';
const SPECS = {
  cand: { role: 'candidate', org: 'a', dob: ADULT },
  other: { role: 'candidate', org: 'b', dob: ADULT },
  mentorA: { role: 'mentor', org: 'a', dob: '1990-06-01' },
  mentorB: { role: 'mentor', org: 'b', dob: '1990-06-01' },
  minor: { role: 'candidate', org: 'a', dob: yearsAgo(16) },
  minorConsented: { role: 'candidate', org: 'a', dob: yearsAgo(16), guardianConsent: true },
} as const;

describe.skipIf(!hasDatabase)('chapter practice', () => {
  let world: World;
  let live: string;
  let retired: string;
  let wat: string;

  const row = (id: string, active = true, type = 'oir_verbal') => ({
    id,
    assessment_type: type,
    difficulty: 3,
    payload:
      type === 'wat'
        ? { word: 'fixture' }
        : { stem: '2, 4, 6, ?', options: { A: '7', B: '8', C: '9', D: '10' }, reasoningType: 'series', direction: 'Find the missing number.' },
    active,
    source: 'fixture',
    source_ref: 'fixture',
  });

  const answer = (who: keyof typeof SPECS, item: string, chosen: string) =>
    world.people[who].client.rpc('answer_practice', { p_item_id: item, p_chosen: chosen });

  beforeAll(async () => {
    world = await buildWorld(SPECS);
    live = `${FIXTURE_ITEM_PREFIX}${world.run}-live`;
    retired = `${FIXTURE_ITEM_PREFIX}${world.run}-retired`;
    wat = `${FIXTURE_ITEM_PREFIX}${world.run}-wat`;
    const { error } = await world.service.from('items').insert([row(live), row(retired, false), row(wat, true, 'wat')]);
    if (error) throw new Error(`fixture items: ${error.message}`);
    const keys = await world.service.from('item_keys').insert([
      { item_id: live, key: 'B', key_basis: 'derived', rule: '+2' },
      { item_id: retired, key: 'B', key_basis: 'derived', rule: '+2' },
    ]);
    if (keys.error) throw new Error(`fixture keys: ${keys.error.message}`);
  });

  afterAll(async () => {
    // Deleting the items cascades to their practice answers.
    if (world) await world.service.from('items').delete().like('id', `${FIXTURE_ITEM_PREFIX}${world.run}-%`);
    await world?.destroy();
    expect(await leftovers(serviceClient())).toEqual([]);
  });

  it('answering returns the key and its rule, and keeps the answer', async () => {
    const { data, error } = await answer('cand', live, 'B');
    expect(error).toBeNull();
    expect(data).toEqual([{ correct: true, key: 'B', rule: '+2' }]);

    const wrong = await answer('cand', live, 'c');
    expect(wrong.data).toEqual([{ correct: false, key: 'B', rule: '+2' }]);

    const { data: rows } = await world.people.cand.client
      .from('practice_answers')
      .select('item_id, chosen, correct, by_staff')
      .eq('item_id', live)
      .order('answered_at');
    expect(rows).toEqual([
      { item_id: live, chosen: 'B', correct: true, by_staff: false },
      { item_id: live, chosen: 'C', correct: false, by_staff: false },
    ]);
  });

  it("a candidate sees only their own answers; staff see their own academy's", async () => {
    await answer('other', live, 'A');
    const mine = await world.people.cand.client.from('practice_answers').select('candidate_id').eq('item_id', live);
    expect(new Set((mine.data ?? []).map((r) => r.candidate_id))).toEqual(new Set([world.people.cand.id]));

    const a = await world.people.mentorA.client.from('practice_answers').select('candidate_id').eq('item_id', live);
    expect((a.data ?? []).map((r) => r.candidate_id)).toContain(world.people.cand.id);
    expect((a.data ?? []).map((r) => r.candidate_id)).not.toContain(world.people.other.id);

    const b = await world.people.mentorB.client.from('practice_answers').select('candidate_id').eq('item_id', live);
    expect((b.data ?? []).map((r) => r.candidate_id)).not.toContain(world.people.cand.id);
  });

  it("staff can practise, and their answers are flagged by the database", async () => {
    const { error } = await answer('mentorA', live, 'B');
    expect(error).toBeNull();
    const { data } = await world.service.from('practice_answers').select('by_staff').eq('candidate_id', world.people.mentorA.id);
    expect(data).toEqual([{ by_staff: true }]);
  });

  it('refuses a choice that is not A-D', async () => {
    for (const bad of ['E', '', 'AB']) expect((await answer('cand', live, bad)).error?.message).toMatch(/bad_choice/);
  });

  it('refuses a retired item, an unknown one, and one with no options to choose from', async () => {
    for (const item of [retired, `${FIXTURE_ITEM_PREFIX}${world.run}-nope`, wat]) {
      expect((await answer('cand', item, 'B')).error?.message).toMatch(/unknown_item/);
    }
  });

  it('stops an under-18 without guardian consent, and lets them once consent is recorded', async () => {
    expect((await answer('minor', live, 'B')).error?.message).toMatch(/consent_required/);
    expect((await answer('minorConsented', live, 'B')).error).toBeNull();
  });

  it('a signed-in user cannot write an answer directly', async () => {
    const c = world.people.cand.client;
    const insert = await c.from('practice_answers').insert({ candidate_id: world.people.cand.id, item_id: live, chosen: 'B', correct: true });
    expect(insert.error).not.toBeNull();
    await c.from('practice_answers').update({ correct: true }).eq('item_id', live);
    const { data } = await world.service.from('practice_answers').select('correct').eq('candidate_id', world.people.cand.id).order('answered_at');
    expect(data!.map((r) => r.correct)).toEqual([true, false]);
  });

  it('a visitor who is not signed in can neither answer nor read', async () => {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect((await anon.rpc('answer_practice', { p_item_id: live, p_chosen: 'B' })).error).not.toBeNull();
    expect((await anon.from('practice_answers').select('id')).data ?? []).toEqual([]);
  });
});
