import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildWorld, hasDatabase, leftovers, serviceClient } from './helpers/world.ts';
import type { World } from './helpers/world.ts';

/**
 * WAT review in the database (0019, D41). A WAT attempt — on paper since D38 —
 * is photographed, sent for review once, and marked by a mentor of the
 * candidate's academy: how many of the sixty words were answered, then
 * positive, practical and own voice, each 1-5. The checks are review_srt's
 * (0018): as the reviewer, never a staff member's own, only once sent.
 */
const MARKS = { positive: 4, practical: 3, own: 2 };

describe.skipIf(!hasDatabase)('WAT review', () => {
  let world: World;
  const service = serviceClient();
  const s: Record<string, string> = {};

  const past = { started_at: new Date(Date.now() - 3_600_000).toISOString(), expires_at: new Date(Date.now() - 2_400_000).toISOString() };
  const startWat = (who: string, input = 'paper', code: string | null = 'ACD-EFG') =>
    world.people[who].client.rpc('start_session', { p_assessment_type: 'wat', p_input_mode: input, p_paper_code: code });

  beforeAll(async () => {
    world = await buildWorld({
      candA: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA2: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candB: { role: 'candidate', org: 'b', dob: '2005-01-15' },
      mentorA: { role: 'mentor', org: 'a', dob: '1990-01-01' },
    });
    s.paper = (await startWat('candA')).data.id;
    s.other = (await startWat('candB')).data.id;
  });

  afterAll(async () => {
    await world?.destroy();
    expect(await leftovers(service)).toEqual([]);
  });

  const review = (who: string, id: string, answered: unknown = 55, marks: unknown = MARKS) =>
    world.people[who].client.rpc('review_wat', { p_session_id: id, p_answered: answered, p_marks: marks, p_went_well: 'Positive.', p_focus_on: 'Own words.' });

  describe('sending', () => {
    it('typed (hidden, D38): sent once a word has an answer', async () => {
      const { data } = await startWat('candA2', 'typed', null);
      s.typed = data.id;
      expect((await world.people.candA2.client.rpc('save_response', { p_session_id: data.id, p_key: '0', p_text: 'Courage wins.', p_final: true })).error).toBeNull();
      await service.from('sessions').update(past).eq('id', data.id);
      expect((await world.people.candA2.client.rpc('submit_for_review', { p_session_id: data.id })).error).toBeNull();
    });

    it('on paper: not until a photo has arrived', async () => {
      await service.from('sessions').update(past).in('id', [s.paper, s.other]);
      expect((await world.people.candA.client.rpc('begin_sheet_upload', { p_session_id: s.paper, p_page: 1 })).error).toBeNull();
      // Begun, never uploaded: nothing to read yet.
      expect((await world.people.candA.client.rpc('submit_for_review', { p_session_id: s.paper })).error?.message).toMatch(/nothing_to_review/);
    });
  });

  describe('marking', () => {
    beforeAll(async () => {
      // As if their photos had arrived and they had sent them.
      await service.from('sessions').update({ submitted_for_review_at: new Date().toISOString() }).in('id', [s.paper, s.other]);
    });

    it('lists WAT in the academy’s queue, by type', async () => {
      const { data } = await world.people.mentorA.client.rpc('review_queue', { p_org: world.orgs.a });
      const rows = (data as { session_id: string; assessment_type: string }[]).map((r) => [r.session_id, r.assessment_type]);
      expect(rows).toContainEqual([s.paper, 'wat']);
      expect(rows).toContainEqual([s.typed, 'wat']);
      expect(rows.map(([id]) => id)).not.toContain(s.other);
    });

    it('refuses before anything is marked: another academy, a candidate, not sent', async () => {
      expect((await review('mentorA', s.other)).error?.message).toMatch(/not_found/);
      expect((await review('candA2', s.paper)).error?.message).toMatch(/not_staff/);
      const { data } = await startWat('candA2');
      await service.from('sessions').update(past).eq('id', data.id);
      expect((await review('mentorA', data.id)).error?.message).toMatch(/not_submitted/);
    });

    it('marks how many were answered and the three headings; the candidate reads it', async () => {
      expect((await review('mentorA', s.paper)).error).toBeNull();
      const { data } = await world.people.candA.client.from('evaluations').select('verdict, went_well, focus_on').eq('session_id', s.paper).single();
      expect(data).toEqual({ verdict: { rubric: 'wat-1', answered: 55, marks: MARKS }, went_well: 'Positive.', focus_on: 'Own words.' });
    });

    it('updates the one review rather than adding a second', async () => {
      expect((await review('mentorA', s.paper, 58)).error).toBeNull();
      const { data } = await service.from('evaluations').select('verdict').eq('session_id', s.paper);
      expect(data).toEqual([{ verdict: { rubric: 'wat-1', answered: 58, marks: MARKS } }]);
    });

    it('refuses a count outside 0-60, marks outside the three headings, or no comment', async () => {
      for (const [answered, marks] of [[61, MARKS], [-1, MARKS], [null, MARKS], [50, { ...MARKS, own: 6 }], [50, { positive: 3, practical: 3 }], [50, { ...MARKS, extra: 3 }]] as const) {
        expect((await review('mentorA', s.paper, answered, marks)).error?.message).toMatch(/bad_marks/);
      }
      const silent = await world.people.mentorA.client.rpc('review_wat', { p_session_id: s.paper, p_answered: 50, p_marks: MARKS, p_went_well: ' ', p_focus_on: null });
      expect(silent.error?.message).toMatch(/bad_comment/);
    });

    it('keeps each rubric to its own test', async () => {
      const srtOnWat = await world.people.mentorA.client.rpc('review_srt', { p_session_id: s.typed, p_answered: 10, p_marks: { practical: 3, quick: 3, complete: 3 }, p_went_well: 'x', p_focus_on: null });
      expect(srtOnWat.error?.message).toMatch(/not_submitted/);
      expect((await review('mentorA', s.typed, 1)).error).toBeNull();
    });
  });
});
