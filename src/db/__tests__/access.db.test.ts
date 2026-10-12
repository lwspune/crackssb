import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { buildWorld, hasDatabase, leftovers, serviceClient, yearsAgo } from './helpers/world.ts';
import type { Person, World } from './helpers/world.ts';
import { INSTRUMENT_CONFIGS } from '../../runner/modes.ts';

/**
 * The Sprint 1 gate (ROADMAP): the database, not the app, decides who sees
 * what and when an answer may be saved. Every assertion here runs as a real
 * signed-in user against the real project through the public key — exactly
 * what a browser can do, and nothing more.
 */

const ADULT = '2005-01-15';
const WORD_SECONDS = 15;

const SPECS = {
  candA1: { role: 'candidate', org: 'a', dob: ADULT },
  candA2: { role: 'candidate', org: 'a', dob: ADULT },
  candB1: { role: 'candidate', org: 'b', dob: ADULT },
  solo: { role: 'candidate', org: null, dob: ADULT },
  mentorA: { role: 'mentor', org: 'a', dob: '1990-06-01' },
  mentorB: { role: 'mentor', org: 'b', dob: '1990-06-01' },
  admin: { role: 'superadmin', org: null, dob: '1980-01-01' },
  minor: { role: 'candidate', org: 'a', dob: yearsAgo(16) },
  minorConsented: { role: 'candidate', org: 'a', dob: yearsAgo(16), guardianConsent: true },
} as const;

type Label = keyof typeof SPECS;
// (The superadmin is in SPECS for the D25 test; it has no academy, so it never appears in a tenancy list.)

describe.skipIf(!hasDatabase)('database access rules — Sprint 1 gate', () => {
  let world: World;
  const p = (label: Label): Person => world.people[label];

  async function start(label: Label, input: 'typed' | 'paper' = 'typed', code: string | null = null) {
    return p(label).client.rpc('start_session', { p_assessment_type: 'wat', p_input_mode: input, p_paper_code: code });
  }
  async function startOk(label: Label): Promise<{ id: string; started_at: string; expires_at: string }> {
    const { data, error } = await start(label);
    if (error) throw new Error(`start_session(${label}): ${error.message}`);
    return data;
  }
  const save = (label: Label, session: string, key: string, text: string, final = false) =>
    p(label).client.rpc('save_response', { p_session_id: session, p_key: key, p_text: text, p_final: final });
  const end = (label: Label, session: string, endedBy: 'submit' | 'abandon' | 'expiry') =>
    p(label).client.rpc('end_session', { p_session_id: session, p_ended_by: endedBy });
  /** The server's clock is the only clock, so tests move a session back in time rather than waiting. */
  async function backdate(session: string, seconds: number) {
    const { data: s } = await world.service.from('sessions').select('started_at, expires_at').eq('id', session).single();
    const shift = (t: string) => new Date(new Date(t).getTime() - seconds * 1000).toISOString();
    const { error } = await world.service.from('sessions').update({ started_at: shift(s!.started_at), expires_at: shift(s!.expires_at) }).eq('id', session);
    if (error) throw new Error(`backdate: ${error.message}`);
  }

  beforeAll(async () => {
    world = await buildWorld(SPECS);
  });

  // A test that fails mid-way leaves its session live; close it, so one failure reads as one failure.
  afterEach(async () => {
    if (!world) return;
    const ids = Object.values(world.people).map((x) => x.id);
    await world.service.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString(), ended_by: 'abandon' }).in('candidate_id', ids).eq('status', 'live');
  });

  afterAll(async () => {
    await world?.destroy();
    expect(await leftovers(serviceClient())).toEqual([]);
  });

  describe('tenancy', () => {
    it("a candidate cannot read another candidate's session or answers", async () => {
      const s = await startOk('candA1');
      expect((await save('candA1', s.id, '0', 'private thought')).error).toBeNull();

      const sessions = await p('candA2').client.from('sessions').select('id').eq('id', s.id);
      const answers = await p('candA2').client.from('responses').select('response_text').eq('session_id', s.id);
      expect(sessions.data).toEqual([]);
      expect(answers.data).toEqual([]);
      await end('candA1', s.id, 'abandon');
    });

    it('a candidate sees their own session and answers', async () => {
      const s = await startOk('candA2');
      await save('candA2', s.id, '0', 'mine');
      const answers = await p('candA2').client.from('responses').select('response_text, source').eq('session_id', s.id);
      expect(answers.data).toEqual([{ response_text: 'mine', source: 'typed' }]);
      await end('candA2', s.id, 'abandon');
    });

    it('nobody signed in writes a session or answer directly — only through the functions', async () => {
      const direct = await p('candA1').client.from('sessions').insert({ candidate_id: p('candA1').id, assessment_type: 'wat', expires_at: new Date(Date.now() + 9e6).toISOString() });
      expect(direct.error).not.toBeNull();
      const s = await startOk('candA1');
      const answer = await p('candA1').client.from('responses').insert({ session_id: s.id, key: '0', item: 0, response_text: 'x', source: 'typed' });
      expect(answer.error).not.toBeNull();
      await end('candA1', s.id, 'abandon');
    });

    it('a candidate cannot make themselves staff', async () => {
      await p('candA1').client.from('profiles').update({ role: 'superadmin' }).eq('id', p('candA1').id);
      const { data } = await world.service.from('profiles').select('role').eq('id', p('candA1').id).single();
      expect(data?.role).toBe('candidate');
    });

    it("a mentor reads their own academy's candidates, and no one else's", async () => {
      const own = await startOk('candA1');
      const other = await startOk('candB1');
      const solo = await startOk('solo');

      const seen = await p('mentorA').client.from('sessions').select('id').in('id', [own.id, other.id, solo.id]);
      expect(seen.data?.map((r) => r.id)).toEqual([own.id]);

      const seenByB = await p('mentorB').client.from('sessions').select('id').in('id', [own.id, other.id, solo.id]);
      expect(seenByB.data?.map((r) => r.id)).toEqual([other.id]);

      for (const [label, id] of [['candA1', own.id], ['candB1', other.id], ['solo', solo.id]] as const) await end(label, id, 'abandon');
    });

    it('staff and the superadmin take tests as themselves, flagged so they are never counted (D25)', async () => {
      for (const who of ['mentorA', 'admin'] as const) {
        const { data, error } = await start(who);
        expect(error, who).toBeNull();
        expect(data.by_staff, who).toBe(true);
        expect((await save(who, data.id, '0', 'staff practice')).error, who).toBeNull();
        await end(who, data.id, 'abandon');
      }
    });

    it('a candidate’s session is not flagged as staff', async () => {
      const s = await startOk('candA1');
      const { data } = await world.service.from('sessions').select('by_staff').eq('id', s.id).single();
      expect(data?.by_staff).toBe(false);
      await end('candA1', s.id, 'abandon');
    });

    it('a candidate cannot claim a session as staff practice', async () => {
      const s = await startOk('candA1');
      await p('candA1').client.from('sessions').update({ by_staff: true }).eq('id', s.id);
      const { data } = await world.service.from('sessions').select('by_staff').eq('id', s.id).single();
      expect(data?.by_staff).toBe(false);
      await end('candA1', s.id, 'abandon');
    });

    it('an academy candidate cannot see the other academy exists', async () => {
      const { data } = await p('candA1').client.from('organisations').select('id');
      expect(data?.map((o) => o.id)).toEqual([world.orgs.a]);
    });
  });

  describe('the server clock (UI.md §3.2)', () => {
    it('takes the start time from the server and fixes the end from the test, not the caller', async () => {
      const before = Date.now();
      const s = await startOk('candA1');
      const started = new Date(s.started_at).getTime();
      expect(Math.abs(started - before)).toBeLessThan(15_000);
      expect(new Date(s.expires_at).getTime() - started).toBe(60 * WORD_SECONDS * 1000);
      await end('candA1', s.id, 'abandon');
    });

    it('allows one live session per test per candidate', async () => {
      const s = await startOk('candA1');
      const again = await start('candA1');
      expect(again.error?.message).toMatch(/session_live/);
      await end('candA1', s.id, 'abandon');
    });

    it('accepts an answer while its word is on screen', async () => {
      const s = await startOk('candA1');
      expect((await save('candA1', s.id, '0', 'in time')).error).toBeNull();
      await end('candA1', s.id, 'abandon');
    });

    it('refuses an answer for a word not yet shown', async () => {
      const s = await startOk('candA1');
      expect((await save('candA1', s.id, '5', 'too early')).error?.message).toMatch(/item_not_open/);
      await end('candA1', s.id, 'abandon');
    });

    it('refuses an answer once its window has closed — a refresh buys no time', async () => {
      const s = await startOk('candA1');
      await backdate(s.id, WORD_SECONDS + 5);
      expect((await save('candA1', s.id, '0', 'too late')).error?.message).toMatch(/item_closed/);
      await end('candA1', s.id, 'abandon');
    });

    it('lets a closed window be sealed blank, but never overwritten', async () => {
      const s = await startOk('candA1');
      await save('candA1', s.id, '0', 'kept');
      await backdate(s.id, WORD_SECONDS * 2 + 5);
      expect((await save('candA1', s.id, '1', '', true)).error).toBeNull();
      expect((await save('candA1', s.id, '0', '', true)).error?.message).toMatch(/item_closed/);
      const { data } = await p('candA1').client.from('responses').select('key, response_text').eq('session_id', s.id).order('key');
      expect(data).toEqual([{ key: '0', response_text: 'kept' }, { key: '1', response_text: '' }]);
      await end('candA1', s.id, 'abandon');
    });

    it("refuses writes to someone else's session", async () => {
      const s = await startOk('candA1');
      expect((await save('candA2', s.id, '0', 'intruder')).error?.message).toMatch(/not_your_session/);
      await end('candA1', s.id, 'abandon');
    });

    it('refuses answers once the session has ended', async () => {
      const s = await startOk('candA1');
      await end('candA1', s.id, 'abandon');
      expect((await save('candA1', s.id, '0', 'after')).error?.message).toMatch(/session_ended/);
    });

    it('refuses to record expiry before the clock has run out', async () => {
      const s = await startOk('candA1');
      expect((await end('candA1', s.id, 'expiry')).error?.message).toMatch(/not_expired/);
      await end('candA1', s.id, 'abandon');
    });
  });

  describe('schema hygiene', () => {
    it('indexes every foreign key, so cascades and joins never scan', async () => {
      const { data, error } = await world.service.rpc('unindexed_foreign_keys');
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('timings', () => {
    it('match the runner exactly — the server enforces what the screen shows', async () => {
      const { data } = await p('candA1').client.from('instrument_timings').select('assessment_type, mode, item_count, seconds_per_item');
      const wat = INSTRUMENT_CONFIGS.wat;
      expect(wat.mode).toBe('forced_sequence');
      expect(data).toContainEqual({
        assessment_type: 'wat',
        mode: wat.mode,
        item_count: 'itemCount' in wat ? wat.itemCount : null,
        seconds_per_item: wat.mode === 'forced_sequence' ? wat.secondsPerItem : null,
      });
    });
  });

  describe('paper mode (D22)', () => {
    it('keeps the code written on the sheet and takes no typed answers', async () => {
      const { data: s, error } = await start('candA1', 'paper', 'ACD-EFG');
      expect(error).toBeNull();
      expect(s.paper_code).toBe('ACD-EFG');
      expect((await save('candA1', s.id, '0', 'typed')).error?.message).toMatch(/paper_session/);
      await end('candA1', s.id, 'abandon');
    });

    it('refuses a code outside the handwriting-safe alphabet', async () => {
      const { error } = await start('candA1', 'paper', 'AB0-1IL');
      expect(error).not.toBeNull();
    });
  });

  describe('consent (DPDP Act)', () => {
    it('stops an under-18 without guardian consent from starting a test', async () => {
      expect((await start('minor')).error?.message).toMatch(/consent_required/);
    });

    it('lets them start once a guardian has consented', async () => {
      const s = await startOk('minorConsented');
      await end('minorConsented', s.id, 'abandon');
    });
  });

  describe('answer-sheet storage (seam rule 2)', () => {
    it('exists, is private, and accepts only images and PDFs', async () => {
      const { data, error } = await world.service.storage.getBucket('answer-sheets');
      expect(error).toBeNull();
      expect(data?.public).toBe(false);
      expect([...(data?.allowed_mime_types ?? [])].sort()).toEqual(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
    });

    it('cannot be read or listed by a signed-in candidate', async () => {
      const { data } = await p('candA1').client.storage.from('answer-sheets').list();
      expect(data ?? []).toEqual([]);
    });
  });
});
