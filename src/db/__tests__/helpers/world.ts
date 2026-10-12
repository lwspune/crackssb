import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A throwaway world for the access tests: two academies, their candidates and
 * mentors, a solo candidate, and two minors. Built with the service role,
 * torn down the same way. Everything carries this run's tag, so cleanup can
 * find it and the leftover check can prove it found all of it.
 *
 * Emails use the reserved `.invalid` TLD (RFC 2606): nothing can ever be sent
 * to a fixture.
 */

export const FIXTURE_DOMAIN = 'test.crackssb.invalid';
export const FIXTURE_ORG_PREFIX = 'test-';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const hasDatabase = Boolean(URL && ANON && SERVICE);

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export function serviceClient(): SupabaseClient {
  return createClient(URL, SERVICE, noSession);
}

export interface Person {
  readonly id: string;
  readonly email: string;
  readonly client: SupabaseClient;
}

interface PersonSpec {
  readonly role: 'candidate' | 'mentor' | 'org_admin' | 'superadmin';
  readonly org: string | null;
  readonly dob: string;
  readonly guardianConsent?: boolean;
}

/** An ISO date `years` before today — for building minors that stay minors whenever the suite runs. */
export function yearsAgo(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export interface World {
  readonly run: string;
  readonly orgs: { readonly a: string; readonly b: string };
  readonly people: Readonly<Record<string, Person>>;
  readonly service: SupabaseClient;
  destroy(): Promise<void>;
}

export async function buildWorld(specs: Readonly<Record<string, PersonSpec>>): Promise<World> {
  const service = serviceClient();
  const run = `t${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
  const userIds: string[] = [];
  const orgIds: string[] = [];

  const destroy = async () => {
    // Deleting the auth user cascades to profile → sessions → responses → uploads.
    for (const id of userIds) await service.auth.admin.deleteUser(id);
    if (orgIds.length) await service.from('organisations').delete().in('id', orgIds);
  };

  try {
    const orgs: Record<'a' | 'b', string> = { a: '', b: '' };
    for (const key of ['a', 'b'] as const) {
      const { data, error } = await service
        .from('organisations')
        .insert({ name: `Test academy ${key.toUpperCase()}`, slug: `${FIXTURE_ORG_PREFIX}${run}-${key}`, type: 'academy' })
        .select('id')
        .single();
      if (error) throw new Error(`org ${key}: ${error.message}`);
      orgs[key] = data.id;
      orgIds.push(data.id);
    }

    const people: Record<string, Person> = {};
    for (const [label, spec] of Object.entries(specs)) {
      const email = `${run}-${label}@${FIXTURE_DOMAIN}`.toLowerCase();
      const password = randomBytes(18).toString('base64url');
      const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error(`user ${label}: ${created.error?.message}`);
      const id = created.data.user.id;
      userIds.push(id);

      const org = spec.org === 'a' ? orgs.a : spec.org === 'b' ? orgs.b : null;
      const { error: profileError } = await service.from('profiles').insert({
        id,
        role: spec.role,
        org_id: org,
        full_name: `Fixture ${label}`,
        dob: spec.dob,
        guardian_consent_at: spec.guardianConsent ? new Date().toISOString() : null,
      });
      if (profileError) throw new Error(`profile ${label}: ${profileError.message}`);

      const client = createClient(URL, ANON, noSession);
      const signIn = await client.auth.signInWithPassword({ email, password });
      if (signIn.error) throw new Error(`sign-in ${label}: ${signIn.error.message}`);
      people[label] = { id, email, client };
    }

    return { run, orgs, people, service, destroy };
  } catch (e) {
    await destroy();
    throw e;
  }
}

/** Anything a test run ever created that is still here. Must be empty after every run. */
export async function leftovers(service: SupabaseClient): Promise<string[]> {
  const found: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) if (u.email?.endsWith(`@${FIXTURE_DOMAIN}`)) found.push(`user ${u.email}`);
    if (data.users.length < 1000) break;
  }
  const { data: orgs, error } = await service.from('organisations').select('slug').like('slug', `${FIXTURE_ORG_PREFIX}%`);
  if (error) throw new Error(`orgs: ${error.message}`);
  for (const o of orgs ?? []) found.push(`org ${o.slug}`);
  return found;
}
