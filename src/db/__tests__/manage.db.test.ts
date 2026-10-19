import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { buildWorld, FIXTURE_DOMAIN, hasDatabase, leftovers, serviceClient, yearsAgo } from './helpers/world.ts';
import type { World } from './helpers/world.ts';
import { createPeople } from '../admin/people.ts';
import { deletePerson, setActive, setPassword } from '../admin/manage.ts';
import { changeOwnPassword } from '../../lib/auth/own-password.ts';

/**
 * Managing people after they are created (0008, D31). Who may manage whom
 * mirrors who may create whom (D23), and is decided in the database by
 * can_manage_person(), called as the signed-in user before any service-role
 * write. Nobody manages themselves here, nobody manages a superadmin, and
 * nobody reaches into another academy.
 */
const ADULT = '2005-01-15';

const anon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

const signsIn = async (email: string, password: string) => (await anon().auth.signInWithPassword({ email, password })).error?.code ?? 'ok';

describe.skipIf(!hasDatabase)('managing people', () => {
  let world: World;
  const made: string[] = [];

  beforeAll(async () => {
    world = await buildWorld({
      admin: { role: 'superadmin', org: null, dob: '1985-01-01' },
      admin2: { role: 'superadmin', org: null, dob: '1985-01-01', signIn: false },
      ownerA: { role: 'org_admin', org: 'a', dob: '1980-01-01' },
      ownerA2: { role: 'org_admin', org: 'a', dob: '1980-01-01', signIn: false },
      mentorA: { role: 'mentor', org: 'a', dob: '1990-01-01' },
      mentorA2: { role: 'mentor', org: 'a', dob: '1990-01-01', signIn: false },
      candA: { role: 'candidate', org: 'a', dob: ADULT },
      candA2: { role: 'candidate', org: 'a', dob: ADULT, signIn: false },
      minorA: { role: 'candidate', org: 'a', dob: yearsAgo(15), signIn: false },
      switchA: { role: 'candidate', org: 'a', dob: ADULT },
      switchMentorA: { role: 'mentor', org: 'a', dob: '1990-01-01' },
      ownerB: { role: 'org_admin', org: 'b', dob: '1980-01-01' },
      candB: { role: 'candidate', org: 'b', dob: ADULT, signIn: false },
      solo: { role: 'candidate', org: null, dob: ADULT, signIn: false },
      selfA: { role: 'candidate', org: 'a', dob: ADULT, signIn: false },
    });
  });

  afterAll(async () => {
    for (const id of made) await world.service.auth.admin.deleteUser(id);
    await world?.destroy();
    expect(await leftovers(serviceClient())).toEqual([]);
  });

  const id = (who: string) => world.people[who].id;
  const may = async (who: string, target: string, action: string) => {
    const { data, error } = await world.people[who].client.rpc('can_manage_person', { p_target: id(target), p_action: action });
    if (error) throw new Error(error.message);
    return data as boolean;
  };
  const profile = async (who: string) => (await world.service.from('profiles').select('*').eq('id', id(who)).single()).data;

  describe('who may manage whom (can_manage_person)', () => {
    const matrix: [string, string, string, boolean][] = [
      ['mentorA', 'candA', 'edit', true],
      ['mentorA', 'candA', 'password', true],
      ['mentorA', 'candA', 'deactivate', false],
      ['mentorA', 'candA', 'delete', false],
      ['mentorA', 'mentorA2', 'edit', false],
      ['mentorA', 'ownerA', 'password', false],
      ['mentorA', 'candB', 'edit', false],
      ['mentorA', 'solo', 'edit', false],
      ['ownerA', 'candA', 'edit', true],
      ['ownerA', 'candA', 'password', true],
      ['ownerA', 'candA', 'deactivate', true],
      ['ownerA', 'mentorA', 'password', true],
      ['ownerA', 'mentorA', 'deactivate', true],
      ['ownerA', 'mentorA', 'role', false],
      ['ownerA', 'ownerA2', 'password', false],
      ['ownerA', 'candB', 'edit', false],
      ['ownerA', 'ownerA', 'edit', false],
      ['ownerA', 'candA', 'something-else', false],
      ['ownerB', 'candA', 'password', false],
      ['admin', 'ownerA', 'edit', true],
      ['admin', 'ownerA', 'password', true],
      ['admin', 'ownerA', 'deactivate', true],
      ['admin', 'ownerA', 'role', true],
      ['admin', 'mentorA', 'role', true],
      ['admin', 'candA', 'role', false],
      ['admin', 'solo', 'edit', true],
      ['admin', 'admin2', 'password', false],
      ['admin', 'admin', 'edit', false],
      ['candA', 'candA2', 'edit', false],
      ['candA', 'candA', 'password', false],
    ];
    for (const [who, target, action, expected] of matrix) {
      it(`${who} → ${action} ${target}: ${expected ? 'yes' : 'no'}`, async () => {
        expect(await may(who, target, action)).toBe(expected);
      });
    }

    it('says no for someone who does not exist', async () => {
      const { data } = await world.people.admin.client.rpc('can_manage_person', { p_target: '00000000-0000-4000-8000-000000000000', p_action: 'edit' });
      expect(data).toBe(false);
    });
  });

  describe('editing details (update_person)', () => {
    it('changes the name, date of birth and phone', async () => {
      const { error } = await world.people.mentorA.client.rpc('update_person', {
        p_target: id('candA'), p_full_name: '  Renamed Cadet ', p_dob: '2004-05-06', p_phone: '+919876543210',
      });
      expect(error).toBeNull();
      expect(await profile('candA')).toMatchObject({ full_name: 'Renamed Cadet', dob: '2004-05-06', phone: '+919876543210' });
    });

    it('refuses another academy, and changes nothing', async () => {
      const { error } = await world.people.mentorA.client.rpc('update_person', { p_target: id('candB'), p_full_name: 'Taken Over', p_dob: ADULT, p_phone: null });
      expect(error?.message).toMatch(/not_allowed/);
      expect((await profile('candB'))?.full_name).not.toBe('Taken Over');
    });

    it('lets a candidate’s date of birth be left blank (D37)', async () => {
      const { error } = await world.people.ownerA.client.rpc('update_person', { p_target: id('candA2'), p_full_name: 'Cadet', p_dob: null, p_phone: null });
      expect(error).toBeNull();
      expect((await profile('candA2'))?.dob).toBeNull();
      const restore = await world.people.ownerA.client.rpc('update_person', { p_target: id('candA2'), p_full_name: 'Cadet', p_dob: ADULT, p_phone: null });
      expect(restore.error).toBeNull();
    });

    it('refuses a phone number in any shape but +digits', async () => {
      const { error } = await world.people.ownerA.client.rpc('update_person', { p_target: id('candA2'), p_full_name: 'Cadet', p_dob: ADULT, p_phone: '98765 43210' });
      expect(error).not.toBeNull();
    });

    it('cannot be done by writing to the table directly', async () => {
      const { error } = await world.people.ownerA.client.from('profiles').update({ full_name: 'Direct' }).eq('id', id('candA2'));
      expect(error).not.toBeNull();
    });
  });

  describe('guardian consent after the fact (record_guardian_consent)', () => {
    it('records it, and who did', async () => {
      expect((await profile('minorA'))?.guardian_consent_at).toBeNull();
      const { error } = await world.people.mentorA.client.rpc('record_guardian_consent', { p_target: id('minorA') });
      expect(error).toBeNull();
      const p = await profile('minorA');
      expect(p?.guardian_consent_at).not.toBeNull();
      expect(p?.guardian_consent_recorded_by).toBe(id('mentorA'));
    });

    it('refuses another academy', async () => {
      const { error } = await world.people.ownerB.client.rpc('record_guardian_consent', { p_target: id('candA2') });
      expect(error?.message).toMatch(/not_allowed/);
    });
  });

  describe('changing a role (set_person_role)', () => {
    it('lets the superadmin make a mentor an academy owner and back', async () => {
      expect((await world.people.admin.client.rpc('set_person_role', { p_target: id('mentorA2'), p_role: 'org_admin' })).error).toBeNull();
      expect((await profile('mentorA2'))?.role).toBe('org_admin');
      expect((await world.people.admin.client.rpc('set_person_role', { p_target: id('mentorA2'), p_role: 'mentor' })).error).toBeNull();
      expect((await profile('mentorA2'))?.role).toBe('mentor');
    });

    it('refuses an academy owner, and any role but mentor or owner', async () => {
      expect((await world.people.ownerA.client.rpc('set_person_role', { p_target: id('mentorA2'), p_role: 'org_admin' })).error?.message).toMatch(/not_allowed/);
      expect((await world.people.admin.client.rpc('set_person_role', { p_target: id('mentorA2'), p_role: 'superadmin' })).error?.message).toMatch(/not_allowed/);
      expect((await world.people.admin.client.rpc('set_person_role', { p_target: id('candA2'), p_role: 'mentor' })).error?.message).toMatch(/not_allowed/);
    });
  });

  describe('setting a password (setPassword)', () => {
    it('lets a mentor set a candidate’s password, which then signs in', async () => {
      const r = await setPassword(world.people.mentorA.client, world.service, { target: id('candA2'), password: 'Fresh@2026' });
      expect(r).toEqual({ kind: 'ok' });
      expect(await signsIn(world.people.candA2.email, 'Fresh@2026')).toBe('ok');
    });

    it('refuses an academy owner’s password to a mentor, and leaves it working', async () => {
      const r = await setPassword(world.people.mentorA.client, world.service, { target: id('ownerA'), password: 'Taken@2026' });
      expect(r).toEqual({ kind: 'forbidden' });
      expect(await signsIn(world.people.ownerA.email, 'Taken@2026')).not.toBe('ok');
      expect((await world.people.ownerA.client.auth.getUser()).error).toBeNull();
    });

    it('refuses a weak password before touching the login', async () => {
      const r = await setPassword(world.people.ownerA.client, world.service, { target: id('candA2'), password: 'short' });
      expect(r).toMatchObject({ kind: 'invalid' });
      expect(await signsIn(world.people.candA2.email, 'Fresh@2026')).toBe('ok');
    });
  });

  describe('switching a login off and on (setActive)', () => {
    const PW = 'Switch@2026';

    it('blocks sign-in and every read, and records who did it', async () => {
      await setPassword(world.people.ownerA.client, world.service, { target: id('switchA'), password: PW });
      expect(await setActive(world.people.ownerA.client, world.service, { target: id('switchA'), active: false })).toEqual({ kind: 'ok' });

      const p = await profile('switchA');
      expect(p?.deactivated_at).not.toBeNull();
      expect(p?.deactivated_by).toBe(id('ownerA'));
      expect(await signsIn(world.people.switchA.email, PW)).toBe('user_banned');
      // The auth server says so whatever the password — which is why the sign-in form reads it as a wrong password (signInError).
      expect(await signsIn(world.people.switchA.email, 'Wrong@2026')).toBe('user_banned');
      // The session it already had reads nothing, not even its own profile.
      const { data } = await world.people.switchA.client.from('profiles').select('id');
      expect(data ?? []).toEqual([]);
    });

    it('still lets staff see the person, to switch them back on', async () => {
      const { data } = await world.people.ownerA.client.from('profiles').select('id, deactivated_at').eq('id', id('switchA')).single();
      expect(data?.deactivated_at).not.toBeNull();
    });

    it('lets them sign in again once switched back on', async () => {
      expect(await setActive(world.people.ownerA.client, world.service, { target: id('switchA'), active: true })).toEqual({ kind: 'ok' });
      expect(await profile('switchA')).toMatchObject({ deactivated_at: null, deactivated_by: null });
      expect(await signsIn(world.people.switchA.email, PW)).toBe('ok');
    });

    it('takes away a switched-off mentor’s right to add or manage people', async () => {
      await setActive(world.people.ownerA.client, world.service, { target: id('switchMentorA'), active: false });
      const client = world.people.switchMentorA.client;
      expect((await client.rpc('can_create_person', { p_role: 'candidate', p_org: world.orgs.a })).data).toBe(false);
      expect((await client.rpc('can_manage_person', { p_target: id('candA'), p_action: 'edit' })).data).toBe(false);
    });

    it('refuses a mentor', async () => {
      expect(await setActive(world.people.mentorA.client, world.service, { target: id('candA'), active: false })).toEqual({ kind: 'forbidden' });
      expect((await profile('candA'))?.deactivated_at).toBeNull();
    });
  });

  describe('removing a login nobody has used (deletePerson)', () => {
    const email = (label: string) => `${world.run}-${label}@${FIXTURE_DOMAIN}`;

    it('removes a login that never signed in — how a mistyped email is fixed', async () => {
      const r = await createPeople(world.people.ownerA.client, world.service, {
        org: world.orgs.a, role: 'candidate', people: [{ fullName: 'Typo Cadet', email: email('typo'), dob: ADULT }], guardianConsent: false,
      });
      if (r.kind !== 'ok') throw new Error(r.kind);
      const target = r.created[0].id;
      made.push(target);
      expect(await deletePerson(world.people.mentorA.client, world.service, { target })).toEqual({ kind: 'forbidden' });
      expect(await deletePerson(world.people.ownerA.client, world.service, { target })).toEqual({ kind: 'ok' });
      expect((await world.service.from('profiles').select('id').eq('id', target)).data).toEqual([]);
    });

    it('refuses a login that has been used, and keeps it', async () => {
      expect(await deletePerson(world.people.ownerA.client, world.service, { target: id('candA') })).toEqual({ kind: 'forbidden' });
      expect(await profile('candA')).not.toBeNull();
    });
  });

  describe('changing your own password (changeOwnPassword)', () => {
    const START = 'Start@2026';
    // One signed-in session for the three cases: the auth server rate-limits sign-ins.
    let signedIn: ReturnType<typeof anon>;

    beforeAll(async () => {
      await setPassword(world.people.ownerA.client, world.service, { target: id('selfA'), password: START });
      signedIn = anon();
      const { error } = await signedIn.auth.signInWithPassword({ email: world.people.selfA.email, password: START });
      if (error) throw new Error(`selfA sign-in: ${error.code}`);
    });

    it('needs the current password', async () => {
      expect(await changeOwnPassword(signedIn, anon(), { current: 'Wrong@2026', next: 'Next@20266' })).toEqual({ kind: 'wrong_current' });
      expect(await signsIn(world.people.selfA.email, START)).toBe('ok');
    });

    it('refuses a weak new password', async () => {
      expect(await changeOwnPassword(signedIn, anon(), { current: START, next: 'short' })).toMatchObject({ kind: 'invalid' });
    });

    it('changes it: the new one signs in, the old one no longer does', async () => {
      expect(await changeOwnPassword(signedIn, anon(), { current: START, next: 'Next@20266' })).toEqual({ kind: 'ok' });
      expect(await signsIn(world.people.selfA.email, 'Next@20266')).toBe('ok');
      expect(await signsIn(world.people.selfA.email, START)).not.toBe('ok');
    });
  });
});
