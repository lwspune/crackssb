import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildWorld, hasDatabase, leftovers, serviceClient, yearsAgo } from './helpers/world.ts';
import type { World } from './helpers/world.ts';

/**
 * OIR mocks in the database (0009, D32). A mock is a fixed, ordered list of
 * questions with a time limit. Starting one sets the deadline on the server;
 * an answer is A–D (or blank) for a question in that mock, until the deadline;
 * the key comes back only once the attempt is over, to the candidate or their
 * academy's staff; and a mock anyone has sat can no longer change.
 */
describe.skipIf(!hasDatabase)('OIR mocks', () => {
  let world: World;
  const service = serviceClient();
  let full = '';
  let short = '';
  let items: string[] = [];

  beforeAll(async () => {
    world = await buildWorld({
      candA: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA2: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      mentorA: { role: 'mentor', org: 'a', dob: '1990-01-01' },
      mentorB: { role: 'mentor', org: 'b', dob: '1990-01-01' },
      minorA: { role: 'candidate', org: 'a', dob: yearsAgo(15) },
    });
    full = `test-${world.run}-full`;
    short = `test-${world.run}-short`;
    items = [0, 1, 2].map((i) => `test-${world.run}-q${i}`);
    const payload = (i: number) => ({ stem: `Question ${i}`, options: { A: '1', B: '2', C: '3', D: '4' }, reasoningType: 'series' });
    const must = (r: { error: { message: string } | null }, what: string) => {
      if (r.error) throw new Error(`${what}: ${r.error.message}`);
    };
    must(await service.from('items').insert(items.map((id, i) => ({ id, assessment_type: 'oir_verbal', difficulty: 3, payload: payload(i), source: 'fixture' }))), 'items');
    must(await service.from('item_keys').insert(items.map((id, i) => ({ item_id: id, key: 'ABC'[i], key_basis: 'derived', rule: `rule ${i}` }))), 'keys');
    must(
      await service.from('tests').insert([
        { id: full, assessment_type: 'oir', title: 'Fixture mock', item_count: 3, time_limit_seconds: 600 },
        { id: short, assessment_type: 'oir', title: 'Fixture short', item_count: 3, time_limit_seconds: 600 },
      ]),
      'tests',
    );
    must(await service.from('test_items').insert(items.map((item_id, ordinal) => ({ test_id: full, ordinal, item_id }))), 'test_items');
    must(await service.from('test_items').insert(items.slice(0, 2).map((item_id, ordinal) => ({ test_id: short, ordinal, item_id }))), 'short items');
  });

  afterAll(async () => {
    // Users first: their sessions go with them, and an unsat mock can be removed.
    await world?.destroy();
    await service.from('test_items').delete().in('test_id', [full, short]);
    await service.from('tests').delete().in('id', [full, short]);
    await service.from('items').delete().in('id', items);
    expect(await leftovers(service)).toEqual([]);
  });

  const start = (who: string, test = full) => world.people[who].client.rpc('start_test', { p_test_id: test });
  const save = (who: string, session: string, ordinal: number, answer: string) =>
    world.people[who].client.rpc('save_response', { p_session_id: session, p_key: String(ordinal), p_text: answer, p_final: false });
  const result = (who: string, session: string) => world.people[who].client.rpc('test_result', { p_session_id: session });

  let session = '';

  describe('starting (start_test)', () => {
    it('starts a mock with the deadline set by the server', async () => {
      const { data, error } = await start('candA');
      expect(error).toBeNull();
      session = data.id;
      expect(data).toMatchObject({ assessment_type: 'oir', test_id: full, status: 'live', by_staff: false });
      expect(new Date(data.expires_at).getTime() - new Date(data.started_at).getTime()).toBe(600_000);
    });

    it('runs one mock at a time', async () => {
      expect((await start('candA')).error?.message).toMatch(/session_live/);
    });

    it('marks a staff attempt as staff', async () => {
      const { data } = await start('mentorA');
      expect(data.by_staff).toBe(true);
    });

    it('refuses an under-18 without guardian consent, an unknown mock and an unfinished one', async () => {
      expect((await start('minorA')).error?.message).toMatch(/consent_required/);
      expect((await start('candA2', `test-${world.run}-nope`)).error?.message).toMatch(/unknown_test/);
      expect((await start('candA2', short)).error?.message).toMatch(/test_incomplete/);
    });

    it('cannot be started as a plain session, without a mock', async () => {
      expect((await world.people.candA2.client.rpc('start_session', { p_assessment_type: 'oir' })).error).not.toBeNull();
    });
  });

  describe('answering (save_response)', () => {
    it('takes A to D, changed as often as the candidate likes', async () => {
      expect((await save('candA', session, 0, 'B')).error).toBeNull();
      expect((await save('candA', session, 0, 'A')).error).toBeNull();
      expect((await save('candA', session, 1, 'D')).error).toBeNull();
    });

    it('refuses anything else, and a question past the end of the mock', async () => {
      expect((await save('candA', session, 2, 'E')).error?.message).toMatch(/bad_answer/);
      expect((await save('candA', session, 2, 'a long essay')).error?.message).toMatch(/bad_answer/);
      expect((await save('candA', session, 3, 'A')).error?.message).toMatch(/bad_key/);
    });
  });

  describe('the result (test_result)', () => {
    it('is not given while the mock is running', async () => {
      expect((await result('candA', session)).error?.message).toMatch(/session_live/);
    });

    it('gives each question with the answer chosen, the key and its rule once the mock is submitted', async () => {
      await world.people.candA.client.rpc('end_session', { p_session_id: session, p_ended_by: 'submit' });
      const { data, error } = await result('candA', session);
      expect(error).toBeNull();
      expect(data).toEqual([
        { ordinal: 0, item_id: items[0], chosen: 'A', key: 'A', rule: 'rule 0', reasoning_type: 'series' },
        { ordinal: 1, item_id: items[1], chosen: 'D', key: 'B', rule: 'rule 1', reasoning_type: 'series' },
        { ordinal: 2, item_id: items[2], chosen: '', key: 'C', rule: 'rule 2', reasoning_type: 'series' },
      ]);
    });

    it('is given to the academy’s staff, and to no one else', async () => {
      expect((await result('mentorA', session)).error).toBeNull();
      expect((await result('candA2', session)).error?.message).toMatch(/not_your_session/);
      expect((await result('mentorB', session)).error?.message).toMatch(/not_your_session/);
    });

    it('is given once the time is up, even if the attempt was never closed', async () => {
      const { data } = await start('candA2');
      await service
        .from('sessions')
        .update({ started_at: new Date(Date.now() - 700_000).toISOString(), expires_at: new Date(Date.now() - 100_000).toISOString() })
        .eq('id', data.id);
      expect((await result('candA2', data.id)).error).toBeNull();
      // And a new attempt closes the stale one rather than refusing.
      expect((await start('candA2')).error).toBeNull();
    });
  });

  describe('a mock someone has sat is fixed', () => {
    it('refuses to change or remove its questions, or its time limit', async () => {
      expect((await service.from('test_items').update({ item_id: items[1] }).eq('test_id', full).eq('ordinal', 0)).error?.message).toMatch(/test_fixed/);
      expect((await service.from('test_items').delete().eq('test_id', full).eq('ordinal', 2)).error?.message).toMatch(/test_fixed/);
      expect((await service.from('tests').update({ time_limit_seconds: 60 }).eq('id', full)).error?.message).toMatch(/test_fixed/);
    });

    it('refuses to switch off a question any mock uses', async () => {
      expect((await service.from('items').update({ active: false }).eq('id', items[0])).error?.message).toMatch(/item_in_test/);
    });

    it('refuses a question past the mock’s length', async () => {
      expect((await service.from('test_items').insert({ test_id: short, ordinal: 3, item_id: items[2] })).error?.message).toMatch(/bad_ordinal/);
    });
  });

  it('lets any signed-in user read the mocks and their question order', async () => {
    const { data } = await world.people.candA.client.from('test_items').select('ordinal, item_id').eq('test_id', full).order('ordinal');
    expect(data?.map((r) => r.item_id)).toEqual(items);
  });
});
