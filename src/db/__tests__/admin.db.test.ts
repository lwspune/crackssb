import { describe, it, expect, afterAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createUser } from '../admin/users.ts';
import { FIXTURE_DOMAIN, FIXTURE_ORG_PREFIX, hasDatabase, leftovers, serviceClient } from './helpers/world.ts';

/** `npm run user:create`, against the real project: what an operator does, end to end. */
describe.skipIf(!hasDatabase)('manual logins', () => {
  const service = serviceClient();
  const run = `t${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
  const made: string[] = [];
  let orgId: string | null = null;

  afterAll(async () => {
    for (const id of made) await service.auth.admin.deleteUser(id);
    if (orgId) await service.from('organisations').delete().eq('id', orgId);
    expect(await leftovers(service)).toEqual([]);
  });

  it('creates a login that signs in with the password it prints, with its profile in place', async () => {
    const { data: org } = await service.from('organisations').insert({ name: 'Test academy', slug: `${FIXTURE_ORG_PREFIX}${run}`, type: 'academy' }).select('id').single();
    orgId = org!.id;
    const email = `${run}-op@${FIXTURE_DOMAIN}`;
    const { id, password } = await createUser(service, { email, fullName: 'Fixture Op', role: 'candidate', dob: '2004-05-05', org: `${FIXTURE_ORG_PREFIX}${run}`, guardianConsent: false });
    made.push(id);

    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
    const { data: me } = await client.from('profiles').select('role, org_id, full_name').eq('id', id).single();
    expect(me).toEqual({ role: 'candidate', org_id: orgId, full_name: 'Fixture Op' });
  });

  it('refuses an academy that does not exist, before creating any login', async () => {
    const email = `${run}-noorg@${FIXTURE_DOMAIN}`;
    await expect(createUser(service, { email, fullName: 'X', role: 'mentor', dob: null, org: `${FIXTURE_ORG_PREFIX}${run}-missing`, guardianConsent: false })).rejects.toThrow(/No academy/);
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
    expect(data.users.some((u) => u.email === email)).toBe(false);
  });

  it('removes the login again if its profile cannot be written', async () => {
    const email = `${run}-badprofile@${FIXTURE_DOMAIN}`;
    // A mentor with no academy breaks profiles_staff_have_org in the database itself.
    await expect(createUser(service, { email, fullName: 'X', role: 'mentor', dob: null, org: null, guardianConsent: false })).rejects.toThrow(/login was removed/);
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
    expect(data.users.some((u) => u.email === email)).toBe(false);
  });
});
