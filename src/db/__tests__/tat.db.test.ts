import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildWorld, hasDatabase, leftovers, serviceClient, yearsAgo } from './helpers/world.ts';
import type { World } from './helpers/world.ts';
import { INSTRUMENT_CONFIGS } from '../../runner/modes.ts';
import { supabaseSessionApi } from '../../ui/runner/supabase-api.ts';

/**
 * TAT in the database (0017, D36). An attempt is at one set: eleven pictures
 * and a blank, each 30 s to look and 4 min to write, back to back for 54
 * minutes. A set is a `tests` row like an OIR mock, so once anyone has sat it
 * it cannot change (0009). The server takes each story only in its own four
 * minutes. TAT never shows up as an OIR mock. On paper the sheet runs to eight
 * photographed pages. A mentor marks each story 1-5 with a note, through
 * review_tat; the queue lists TAT beside PPDT.
 */
const SET_MS = 12 * 270_000;
const stories = (mark: number | null = 3) => Array.from({ length: 12 }, (_, i) => ({ mark: i === 11 ? null : mark, note: i === 0 ? 'Clear hero.' : null }));

describe.skipIf(!hasDatabase)('TAT', () => {
  let world: World;
  const service = serviceClient();
  let set = '';
  let other = '';
  let mock = '';
  let pictures: string[] = [];
  let oirItem = '';

  const must = (r: { error: { message: string } | null }, what: string) => {
    if (r.error) throw new Error(`${what}: ${r.error.message}`);
  };

  beforeAll(async () => {
    world = await buildWorld({
      candA: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA2: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA3: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA4: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candB: { role: 'candidate', org: 'b', dob: '2005-01-15' },
      mentorA: { role: 'mentor', org: 'a', dob: '1990-01-01' },
      adminA: { role: 'org_admin', org: 'a', dob: '1990-01-01' },
      mentorB: { role: 'mentor', org: 'b', dob: '1990-01-01' },
      minorA: { role: 'candidate', org: 'a', dob: yearsAgo(15) },
    });
    set = `test-${world.run}-set`;
    other = `test-${world.run}-set2`;
    mock = `test-${world.run}-mock`;
    pictures = Array.from({ length: 13 }, (_, i) => `test-${world.run}-t${i}`);
    oirItem = `test-${world.run}-q`;
    must(await service.from('items').insert(pictures.map((id) => ({ id, assessment_type: 'tat', difficulty: 2, payload: { title: 'Fixture', image: '/tat/fixture.jpg' }, source: 'fixture' }))), 'tat items');
    must(await service.from('items').insert({ id: oirItem, assessment_type: 'oir_verbal', difficulty: 3, payload: { stem: 'x', options: { A: '1', B: '2', C: '3', D: '4' }, reasoningType: 'series' }, source: 'fixture' }), 'oir item');
    must(await service.from('item_keys').insert({ item_id: oirItem, key: 'A', key_basis: 'derived', rule: 'r' }), 'key');
    must(
      await service.from('tests').insert([
        { id: set, assessment_type: 'tat', title: 'Fixture set', item_count: 12, time_limit_seconds: 3240 },
        { id: other, assessment_type: 'tat', title: 'Fixture set 2', item_count: 12, time_limit_seconds: 3240 },
        { id: mock, assessment_type: 'oir', title: 'Fixture mock', item_count: 1, time_limit_seconds: 600 },
      ]),
      'tests',
    );
    must(await service.from('test_items').insert(pictures.slice(0, 12).map((item_id, ordinal) => ({ test_id: set, ordinal, item_id }))), 'set items');
    must(await service.from('test_items').insert({ test_id: mock, ordinal: 0, item_id: oirItem }), 'mock item');
  });

  afterAll(async () => {
    // Users first: their sessions go with them, and an unsat set can be removed.
    await world?.destroy();
    await service.from('test_items').delete().in('test_id', [set, other, mock]);
    await service.from('tests').delete().in('id', [set, other, mock]);
    await service.from('item_keys').delete().eq('item_id', oirItem);
    await service.from('items').delete().in('id', [...pictures, oirItem]);
    expect(await leftovers(service)).toEqual([]);
  });

  const start = (who: string, test = set, input = 'typed', code: string | null = null) =>
    world.people[who].client.rpc('start_tat', { p_test_id: test, p_input_mode: input, p_paper_code: code });
  const save = (who: string, session: string, key: string, text: string) =>
    world.people[who].client.rpc('save_response', { p_session_id: session, p_key: key, p_text: text, p_final: false });
  /** Move an attempt's clock back by `seconds`, as if it had started that long ago. */
  const ago = async (session: string, seconds: number) => {
    const started = Date.now() - seconds * 1000;
    must(await service.from('sessions').update({ started_at: new Date(started).toISOString(), expires_at: new Date(started + SET_MS).toISOString() }).eq('id', session), 'ago');
  };
  const over = (session: string) => ago(session, SET_MS / 1000 + 60);

  it('keeps the same windows the runner shows: twelve slides, 30 s to look, 4 min to write', async () => {
    const { data } = await service.from('instrument_timings').select('*').eq('assessment_type', 'tat').single();
    const tat = INSTRUMENT_CONFIGS.tat;
    expect(tat.mode).toBe('stimulus_write');
    if (tat.mode !== 'stimulus_write') return;
    expect(data).toMatchObject({ mode: 'stimulus_write', item_count: tat.itemCount, show_seconds: 30, note_seconds: null, write_seconds: 240 });
  });

  let session = '';

  describe('starting (start_tat)', () => {
    it('starts an attempt at one set, 54 minutes long', async () => {
      const { data, error } = await start('candA');
      expect(error).toBeNull();
      session = data.id;
      expect(data).toMatchObject({ assessment_type: 'tat', test_id: set, item_id: null, status: 'live', by_staff: false, input_mode: 'typed' });
      expect(new Date(data.expires_at).getTime() - new Date(data.started_at).getTime()).toBe(SET_MS);
    });

    it('runs one at a time', async () => {
      expect((await start('candA')).error?.message).toMatch(/session_live/);
    });

    it('refuses an under-18 without consent, a set short of twelve, and an OIR mock', async () => {
      expect((await start('minorA')).error?.message).toMatch(/consent_required/);
      expect((await start('candA2', other)).error?.message).toMatch(/test_incomplete/);
      expect((await start('candA2', mock)).error?.message).toMatch(/unknown_test/);
      expect((await start('candA2', `test-${world.run}-nope`)).error?.message).toMatch(/unknown_test/);
    });

    it('cannot be started as an OIR mock, nor without a set', async () => {
      expect((await world.people.candA2.client.rpc('start_test', { p_test_id: set })).error?.message).toMatch(/unknown_test/);
      expect((await world.people.candA2.client.rpc('start_session', { p_assessment_type: 'tat' })).error).not.toBeNull();
    });

    it('marks a staff attempt as staff', async () => {
      expect((await start('mentorA')).data?.by_staff).toBe(true);
    });
  });

  describe('answering (save_response)', () => {
    it('takes nothing while the first picture shows', async () => {
      expect((await save('candA', session, '0:write', 'Too soon')).error?.message).toMatch(/item_not_open/);
    });

    it('takes each story only in its own four minutes', async () => {
      await ago(session, 40);
      expect((await save('candA', session, '0:write', 'Ravi saw…')).error).toBeNull();
      expect((await save('candA', session, '1:write', 'Not yet')).error?.message).toMatch(/item_not_open/);
      await ago(session, 3 * 270 + 40);
      expect((await save('candA', session, '3:write', 'The fourth story')).error).toBeNull();
      expect((await save('candA', session, '0:write', 'Changed')).error?.message).toMatch(/item_closed/);
    });

    it('refuses keys that are not this test’s: no character box, no thirteenth slide', async () => {
      for (const key of ['0', '0:note', '12:write', 'x:write']) expect((await save('candA', session, key, 'x')).error?.message, key).toMatch(/bad_key/);
    });
  });

  describe('a set', () => {
    it('takes only TAT pictures, and an OIR mock takes no TAT picture', async () => {
      expect((await service.from('test_items').insert({ test_id: other, ordinal: 0, item_id: oirItem })).error?.message).toMatch(/bad_item/);
      expect((await service.from('test_items').insert({ test_id: mock, ordinal: 0, item_id: pictures[12] })).error).not.toBeNull();
    });

    it('cannot change once anyone has sat it', async () => {
      expect((await service.from('test_items').update({ item_id: pictures[12] }).eq('test_id', set).eq('ordinal', 0)).error?.message).toMatch(/test_fixed/);
      expect((await service.from('tests').update({ time_limit_seconds: 600 }).eq('id', set)).error?.message).toMatch(/test_fixed/);
    });
  });

  describe('kept apart from OIR', () => {
    it('is not listed among mock attempts, and has no mock result', async () => {
      await over(session);
      const { data } = await world.people.candA.client.rpc('my_test_attempts');
      expect((data as { session_id: string }[]).map((r) => r.session_id)).not.toContain(session);
      expect((await world.people.candA.client.rpc('test_result', { p_session_id: session })).error?.message).toMatch(/not_your_session/);
    });
  });

  describe('on paper', () => {
    let paper = '';
    it('keeps the code and takes nothing typed', async () => {
      const { data, error } = await start('candA3', set, 'paper', 'ACD-EFG');
      expect(error).toBeNull();
      paper = data.id;
      await ago(paper, 100);
      expect((await save('candA3', paper, '0:write', 'typed')).error?.message).toMatch(/paper_session/);
    });

    it('takes up to eight photographed pages once it is over', async () => {
      await over(paper);
      const page = (n: number) => world.people.candA3.client.rpc('begin_sheet_upload', { p_session_id: paper, p_page: n });
      expect((await page(8)).error).toBeNull();
      expect((await page(9)).error?.message).toMatch(/bad_page/);
    });

    it('has no narration: TAT has none at the SSB', async () => {
      const r = await world.people.candA3.client.rpc('begin_narration', { p_session_id: paper, p_mime: 'audio/webm', p_duration_ms: 30_000 });
      expect(r.error?.message).toMatch(/not_ppdt/);
    });
  });

  describe('review', () => {
    let typed = '';
    let unsent = '';
    let staff = '';
    let own = '';
    const review = (who: string, s: string, list: unknown = stories()) =>
      world.people[who].client.rpc('review_tat', { p_session_id: s, p_stories: list, p_went_well: 'Heroes act.', p_focus_on: 'End each story.' });

    beforeAll(async () => {
      typed = session;
      const a = await start('candA2', set);
      const b = await start('candB', set);
      must(a, 'candA2');
      must(b, 'candB');
      unsent = a.data.id;
      // A mentor also sees the academy's attempts: their own is the one they took.
      own = (await world.people.mentorA.client.from('sessions').select('id').eq('assessment_type', 'tat').eq('candidate_id', world.people.mentorA.id).single()).data!.id;
      // Another staff member's practice, which the mentor can see but must not mark (D25).
      const admin = await start('adminA', set);
      must(admin, 'adminA');
      staff = admin.data.id;
      for (const id of [unsent, b.data.id, staff, own]) await over(id);
      await service.from('responses').insert({ session_id: staff, key: '0:write', item: 0, response_text: 'Mine.', source: 'typed' });
    });

    it('is sent once there is a story to read', async () => {
      expect((await world.people.candA.client.rpc('submit_for_review', { p_session_id: typed })).error).toBeNull();
      expect((await world.people.candA2.client.rpc('submit_for_review', { p_session_id: unsent })).error?.message).toMatch(/nothing_to_review/);
    });

    it('lists TAT attempts in the academy’s queue, as TAT, with their set', async () => {
      const { data, error } = await world.people.mentorA.client.rpc('review_queue', { p_org: world.orgs.a });
      expect(error).toBeNull();
      expect(data).toEqual([expect.objectContaining({ session_id: typed, assessment_type: 'tat', test_id: set, item_id: null })]);
    });

    it('marks every story 1-5, or none for one not written, with a note each', async () => {
      expect((await review('mentorA', typed)).error).toBeNull();
      const { data } = await world.people.candA.client.from('evaluations').select('verdict, went_well, focus_on, reviewer_id').eq('session_id', typed).single();
      expect(data).toMatchObject({ went_well: 'Heroes act.', focus_on: 'End each story.', reviewer_id: world.people.mentorA.id });
      expect(data!.verdict).toEqual({ rubric: 'tat-1', stories: stories() });
    });

    it('refuses anything but twelve stories, each a whole mark 1-5 or none, and at least one marked', async () => {
      for (const bad of [
        stories().slice(0, 11),
        [...stories(), { mark: 3, note: null }],
        stories(6),
        stories(null),
        stories().map((s, i) => (i === 0 ? { mark: 2.5, note: null } : s)),
        stories().map((s, i) => (i === 0 ? { ...s, note: 'x'.repeat(301) } : s)),
        stories().map((s, i) => (i === 0 ? { ...s, extra: true } : s)),
        { stories: stories() },
      ]) {
        expect((await review('mentorA', typed, bad)).error?.message).toMatch(/bad_marks/);
      }
    });

    it('decides as the reviewer: their academy, never staff practice, only an attempt sent', async () => {
      expect((await review('mentorB', typed)).error?.message).toMatch(/not_found/);
      expect((await review('mentorA', own)).error?.message).toMatch(/own_attempt/);
      expect((await review('mentorA', staff)).error?.message).toMatch(/staff_attempt/);
      expect((await review('mentorA', unsent)).error?.message).toMatch(/not_submitted/);
      expect((await review('candA', typed)).error?.message).toMatch(/not_staff/);
    });

    it('is not marked on the PPDT rubric, nor PPDT on this one', async () => {
      const ppdt = await world.people.mentorA.client.rpc('review_attempt', {
        p_session_id: typed,
        p_story: { hero: 3, action: 3, outcome: 3, outlook: 3 },
        p_narration: null,
        p_went_well: 'x',
        p_focus_on: null,
      });
      expect(ppdt.error?.message).toMatch(/not_submitted/);
    });
  });

  it('is started and found again on reload by the app’s adapter, knowing its set', async () => {
    const api = supabaseSessionApi(world.people.candA4.client);
    const started = await api.start('tat', 'typed', null, set, null);
    expect(started).toMatchObject({ startedAtMs: expect.any(Number) });
    expect(await api.loadLive('tat')).toMatchObject({ instrument: 'tat', testId: set, itemId: null, input: 'typed' });
  });
});
