import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { buildWorld, hasDatabase, leftovers, serviceClient } from './helpers/world.ts';
import type { World } from './helpers/world.ts';
import { issueNarrationUpload, narrationOf, submitForReview } from '../admin/narration.ts';
import { issueSheetUpload } from '../admin/uploads.ts';

/**
 * Narrating a PPDT story and sending the attempt for review (0014, D34).
 * The database decides — as the candidate — whether a take may be recorded:
 * their own PPDT attempt, its time over, not yet submitted. Every take goes to
 * a fresh path that cannot be overwritten, so what a mentor hears is what was
 * submitted. submit_for_review locks the attempt; it needs something to review
 * (a story, or a sheet photo that actually arrived).
 */
const SHEETS = 'answer-sheets';
const AUDIO = 'narrations';
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);
/** Not a playable file — storage checks the declared type, not the bytes. */
const WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);

describe.skipIf(!hasDatabase)('narration and submitting for review', () => {
  let world: World;
  const service = serviceClient();
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  let picture = '';
  let typed = '';
  let paper = '';
  let live = '';
  let wat = '';

  beforeAll(async () => {
    world = await buildWorld({
      candA: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA2: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      candA3: { role: 'candidate', org: 'a', dob: '2005-01-15' },
      mentorA: { role: 'mentor', org: 'a', dob: '1990-01-01' },
      mentorB: { role: 'mentor', org: 'b', dob: '1990-01-01' },
    });
    picture = `test-${world.run}-pic`;
    const { error } = await service.from('items').insert({ id: picture, assessment_type: 'ppdt', difficulty: 3, payload: { title: 'Fixture', image: '/x.jpg' }, source: 'fixture' });
    if (error) throw new Error(error.message);

    const start = async (who: string, input: string, code: string | null) => {
      const { data, error: e } = await world.people[who].client.rpc('start_ppdt', { p_item_id: picture, p_input_mode: input, p_paper_code: code });
      if (e) throw new Error(`${who}: ${e.message}`);
      return data.id as string;
    };
    typed = await start('candA', 'typed', null);
    paper = await start('candA2', 'paper', 'ACD-EFG');
    live = await start('candA3', 'typed', null);
    const { data: w, error: we } = await world.people.candA3.client.rpc('start_session', { p_assessment_type: 'wat', p_input_mode: 'typed', p_paper_code: null });
    if (we) throw new Error(we.message);
    wat = w.id;
    // The story, written inside its window, then the clock moved past the end.
    await service.from('responses').insert({ session_id: typed, key: '0:write', item: 0, response_text: 'A boy saw smoke and ran for help.', source: 'typed' });
    const past = { started_at: new Date(Date.now() - 900_000).toISOString(), expires_at: new Date(Date.now() - 500_000).toISOString() };
    await service.from('sessions').update(past).in('id', [typed, paper, wat]);
  });

  afterAll(async () => {
    for (const [bucket, id] of [
      [AUDIO, world?.people.candA.id],
      [AUDIO, world?.people.candA2.id],
      [SHEETS, world?.people.candA2.id],
    ] as const) {
      if (!id) continue;
      const { data: folders } = await service.storage.from(bucket).list(id);
      for (const f of folders ?? []) {
        const { data: files } = await service.storage.from(bucket).list(`${id}/${f.name}`);
        if (files?.length) await service.storage.from(bucket).remove(files.map((x) => `${id}/${f.name}/${x.name}`));
      }
    }
    await world?.destroy();
    await service.from('items').delete().eq('id', picture);
    expect(await leftovers(service)).toEqual([]);
  });

  const begin = (who: string, session: string, mime = 'audio/webm', ms = 58_000) =>
    world.people[who].client.rpc('begin_narration', { p_session_id: session, p_mime: mime, p_duration_ms: ms });
  const record = async (who: string, session: string) => {
    const issued = await issueNarrationUpload(world.people[who].client, service, { sessionId: session, mime: 'audio/webm', durationMs: 58_000 });
    if (issued.kind !== 'ok') throw new Error(issued.kind);
    const up = await anon.storage.from(AUDIO).uploadToSignedUrl(issued.path, issued.token, WEBM, { contentType: 'audio/webm' });
    if (up.error) throw new Error(up.error.message);
    return issued;
  };

  describe('who may record (begin_narration)', () => {
    it('gives each take of the candidate’s own finished PPDT a fresh path', async () => {
      const one = await begin('candA', typed);
      const two = await begin('candA', typed);
      expect(one.error).toBeNull();
      expect(one.data).toMatch(new RegExp(`^${world.people.candA.id}/${typed}/narration-[0-9a-f]{12}$`));
      expect(two.data).not.toBe(one.data);
      const { data } = await service.from('narrations').select('storage_path, mime_type, duration_ms').eq('session_id', typed).single();
      expect(data).toEqual({ storage_path: two.data, mime_type: 'audio/webm', duration_ms: 58_000 });
    });

    it('refuses a running attempt, someone else’s, a test that is not PPDT, and a take that is not audio or not a minute', async () => {
      expect((await begin('candA3', live)).error?.message).toMatch(/not_over/);
      expect((await begin('candA2', typed)).error?.message).toMatch(/not_your_session/);
      expect((await begin('mentorA', typed)).error?.message).toMatch(/not_your_session/);
      expect((await begin('candA3', wat)).error?.message).toMatch(/not_ppdt/);
      expect((await begin('candA', typed, 'video/mp4')).error?.message).toMatch(/bad_audio/);
      for (const ms of [0, 70_000]) expect((await begin('candA', typed, 'audio/webm', ms)).error?.message, String(ms)).toMatch(/bad_audio/);
    });

    it('cannot be written around: no one writes narrations or the review stamp directly', async () => {
      const c = world.people.candA.client;
      expect((await c.from('narrations').insert({ session_id: typed, storage_path: 'x', mime_type: 'audio/webm', duration_ms: 1000 })).error).not.toBeNull();
      await c.from('sessions').update({ submitted_for_review_at: new Date().toISOString() }).eq('id', typed);
      const { data } = await service.from('sessions').select('submitted_for_review_at').eq('id', typed).single();
      expect(data?.submitted_for_review_at).toBeNull();
    });
  });

  describe('the take itself, and submitting', () => {
    it('takes a recording through its link, but never over one already there', async () => {
      const issued = await record('candA', typed);
      const again = await anon.storage.from(AUDIO).uploadToSignedUrl(issued.path, issued.token, WEBM, { contentType: 'audio/webm', upsert: true });
      expect(again.error).not.toBeNull();
    });

    it('shows the take to the candidate and their academy only', async () => {
      const own = await narrationOf(world.people.candA.client, service, typed);
      expect(own).toEqual({ url: expect.stringMatching(/narrations.+token=/), mime: 'audio/webm', durationMs: 58_000, submittedAt: null });
      expect((await fetch(own!.url)).status).toBe(200);
      expect(await narrationOf(world.people.mentorA.client, service, typed)).not.toBeNull();
      expect(await narrationOf(world.people.mentorB.client, service, typed)).toBeNull();
      expect(await narrationOf(world.people.candA2.client, service, typed)).toBeNull();
    });

    it('refuses to submit what has nothing to review: a paper attempt with no photo', async () => {
      expect(await submitForReview(world.people.candA2.client, service, paper)).toEqual({ kind: 'refused', reason: 'nothing_to_review' });
      // A photo begun but never sent is still nothing.
      await world.people.candA2.client.rpc('begin_sheet_upload', { p_session_id: paper, p_page: 1 });
      expect(await submitForReview(world.people.candA2.client, service, paper)).toEqual({ kind: 'refused', reason: 'nothing_to_review' });
    });

    it('refuses to submit a narration whose last take never arrived', async () => {
      const sheet = await issueSheetUpload(world.people.candA2.client, service, { sessionId: paper, page: 1 });
      if (sheet.kind !== 'ok') throw new Error(sheet.kind);
      await anon.storage.from(SHEETS).uploadToSignedUrl(sheet.path, sheet.token, JPEG, { contentType: 'image/jpeg' });
      await begin('candA2', paper);
      expect(await submitForReview(world.people.candA2.client, service, paper)).toEqual({ kind: 'refused', reason: 'no_recording' });
      await record('candA2', paper);
      expect((await submitForReview(world.people.candA2.client, service, paper)).kind).toBe('ok');
    });

    it('locks the attempt: no more takes or photos, and the takes not submitted are cleared away', async () => {
      await record('candA', typed);
      const kept = await record('candA', typed);
      const r = await submitForReview(world.people.candA.client, service, typed);
      expect(r.kind).toBe('ok');
      expect((await submitForReview(world.people.candA.client, service, typed)).kind).toBe('ok'); // a retry is harmless
      expect((await begin('candA', typed)).error?.message).toMatch(/submitted/);
      expect((await world.people.candA2.client.rpc('begin_sheet_upload', { p_session_id: paper, p_page: 2 })).error?.message).toMatch(/submitted/);
      const { data: files } = await service.storage.from(AUDIO).list(`${world.people.candA.id}/${typed}`);
      expect(files?.map((f) => `${world.people.candA.id}/${typed}/${f.name}`)).toEqual([kept.path]);
      expect((await narrationOf(world.people.candA.client, service, typed))?.submittedAt).toEqual(expect.any(String));
    });

    it('refuses someone else’s attempt', async () => {
      expect(await submitForReview(world.people.candA3.client, service, typed)).toEqual({ kind: 'refused', reason: 'not_your_session' });
    });
  });
});
