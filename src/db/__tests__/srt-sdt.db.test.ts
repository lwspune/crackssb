import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildWorld, hasDatabase, leftovers, serviceClient } from './helpers/world.ts';
import type { World } from './helpers/world.ts';
import { INSTRUMENT_CONFIGS } from '../../runner/modes.ts';

/**
 * SRT and SDT in the database (0018, D39, D40). An SRT attempt is at one set
 * of sixty situations, 30 minutes on the server's clock, fixed once sat like a
 * mock (0009). SDT is a plain session: five paragraphs in 15 minutes. Both are
 * on paper (D38), photographed, sent for review and marked on a short rubric:
 * SRT on how many were answered and three headings, SDT each paragraph and two.
 */
const SRT_MARKS = { practical: 4, quick: 3, complete: 4 };
const SDT_MARKS = { honest: 4, consistent: 3 };
const paragraphs = (m: number | null = 3) => [m, m, m, m, null];

describe.skipIf(!hasDatabase)('SRT and SDT', () => {
  let world: World;
  const service = serviceClient();
  let set = '';
  let short = '';
  let tatSet = '';
  let situations: string[] = [];
  let tatItem = '';
  const s: Record<string, string> = {};

  const must = (r: { error: { message: string } | null }, what: string) => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
  };
  const past = { started_at: new Date(Date.now() - 3_600_000).toISOString(), expires_at: new Date(Date.now() - 1_200_000).toISOString() };

  beforeAll(async () => {
    world = await buildWorld({
      candA: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA2: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candB: { role: 'candidate', org: 'b', dob: '2005-01-15' },
      mentorA: { role: 'mentor', org: 'a', dob: '1990-01-01' },
    });
    set = `test-${world.run}-srt`;
    short = `test-${world.run}-srt-short`;
    tatSet = `test-${world.run}-tat`;
    situations = Array.from({ length: 60 }, (_, i) => `test-${world.run}-s${i}`);
    tatItem = `test-${world.run}-t`;
    must(await service.from('items').insert(situations.map((id, i) => ({ id, assessment_type: 'srt', difficulty: 3, payload: { text: `Situation ${i}` }, source: 'fixture' }))), 'srt items');
    must(await service.from('items').insert({ id: tatItem, assessment_type: 'tat', difficulty: 2, payload: { title: 'x', image: '/x.jpg' }, source: 'fixture' }), 'tat item');
    must(
      await service.from('tests').insert([
        { id: set, assessment_type: 'srt', title: 'Fixture SRT', item_count: 60, time_limit_seconds: 1800 },
        { id: short, assessment_type: 'srt', title: 'Fixture SRT short', item_count: 60, time_limit_seconds: 1800 },
        { id: tatSet, assessment_type: 'tat', title: 'Fixture TAT', item_count: 12, time_limit_seconds: 3240 },
      ]),
      'tests',
    );
    must(await service.from('test_items').insert(situations.map((item_id, ordinal) => ({ test_id: set, ordinal, item_id }))), 'set items');
  });

  afterAll(async () => {
    await world?.destroy();
    await service.from('test_items').delete().in('test_id', [set, short, tatSet]);
    await service.from('tests').delete().in('id', [set, short, tatSet]);
    await service.from('items').delete().in('id', [...situations, tatItem]);
    expect(await leftovers(service)).toEqual([]);
  });

  const startSrt = (who: string, test = set, input = 'paper', code: string | null = 'ACD-EFG') =>
    world.people[who].client.rpc('start_srt', { p_test_id: test, p_input_mode: input, p_paper_code: code });
  const startSdt = (who: string, input = 'paper', code: string | null = 'ACD-EFG') =>
    world.people[who].client.rpc('start_session', { p_assessment_type: 'sdt', p_input_mode: input, p_paper_code: code });

  it('keeps the same clocks the runner shows: SRT 60 in 30 min, SDT 5 in 15', async () => {
    const { data } = await service.from('instrument_timings').select('assessment_type, mode, item_count, time_limit_seconds').in('assessment_type', ['srt', 'sdt']).order('assessment_type');
    const srt = INSTRUMENT_CONFIGS.srt;
    const sdt = INSTRUMENT_CONFIGS.sdt;
    expect(data).toEqual([
      { assessment_type: 'sdt', mode: 'free_write', item_count: sdt.mode === 'free_write' ? sdt.itemCount : 0, time_limit_seconds: 900 },
      { assessment_type: 'srt', mode: 'booklet', item_count: srt.mode === 'booklet' ? srt.itemCount : 0, time_limit_seconds: 1800 },
    ]);
  });

  describe('SRT (start_srt)', () => {
    it('starts an attempt at one set, thirty minutes, on paper', async () => {
      const { data, error } = await startSrt('candA');
      expect(error).toBeNull();
      s.srt = data.id;
      expect(data).toMatchObject({ assessment_type: 'srt', test_id: set, input_mode: 'paper', paper_code: 'ACD-EFG', by_staff: false });
      expect(new Date(data.expires_at).getTime() - new Date(data.started_at).getTime()).toBe(1_800_000);
    });

    it('refuses a set short of sixty, a TAT set, and anything that is not a set', async () => {
      expect((await startSrt('candA2', short)).error?.message).toMatch(/test_incomplete/);
      expect((await startSrt('candA2', tatSet)).error?.message).toMatch(/unknown_test/);
      expect((await startSrt('candA2', `test-${world.run}-nope`)).error?.message).toMatch(/unknown_test/);
    });

    it('cannot be started as an OIR mock, nor without a set', async () => {
      expect((await world.people.candA2.client.rpc('start_test', { p_test_id: set })).error?.message).toMatch(/unknown_test/);
      expect((await world.people.candA2.client.rpc('start_session', { p_assessment_type: 'srt' })).error).not.toBeNull();
    });

    it('takes only SRT situations into a set, and none once sat', async () => {
      expect((await service.from('test_items').insert({ test_id: short, ordinal: 0, item_id: tatItem })).error?.message).toMatch(/bad_item/);
      expect((await service.from('test_items').update({ item_id: situations[1] }).eq('test_id', set).eq('ordinal', 0)).error?.message).toMatch(/test_fixed/);
    });

    it('typed (hidden, D38), takes a sentence for a situation in the set — not just A-D', async () => {
      const { data } = await startSrt('candA2', set, 'typed', null);
      s.typed = data.id;
      const save = (key: string, text: string) => world.people.candA2.client.rpc('save_response', { p_session_id: data.id, p_key: key, p_text: text, p_final: false });
      expect((await save('0', 'He will call for help and give first aid.')).error).toBeNull();
      expect((await save('60', 'x')).error?.message).toMatch(/bad_key/);
    });
  });

  describe('SDT (start_session)', () => {
    it('starts a plain fifteen-minute session, on paper', async () => {
      const { data, error } = await startSdt('candB');
      expect(error).toBeNull();
      s.sdt = data.id;
      expect(data).toMatchObject({ assessment_type: 'sdt', test_id: null, input_mode: 'paper' });
      expect(new Date(data.expires_at).getTime() - new Date(data.started_at).getTime()).toBe(900_000);
    });
  });

  describe('photos and sending', () => {
    beforeAll(async () => {
      await service.from('sessions').update(past).in('id', [s.srt, s.sdt, s.typed]);
    });

    it('takes up to four photographed pages for either', async () => {
      for (const [who, id] of [['candA', s.srt], ['candB', s.sdt]] as const) {
        const page = (n: number) => world.people[who].client.rpc('begin_sheet_upload', { p_session_id: id, p_page: n });
        expect((await page(4)).error, who).toBeNull();
        expect((await page(5)).error?.message, who).toMatch(/bad_page/);
      }
    });

    it('is sent once there is something to read: a typed answer, or (on paper) a photo that arrived', async () => {
      expect((await world.people.candA2.client.rpc('submit_for_review', { p_session_id: s.typed })).error).toBeNull();
      // The upload above was only begun: no photo arrived, so nothing to review yet.
      expect((await world.people.candA.client.rpc('submit_for_review', { p_session_id: s.srt })).error?.message).toMatch(/nothing_to_review/);
    });
  });

  describe('review', () => {
    beforeAll(async () => {
      // As if their photos had arrived and they had sent them.
      await service.from('sessions').update({ submitted_for_review_at: new Date().toISOString() }).in('id', [s.srt, s.sdt]);
    });
    const reviewSrt = (who: string, id: string, answered: unknown = 42, marks: unknown = SRT_MARKS) =>
      world.people[who].client.rpc('review_srt', { p_session_id: id, p_answered: answered, p_marks: marks, p_went_well: 'Practical.', p_focus_on: 'Answer more.' });
    const reviewSdt = (who: string, id: string, list: unknown = paragraphs(), marks: unknown = SDT_MARKS) =>
      world.people[who].client.rpc('review_sdt', { p_session_id: id, p_paragraphs: list, p_marks: marks, p_went_well: 'Honest.', p_focus_on: null });

    it('lists SRT and SDT in the queue, by type', async () => {
      const { data } = await world.people.mentorA.client.rpc('review_queue', { p_org: world.orgs.a });
      const types = (data as { session_id: string; assessment_type: string }[]).map((r) => [r.session_id, r.assessment_type]);
      expect(types).toContainEqual([s.srt, 'srt']);
      expect(types).toContainEqual([s.typed, 'srt']);
    });

    it('marks SRT: how many were answered, and three headings 1-5', async () => {
      expect((await reviewSrt('mentorA', s.srt)).error).toBeNull();
      const { data } = await world.people.candA.client.from('evaluations').select('verdict').eq('session_id', s.srt).single();
      expect(data!.verdict).toEqual({ rubric: 'srt-1', answered: 42, marks: SRT_MARKS });
    });

    it('refuses an SRT count outside 0-60 or marks outside the three headings', async () => {
      for (const [answered, marks] of [[61, SRT_MARKS], [-1, SRT_MARKS], [40, { ...SRT_MARKS, quick: 6 }], [40, { practical: 3, quick: 3 }], [40, { ...SRT_MARKS, extra: 3 }]] as const) {
        expect((await reviewSrt('mentorA', s.srt, answered, marks)).error?.message).toMatch(/bad_marks/);
      }
      // Not a whole number: the integer argument refuses it before the function runs.
      expect((await reviewSrt('mentorA', s.srt, 2.5)).error).not.toBeNull();
    });

    it('decides SDT as the reviewer: another academy’s candidate is not found', async () => {
      expect((await reviewSdt('mentorA', s.sdt)).error?.message).toMatch(/not_found/);
    });

    it('marks SDT: each paragraph 1-5 or none, at least one, and two headings', async () => {
      const { data } = await startSdt('candA2', 'paper');
      await service.from('sessions').update({ ...past, submitted_for_review_at: new Date().toISOString() }).eq('id', data.id);
      for (const bad of [[3, 3, 3, 3], [3, 3, 3, 3, 3, 3], [6, 3, 3, 3, 3], [null, null, null, null, null], [2.5, 3, 3, 3, 3]]) {
        expect((await reviewSdt('mentorA', data.id, bad)).error?.message).toMatch(/bad_marks/);
      }
      expect((await reviewSdt('mentorA', data.id, paragraphs(), { honest: 4 })).error?.message).toMatch(/bad_marks/);
      expect((await reviewSdt('mentorA', data.id)).error).toBeNull();
      const { data: ev } = await service.from('evaluations').select('verdict').eq('session_id', data.id).single();
      expect(ev!.verdict).toEqual({ rubric: 'sdt-1', paragraphs: paragraphs(), marks: SDT_MARKS });
    });

    it('keeps each rubric to its own test', async () => {
      expect((await reviewSrt('mentorA', s.typed, 10)).error).toBeNull();
      const sdtOnSrt = await world.people.mentorA.client.rpc('review_sdt', { p_session_id: s.srt, p_paragraphs: paragraphs(), p_marks: SDT_MARKS, p_went_well: 'x', p_focus_on: null });
      expect(sdtOnSrt.error?.message).toMatch(/not_submitted/);
    });
  });
});
