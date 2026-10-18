import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildWorld, hasDatabase, leftovers, serviceClient } from './helpers/world.ts';
import type { World } from './helpers/world.ts';

/**
 * A mentor's review of a PPDT attempt (0015, D34). A staff review is an
 * `evaluations` row with evaluator 'human' (UI.md §5): one per attempt, written
 * only through review_attempt, which decides as the reviewer — staff who may
 * see the candidate, never their own attempt, only one sent for review, and
 * never a staff member's own practice (D25). The queue reads through
 * review_queue, which keeps staff attempts out in SQL.
 */
const STORY = { hero: 4, action: 3, outcome: 4, outlook: 5 };
const VOICE = { clarity: 3, confidence: 4, timing: 5 };

describe.skipIf(!hasDatabase)('mentor review', () => {
  let world: World;
  const service = serviceClient();
  let picture = '';
  const s: Record<string, string> = {};

  beforeAll(async () => {
    world = await buildWorld({
      candA: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA2: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candB: { role: 'candidate', org: 'b', dob: '2005-01-15' },
      solo: { role: 'candidate', org: null, dob: '2005-01-15' },
      mentorA: { role: 'mentor', org: 'a', dob: '1990-01-01' },
      adminA: { role: 'org_admin', org: 'a', dob: '1990-01-01' },
      mentorB: { role: 'mentor', org: 'b', dob: '1990-01-01' },
      owner: { role: 'superadmin', org: null, dob: '1980-01-01' },
    });
    picture = `test-${world.run}-pic`;
    const { error } = await service.from('items').insert({ id: picture, assessment_type: 'ppdt', difficulty: 3, payload: { title: 'Fixture', image: '/x.jpg' }, source: 'fixture' });
    if (error) throw new Error(error.message);

    for (const who of ['candA', 'candA2', 'candB', 'solo', 'mentorA']) {
      const { data, error: e } = await world.people[who].client.rpc('start_ppdt', { p_item_id: picture, p_input_mode: 'typed', p_paper_code: null });
      if (e) throw new Error(`${who}: ${e.message}`);
      s[who] = data.id;
    }
    const ids = Object.values(s);
    await service.from('responses').insert(ids.map((id) => ({ session_id: id, key: '0:write', item: 0, response_text: 'A story.', source: 'typed' })));
    const past = { started_at: new Date(Date.now() - 900_000).toISOString(), expires_at: new Date(Date.now() - 500_000).toISOString() };
    await service.from('sessions').update(past).in('id', ids);
    // Sent for review: all but candA2's.
    await service.from('sessions').update({ submitted_for_review_at: new Date().toISOString() }).in('id', ids.filter((id) => id !== s.candA2));
    // solo narrated theirs.
    await service.from('narrations').insert({ session_id: s.solo, storage_path: `${world.people.solo.id}/${s.solo}/narration-fixture`, mime_type: 'audio/webm', duration_ms: 55_000 });
  });

  afterAll(async () => {
    await world?.destroy();
    await service.from('items').delete().eq('id', picture);
    expect(await leftovers(service)).toEqual([]);
  });

  const review = (who: string, session: string, over: Record<string, unknown> = {}) =>
    world.people[who].client.rpc('review_attempt', {
      p_session_id: session,
      p_story: STORY,
      p_narration: null,
      p_went_well: 'A clear hero who acts.',
      p_focus_on: 'Give the outcome a sentence.',
      ...over,
    });
  const queue = async (who: string, org: string | null) => {
    const { data, error } = await world.people[who].client.rpc('review_queue', { p_org: org });
    if (error) throw new Error(error.message);
    return (data as { session_id: string }[]).map((r) => r.session_id).sort();
  };

  describe('the queue (review_queue)', () => {
    it('lists the academy’s attempts sent for review — not one unsent, not a staff member’s own', async () => {
      expect(await queue('mentorA', world.orgs.a)).toEqual([s.candA]);
      expect(await queue('adminA', world.orgs.a)).toEqual([s.candA]);
      expect(await queue('mentorB', world.orgs.b)).toEqual([s.candB]);
    });

    it('gives the owner the candidates with no academy, beside the academy they are working in', async () => {
      expect(await queue('owner', null)).toEqual([s.solo]);
      expect(await queue('owner', world.orgs.a)).toEqual([s.candA, s.solo].sort());
    });

    it('stays inside what the caller may see, whatever academy is asked for', async () => {
      expect(await queue('mentorB', world.orgs.a)).toEqual([]);
      expect(await queue('candA', world.orgs.a)).toEqual([]);
    });
  });

  describe('marking (review_attempt)', () => {
    it('records one human review, by name, that the candidate can read and no other', async () => {
      const { error } = await review('mentorA', s.candA);
      expect(error).toBeNull();
      const { data } = await world.people.candA.client.from('evaluations').select('evaluator, reviewer_id, verdict, went_well, focus_on').eq('session_id', s.candA).single();
      expect(data).toEqual({
        evaluator: 'human',
        reviewer_id: world.people.mentorA.id,
        verdict: { rubric: 'ppdt-1', story: STORY, narration: null },
        went_well: 'A clear hero who acts.',
        focus_on: 'Give the outcome a sentence.',
      });
      const { data: other } = await world.people.candB.client.from('evaluations').select('id').eq('session_id', s.candA);
      expect(other).toEqual([]);
    });

    it('a second review replaces the first: one per attempt, the latest reviewer named', async () => {
      expect((await review('adminA', s.candA, { p_story: { ...STORY, hero: 5 } })).error).toBeNull();
      const { data } = await service.from('evaluations').select('reviewer_id, verdict, updated_at').eq('session_id', s.candA);
      expect(data).toHaveLength(1);
      expect(data![0].reviewer_id).toBe(world.people.adminA.id);
      expect(data![0].verdict.story.hero).toBe(5);
      expect(data![0].updated_at).not.toBeNull();
      expect((await queue('mentorA', world.orgs.a))).toEqual([s.candA]); // still listed, now as reviewed
      const { data: row } = await world.people.mentorA.client.rpc('review_queue', { p_org: world.orgs.a });
      expect(row[0].reviewed_at).toEqual(expect.any(String));
    });

    it('refuses those who may not review it, and attempts that may not be reviewed', async () => {
      expect((await review('mentorB', s.candA)).error?.message).toMatch(/not_found/);
      expect((await review('candA2', s.candA)).error?.message).toMatch(/not_staff/);
      expect((await review('mentorA', s.candA2)).error?.message).toMatch(/not_submitted/);
      expect((await review('mentorA', s.mentorA)).error?.message).toMatch(/own_attempt/);
      expect((await review('adminA', s.mentorA)).error?.message).toMatch(/staff_attempt/);
    });

    it('takes whole marks 1 to 5 on every heading, and a word of feedback', async () => {
      for (const story of [{ ...STORY, hero: 0 }, { ...STORY, outlook: 6 }, { hero: 4, action: 3, outcome: 4 }, { ...STORY, action: 2.5 }]) {
        expect((await review('mentorA', s.candA, { p_story: story })).error?.message, JSON.stringify(story)).toMatch(/bad_marks/);
      }
      expect((await review('mentorA', s.candA, { p_went_well: ' ', p_focus_on: '' })).error?.message).toMatch(/bad_comment/);
      expect((await review('mentorA', s.candA, { p_focus_on: 'x'.repeat(1001) })).error?.message).toMatch(/bad_comment/);
    });

    it('marks the narration exactly when there is one', async () => {
      expect((await review('mentorA', s.candA, { p_narration: VOICE })).error?.message).toMatch(/bad_marks/);
      expect((await review('owner', s.solo)).error?.message).toMatch(/bad_marks/);
      expect((await review('owner', s.solo, { p_narration: { ...VOICE, timing: 9 } })).error?.message).toMatch(/bad_marks/);
      expect((await review('owner', s.solo, { p_narration: VOICE })).error).toBeNull();
      const { data } = await world.people.solo.client.from('evaluations').select('verdict').eq('session_id', s.solo).single();
      expect(data?.verdict.narration).toEqual(VOICE);
    });

    it('cannot be written around: no one writes evaluations directly', async () => {
      const { error } = await world.people.mentorA.client.from('evaluations').insert({ session_id: s.candB, evaluator: 'human', verdict: {} });
      expect(error).not.toBeNull();
    });
  });
});
