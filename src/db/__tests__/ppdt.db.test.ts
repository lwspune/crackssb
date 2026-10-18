import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildWorld, hasDatabase, leftovers, serviceClient, yearsAgo } from './helpers/world.ts';
import type { World } from './helpers/world.ts';
import { INSTRUMENT_CONFIGS } from '../../runner/modes.ts';
import { supabaseSessionApi } from '../../ui/runner/supabase-api.ts';

/**
 * PPDT in the database (0012, D33). An attempt is at one picture. The server
 * keeps the three windows — 30 s to look, 1 min for the character box, 4 min
 * for the story — and takes each answer only inside its own window, so a
 * refresh or a slow phone buys nothing (UI.md §3.2).
 */
describe.skipIf(!hasDatabase)('PPDT', () => {
  let world: World;
  const service = serviceClient();
  let picture = '';
  let other = '';

  beforeAll(async () => {
    world = await buildWorld({
      candA: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA2: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA3: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      mentorA: { role: 'mentor', org: 'a', dob: '1990-01-01' },
      minorA: { role: 'candidate', org: 'a', dob: yearsAgo(15) },
    });
    picture = `test-${world.run}-pic`;
    other = `test-${world.run}-oir`;
    const { error } = await service.from('items').insert([
      { id: picture, assessment_type: 'ppdt', difficulty: 3, payload: { title: 'Fixture picture', image: '/ppdt/fixture.jpg' }, source: 'fixture' },
      { id: other, assessment_type: 'oir_verbal', difficulty: 3, payload: { stem: 'x', options: { A: '1', B: '2', C: '3', D: '4' }, reasoningType: 'series' }, source: 'fixture' },
    ]);
    if (error) throw new Error(error.message);
  });

  afterAll(async () => {
    await world?.destroy();
    await service.from('items').delete().in('id', [picture, other]);
    expect(await leftovers(service)).toEqual([]);
  });

  const start = (who: string, item = picture, input = 'typed', code: string | null = null) =>
    world.people[who].client.rpc('start_ppdt', { p_item_id: item, p_input_mode: input, p_paper_code: code });
  const save = (who: string, session: string, key: string, text: string, final = false) =>
    world.people[who].client.rpc('save_response', { p_session_id: session, p_key: key, p_text: text, p_final: final });
  /** Move an attempt's clock back by `seconds`, as if it had started that long ago. */
  const ago = async (session: string, seconds: number) => {
    const started = Date.now() - seconds * 1000;
    const { error } = await service.from('sessions').update({ started_at: new Date(started).toISOString(), expires_at: new Date(started + 330_000).toISOString() }).eq('id', session);
    if (error) throw new Error(error.message);
  };

  it('keeps the same three windows the runner shows', async () => {
    const { data } = await service.from('instrument_timings').select('*').eq('assessment_type', 'ppdt').single();
    const ppdt = INSTRUMENT_CONFIGS.ppdt;
    expect(ppdt.mode).toBe('stimulus_write');
    const seconds = (phase: string) => (ppdt.mode === 'stimulus_write' ? ppdt.phases.find((p) => p.phase === phase)?.seconds ?? null : null);
    expect(data).toMatchObject({ mode: 'stimulus_write', item_count: 1, show_seconds: seconds('show'), note_seconds: seconds('note'), write_seconds: seconds('write') });
  });

  let session = '';

  describe('starting (start_ppdt)', () => {
    it('starts an attempt at one picture, five and a half minutes long', async () => {
      const { data, error } = await start('candA');
      expect(error).toBeNull();
      session = data.id;
      expect(data).toMatchObject({ assessment_type: 'ppdt', item_id: picture, status: 'live', by_staff: false, input_mode: 'typed' });
      expect(new Date(data.expires_at).getTime() - new Date(data.started_at).getTime()).toBe(330_000);
    });

    it('runs one at a time', async () => {
      expect((await start('candA')).error?.message).toMatch(/session_live/);
    });

    it('refuses an under-18 without consent, and anything that is not a PPDT picture', async () => {
      expect((await start('minorA')).error?.message).toMatch(/consent_required/);
      expect((await start('candA2', other)).error?.message).toMatch(/unknown_item/);
      expect((await start('candA2', `test-${world.run}-nope`)).error?.message).toMatch(/unknown_item/);
    });

    it('cannot be started without a picture', async () => {
      expect((await world.people.candA2.client.rpc('start_session', { p_assessment_type: 'ppdt' })).error).not.toBeNull();
    });

    it('marks a staff attempt as staff', async () => {
      expect((await start('mentorA')).data?.by_staff).toBe(true);
    });
  });

  describe('answering (save_response)', () => {
    it('takes nothing while the picture is showing', async () => {
      expect((await save('candA', session, '0:note', '{}')).error?.message).toMatch(/item_not_open/);
    });

    it('takes the character box in its minute, and not the story yet', async () => {
      await ago(session, 40);
      expect((await save('candA', session, '0:note', '{"count":3}')).error).toBeNull();
      expect((await save('candA', session, '0:write', 'Too soon')).error?.message).toMatch(/item_not_open/);
    });

    it('takes the story in its four minutes, and no more of the character box', async () => {
      await ago(session, 120);
      expect((await save('candA', session, '0:write', 'Ravi saw the train leaving…')).error).toBeNull();
      expect((await save('candA', session, '0:note', '{"count":4}')).error?.message).toMatch(/item_closed/);
    });

    it('refuses keys that are not this test’s', async () => {
      for (const key of ['0', '0:show', '1:note', 'x:write']) expect((await save('candA', session, key, 'x')).error?.message, key).toMatch(/bad_key/);
    });

    it('keeps what was saved', async () => {
      const { data } = await world.people.candA.client.from('responses').select('key, response_text').eq('session_id', session).order('key');
      expect(data).toEqual([
        { key: '0:note', response_text: '{"count":3}' },
        { key: '0:write', response_text: 'Ravi saw the train leaving…' },
      ]);
    });
  });

  it('on paper, keeps the sheet’s code and takes nothing typed', async () => {
    const { data, error } = await start('candA3', picture, 'paper', 'ACD-EFG');
    expect(error).toBeNull();
    expect(data).toMatchObject({ input_mode: 'paper', paper_code: 'ACD-EFG' });
    await ago(data.id, 100);
    expect((await save('candA3', data.id, '0:write', 'typed')).error?.message).toMatch(/paper_session/);
  });

  it('is started and found again on reload by the app’s adapter, knowing its picture', async () => {
    const api = supabaseSessionApi(world.people.candA3.client);
    // candA3's paper attempt above is still live: the adapter reports it rather than starting a second.
    expect(await api.start('ppdt', 'typed', null, null, picture)).toEqual({ error: 'session_live' });
    expect(await api.loadLive('ppdt')).toMatchObject({ instrument: 'ppdt', itemId: picture, input: 'paper', code: 'ACD-EFG' });
  });

  it('closes a stale attempt rather than refusing a new one', async () => {
    const { data } = await start('candA2');
    await service.from('sessions').update({ started_at: new Date(Date.now() - 900_000).toISOString(), expires_at: new Date(Date.now() - 500_000).toISOString() }).eq('id', data.id);
    expect((await start('candA2')).error).toBeNull();
  });
});
