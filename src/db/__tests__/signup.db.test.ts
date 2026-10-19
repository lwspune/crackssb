import { randomBytes } from 'node:crypto';
import { describe, it, expect, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { FIXTURE_DOMAIN, hasDatabase, leftovers, serviceClient } from './helpers/world.ts';
import { STAFF_MADE } from '../admin/users.ts';

/**
 * Who may make an account (0020, D42). A student may sign up with Google and
 * becomes a candidate with no academy; staff and the script still make the
 * rest. Nobody signs up with an email and password from the public key.
 *
 * A real Google round trip cannot run here. The service role stands in for
 * it: it creates the user the way the auth server does after Google, with
 * `provider: google` in app_metadata, which the public key can never set.
 */
describe.skipIf(!hasDatabase)('sign-up', () => {
  const service = serviceClient();
  const run = `t${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
  const made: string[] = [];
  const email = (label: string) => `${run}-${label}@${FIXTURE_DOMAIN}`;

  afterAll(async () => {
    for (const id of made) await service.auth.admin.deleteUser(id);
    expect(await leftovers(service)).toEqual([]);
  });

  const asGoogle = async (label: string, userMetadata: Record<string, unknown>) => {
    const { data, error } = await service.auth.admin.createUser({
      email: email(label),
      email_confirm: true,
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: userMetadata,
    });
    if (error || !data.user) throw new Error(`google user ${label}: ${error?.message}`);
    made.push(data.user.id);
    const { data: profile } = await service.from('profiles').select('role, org_id, full_name, email, dob, joined_via').eq('id', data.user.id).maybeSingle();
    return profile;
  };

  it('refuses an email-and-password sign-up from the public key, pointing at Google', async () => {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await anon.auth.signUp({ email: email('public'), password: randomBytes(18).toString('base64url') });
    if (data.user) made.push(data.user.id);
    expect(error?.message).toMatch(/Google/);
    expect(data.user).toBeNull();
  });

  it('gives a new Google user a candidate profile with no academy, named as Google names them', async () => {
    expect(await asGoogle('g1', { full_name: 'Fixture Google', name: 'Other' })).toEqual({
      role: 'candidate', org_id: null, full_name: 'Fixture Google', email: email('g1'), dob: null, joined_via: 'google',
    });
  });

  it('falls back to Google’s `name`, then to the email’s first part', async () => {
    expect((await asGoogle('g2', { name: '  Fixture Named  ' }))?.full_name).toBe('Fixture Named');
    expect((await asGoogle('g3', { full_name: '   ' }))?.full_name).toBe(`${run}-g3`);
  });

  it('keeps a long name within the profile’s 120 characters', async () => {
    expect((await asGoogle('g4', { full_name: 'x'.repeat(300) }))?.full_name).toBe('x'.repeat(120));
  });

  it('lets staff-made logins through, and gives them no profile of its own (insertAccount writes it)', async () => {
    const { data, error } = await service.auth.admin.createUser({ email: email('staff'), email_confirm: true, password: randomBytes(18).toString('base64url'), app_metadata: STAFF_MADE });
    expect(error).toBeNull();
    made.push(data.user!.id);
    expect((await service.from('profiles').select('id').eq('id', data.user!.id).maybeSingle()).data).toBeNull();
  });

  it('leaves a staff-made profile as it is when the login later gains Google', async () => {
    const { data, error } = await service.auth.admin.createUser({ email: email('linked'), email_confirm: true, password: randomBytes(18).toString('base64url'), app_metadata: STAFF_MADE });
    if (error || !data.user) throw new Error(error?.message);
    made.push(data.user.id);
    const { error: profileError } = await service.from('profiles').insert({ id: data.user.id, email: email('linked'), role: 'candidate', full_name: 'Fixture Linked' });
    if (profileError) throw new Error(profileError.message);
    const linked = await service.auth.admin.updateUserById(data.user.id, { app_metadata: { provider: 'google', providers: ['email', 'google'] }, user_metadata: { full_name: 'Google Name' } });
    expect(linked.error).toBeNull();
    const { data: profile } = await service.from('profiles').select('full_name, joined_via').eq('id', data.user.id).single();
    expect(profile).toEqual({ full_name: 'Fixture Linked', joined_via: 'staff' });
  });

  it('records staff-made people as joined by staff', async () => {
    const { data } = await service.from('profiles').select('joined_via').neq('joined_via', 'google').limit(1);
    expect(data?.[0]?.joined_via).toBe('staff');
  });
});
