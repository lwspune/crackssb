import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { buildWorld, hasDatabase, leftovers, serviceClient } from './helpers/world.ts';
import type { World } from './helpers/world.ts';
import { issueSheetUpload, sheetPhotos } from '../admin/uploads.ts';

/**
 * Photographing a paper answer sheet (0013, D22, D34). The database decides
 * — as the candidate — whether a page may be uploaded: their own paper
 * attempt, its time over, page 1 to 4. Only then does the server issue a
 * signed link for that one path; the photo goes straight to the private
 * bucket, and is read back through signed links by those who may see the
 * attempt (can_view_person).
 */
const BUCKET = 'answer-sheets';
/** The smallest valid JPEG: a 1×1 white pixel. */
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

describe.skipIf(!hasDatabase)('answer-sheet photos', () => {
  let world: World;
  const service = serviceClient();
  let picture = '';
  const paths: string[] = [];
  let paper = '';
  let typed = '';
  let live = '';

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
    paper = await start('candA', 'paper', 'ACD-EFG');
    typed = await start('candA2', 'typed', null);
    live = await start('candA3', 'paper', 'ACD-EFH');
    // Two attempts whose time is over, one still running.
    const past = { started_at: new Date(Date.now() - 900_000).toISOString(), expires_at: new Date(Date.now() - 500_000).toISOString() };
    await service.from('sessions').update(past).in('id', [paper, typed]);
  });

  afterAll(async () => {
    if (paths.length) await service.storage.from(BUCKET).remove(paths);
    await world?.destroy();
    await service.from('items').delete().eq('id', picture);
    expect(await leftovers(service)).toEqual([]);
  });

  const begin = (who: string, session: string, page: number) => world.people[who].client.rpc('begin_sheet_upload', { p_session_id: session, p_page: page });

  describe('who may upload (begin_sheet_upload)', () => {
    it('lets the candidate add a page to their own paper attempt once its time is over', async () => {
      const { data, error } = await begin('candA', paper, 1);
      expect(error).toBeNull();
      expect(data).toBe(`${world.people.candA.id}/${paper}/page-1.jpg`);
    });

    it('refuses a typed attempt, one still running, someone else’s, and a page out of range', async () => {
      expect((await begin('candA2', typed, 1)).error?.message).toMatch(/not_paper/);
      expect((await begin('candA3', live, 1)).error?.message).toMatch(/not_over/);
      expect((await begin('candA2', paper, 1)).error?.message).toMatch(/not_your_session/);
      expect((await begin('mentorA', paper, 1)).error?.message).toMatch(/not_your_session/);
      for (const page of [0, 5]) expect((await begin('candA', paper, page)).error?.message, String(page)).toMatch(/bad_page/);
    });

    it('treats a second photo of the same page as a retake: same path, waiting to be read again', async () => {
      await service.from('uploads').update({ ocr_status: 'done', ocr_text: 'old' }).eq('session_id', paper).eq('page_no', 1);
      expect((await begin('candA', paper, 1)).data).toBe(`${world.people.candA.id}/${paper}/page-1.jpg`);
      const { data } = await service.from('uploads').select('ocr_status, ocr_text').eq('session_id', paper).eq('page_no', 1).single();
      expect(data).toEqual({ ocr_status: 'pending', ocr_text: null });
    });

    it('cannot be written around: no one inserts into uploads directly', async () => {
      const { error } = await world.people.candA.client.from('uploads').insert({ session_id: paper, storage_path: 'x/y.jpg', page_no: 2 });
      expect(error).not.toBeNull();
    });
  });

  describe('the photo itself (issueSheetUpload, sheetPhotos)', () => {
    it('issues a link for that one path, takes the photo, and shows it to the candidate and their academy only', async () => {
      const issued = await issueSheetUpload(world.people.candA.client, service, { sessionId: paper, page: 1 });
      if (issued.kind !== 'ok') throw new Error(issued.kind);
      paths.push(issued.path);
      const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
      const up = await anon.storage.from(BUCKET).uploadToSignedUrl(issued.path, issued.token, JPEG, { contentType: 'image/jpeg', upsert: true });
      expect(up.error).toBeNull();

      const own = await sheetPhotos(world.people.candA.client, service, paper);
      expect(own).toEqual([{ page: 1, url: expect.stringMatching(/^https:\/\/.+answer-sheets.+token=/) }]);
      const fetched = await fetch(own[0].url);
      expect(fetched.status).toBe(200);

      expect(await sheetPhotos(world.people.mentorA.client, service, paper)).toHaveLength(1);
      expect(await sheetPhotos(world.people.mentorB.client, service, paper)).toEqual([]);
      expect(await sheetPhotos(world.people.candA2.client, service, paper)).toEqual([]);
    });

    it('issues nothing when the database says no', async () => {
      expect(await issueSheetUpload(world.people.candA2.client, service, { sessionId: paper, page: 2 })).toEqual({ kind: 'forbidden' });
    });
  });
});
