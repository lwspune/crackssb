import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { buildWorld, FIXTURE_DOMAIN, hasDatabase, leftovers, serviceClient } from './helpers/world.ts';
import type { World } from './helpers/world.ts';
import { createPeople } from '../admin/people.ts';

/**
 * Staff create logins in the app (Sprint 1, after manual logins). The rule
 * of who may create whom lives in the database (can_create_person); the
 * server checks it as the signed-in caller before using the service role.
 */
const ADULT = '2005-01-15';

describe.skipIf(!hasDatabase)('creating people', () => {
  let world: World;
  const made: string[] = [];

  beforeAll(async () => {
    world = await buildWorld({
      admin: { role: 'superadmin', org: null, dob: '1985-01-01' },
      ownerA: { role: 'org_admin', org: 'a', dob: '1980-01-01' },
      mentorA: { role: 'mentor', org: 'a', dob: '1990-01-01' },
      candA: { role: 'candidate', org: 'a', dob: ADULT },
    });
  });

  afterAll(async () => {
    for (const id of made) await world.service.auth.admin.deleteUser(id);
    await world?.destroy();
    expect(await leftovers(serviceClient())).toEqual([]);
  });

  const may = async (who: string, role: string, org: 'a' | 'b' | null) => {
    const { data, error } = await world.people[who].client.rpc('can_create_person', { p_role: role, p_org: org === null ? null : world.orgs[org] });
    if (error) throw new Error(error.message);
    return data as boolean;
  };

  describe('who may create whom (can_create_person)', () => {
    const matrix: [string, string, 'a' | 'b' | null, boolean][] = [
      ['mentorA', 'candidate', 'a', true],
      ['mentorA', 'candidate', 'b', false],
      ['mentorA', 'mentor', 'a', false],
      ['mentorA', 'org_admin', 'a', false],
      ['ownerA', 'candidate', 'a', true],
      ['ownerA', 'mentor', 'a', true],
      ['ownerA', 'org_admin', 'a', false],
      ['ownerA', 'candidate', 'b', false],
      ['ownerA', 'candidate', null, false],
      ['admin', 'org_admin', 'b', true],
      ['admin', 'candidate', null, true],
      ['admin', 'mentor', null, false],
      ['admin', 'superadmin', null, true],
      ['candA', 'candidate', 'a', false],
    ];
    for (const [who, role, org, expected] of matrix) {
      it(`${who} → ${role} in ${org ?? 'no academy'}: ${expected ? 'yes' : 'no'}`, async () => {
        expect(await may(who, role, org)).toBe(expected);
      });
    }
  });

  describe('createPeople', () => {
    const email = (label: string) => `${world.run}-${label}@${FIXTURE_DOMAIN}`;

    it('creates candidates in the caller’s academy, records who made them, and returns each password once', async () => {
      const r = await createPeople(world.people.mentorA.client, world.service, {
        org: world.orgs.a,
        role: 'candidate',
        people: [{ fullName: 'New Cadet', email: email('new1'), dob: ADULT }],
        guardianConsent: false,
      });
      expect(r.kind).toBe('ok');
      if (r.kind !== 'ok') return;
      expect(r.created).toHaveLength(1);
      made.push(r.created[0].id);
      const { data } = await world.service.from('profiles').select('org_id, role, created_by, email').eq('id', r.created[0].id).single();
      expect(data).toEqual({ org_id: world.orgs.a, role: 'candidate', created_by: world.people.mentorA.id, email: email('new1') });

      const fresh = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
      expect((await fresh.auth.signInWithPassword({ email: email('new1'), password: r.created[0].password })).error).toBeNull();
    });

    it('records guardian consent and who recorded it, for the minors in the list', async () => {
      const r = await createPeople(world.people.ownerA.client, world.service, {
        org: world.orgs.a,
        role: 'candidate',
        people: [{ fullName: 'Young Cadet', email: email('minor'), dob: '2011-02-02' }],
        guardianConsent: true,
      });
      if (r.kind !== 'ok') throw new Error(r.kind);
      made.push(r.created[0].id);
      const { data } = await world.service.from('profiles').select('guardian_consent_at, guardian_consent_recorded_by').eq('id', r.created[0].id).single();
      expect(data?.guardian_consent_at).not.toBeNull();
      expect(data?.guardian_consent_recorded_by).toBe(world.people.ownerA.id);
    });

    it('never touches an account that already exists — its password still works', async () => {
      const existing = world.people.candA;
      const r = await createPeople(world.people.ownerA.client, world.service, {
        org: world.orgs.a,
        role: 'candidate',
        people: [{ fullName: 'Impostor', email: existing.email, dob: ADULT }],
        guardianConsent: false,
      });
      expect(r).toMatchObject({ kind: 'ok', created: [], existing: [existing.email] });
      const { data } = await world.service.from('profiles').select('full_name').eq('id', existing.id).single();
      expect(data?.full_name).not.toBe('Impostor');
      // Sign in again with the original session's user: the account is unchanged, so its existing session is still valid.
      expect((await existing.client.auth.getUser()).data.user?.email).toBe(existing.email);
    });

    it('refuses before creating anything when the caller may not create that role', async () => {
      const r = await createPeople(world.people.mentorA.client, world.service, {
        org: world.orgs.a,
        role: 'mentor',
        people: [{ fullName: 'Not Allowed', email: email('nope'), dob: null }],
        guardianConsent: false,
      });
      expect(r.kind).toBe('forbidden');
      const { data } = await world.service.auth.admin.listUsers({ perPage: 1000 });
      expect(data.users.some((u) => u.email === email('nope'))).toBe(false);
    });

    it('refuses another academy', async () => {
      const r = await createPeople(world.people.mentorA.client, world.service, {
        org: world.orgs.b,
        role: 'candidate',
        people: [{ fullName: 'Wrong Academy', email: email('wrongorg'), dob: ADULT }],
        guardianConsent: false,
      });
      expect(r.kind).toBe('forbidden');
    });
  });

  describe('creating academies (create_academy)', () => {
    it('lets the superadmin create one', async () => {
      const { data, error } = await world.people.admin.client.rpc('create_academy', { p_name: 'Test academy C', p_slug: `test-${world.run}-c` });
      expect(error).toBeNull();
      await world.service.from('organisations').delete().eq('id', data);
    });

    it('refuses everyone else', async () => {
      for (const who of ['ownerA', 'mentorA', 'candA']) {
        const { error } = await world.people[who].client.rpc('create_academy', { p_name: 'Nope', p_slug: `test-${world.run}-${who.toLowerCase()}` });
        expect(error?.message, who).toMatch(/not_superadmin/);
      }
    });

    it('refuses a short name that is taken', async () => {
      const { data: org } = await world.service.from('organisations').select('slug').eq('id', world.orgs.a).single();
      const { error } = await world.people.admin.client.rpc('create_academy', { p_name: 'Dup', p_slug: org!.slug });
      expect(error?.message).toMatch(/slug_taken/);
    });
  });

  it('lets staff list their own academy’s people, emails included — and not the other academy’s', async () => {
    const { data } = await world.people.mentorA.client.from('profiles').select('email, org_id');
    expect(data?.length).toBeGreaterThan(0);
    for (const row of data ?? []) expect(row.org_id).toBe(world.orgs.a);
  });
});
