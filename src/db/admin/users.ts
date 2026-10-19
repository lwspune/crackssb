import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Logins staff make: an operator with `npm run user:create`, staff in the app
 * (D23). Students without an academy sign up with Google instead (D42).
 * Server-side only — this needs the service-role key.
 */

import { generatePassword } from '../../lib/auth/password.ts';
import { ROLES } from '../../lib/auth/routing.ts';
import type { Role } from '../../lib/auth/routing.ts';

export type { Role };

export interface NewUser {
  readonly email: string;
  readonly fullName: string;
  readonly role: Role;
  readonly dob: string | null;
  /** Academy slug, or null for a solo (B2C) candidate or a superadmin. */
  readonly org: string | null;
  readonly guardianConsent: boolean;
}

type Parsed = { ok: true; value: NewUser } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso && d.getTime() < Date.now() && iso >= '1940-01-01';
}

export function parseNewUser(argv: readonly string[]): Parsed {
  const values: Record<string, string> = {};
  let guardianConsent = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--guardian-consent') { guardianConsent = true; continue; }
    if (!['--email', '--name', '--role', '--dob', '--org'].includes(flag)) return { ok: false, error: `Unknown option ${flag}.` };
    const value = argv[++i];
    if (value === undefined || value.startsWith('--')) return { ok: false, error: `${flag} needs a value.` };
    values[flag.slice(2)] = value;
  }

  const email = (values.email ?? '').trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: 'Give a valid --email.' };
  const fullName = (values.name ?? '').trim();
  if (fullName.length < 1 || fullName.length > 120) return { ok: false, error: 'Give a --name (1–120 characters).' };
  const role = (values.role ?? 'candidate') as Role;
  if (!ROLES.includes(role)) return { ok: false, error: `--role must be one of ${ROLES.join(', ')}.` };

  const dob = values.dob ?? null;
  if (dob !== null && !validDate(dob)) return { ok: false, error: 'The date of birth must be a real past date, YYYY-MM-DD.' };

  const org = values.org ?? null;
  if (org !== null && !SLUG.test(org)) return { ok: false, error: '--org must be an academy slug, like lws-pune.' };
  if ((role === 'mentor' || role === 'org_admin') && org === null) return { ok: false, error: `A ${role} needs an --org (their academy).` };

  return { ok: true, value: { email, fullName, role, dob, org, guardianConsent } };
}

export { generatePassword, PASSWORD_ALPHABET } from '../../lib/auth/password.ts';

export { isMinor } from '../../lib/age.ts';

/**
 * Marks a login as made by staff. The sign-up hook (0020) refuses every
 * account that is neither this nor Google; only the service role can write
 * app_metadata, so the public key cannot claim it.
 */
export const STAFF_MADE = { joined_via: 'staff' } as const;

export interface Created {
  readonly id: string;
  readonly password: string;
}

/** The email already has a login. Reported, never touched (Question_Bank's takeover lesson, 2026-10-06). */
export class ExistingAccount extends Error {
  // A plain field, not a parameter property: the CLI runs under Node's type stripping, which rejects those.
  readonly email: string;
  constructor(email: string) {
    super(`${email} already has an account.`);
    this.email = email;
  }
}

export interface AccountInput {
  readonly email: string;
  readonly fullName: string;
  readonly role: Role;
  readonly dob: string | null;
  readonly phone?: string | null;
  /** Typed by staff (D31), already checked; none, and one is generated. */
  readonly password?: string | null;
  readonly orgId: string | null;
  /** When consent was recorded, or null. */
  readonly guardianConsentAt: string | null;
  /** Who is doing this: null when an operator runs the script. */
  readonly createdBy: string | null;
  readonly consentRecordedBy: string | null;
}

/**
 * Create the login and its profile as one unit: if the profile cannot be
 * written, the login is deleted again, so no account exists without a profile
 * (and a login without one can do nothing — 0001). An existing email is never
 * written to: the auth server refuses it and we report it.
 */
export async function insertAccount(service: SupabaseClient, input: AccountInput): Promise<Created> {
  const password = input.password ?? generatePassword();
  const created = await service.auth.admin.createUser({ email: input.email, password, email_confirm: true, app_metadata: STAFF_MADE });
  if (created.error?.code === 'email_exists') throw new ExistingAccount(input.email);
  if (created.error || !created.data.user) throw new Error(`Creating the login failed: ${created.error?.message ?? 'no user returned'}`);
  const id = created.data.user.id;

  const { error } = await service.from('profiles').insert({
    id,
    email: input.email,
    role: input.role,
    org_id: input.orgId,
    full_name: input.fullName,
    dob: input.dob,
    phone: input.phone ?? null,
    guardian_consent_at: input.guardianConsentAt,
    created_by: input.createdBy,
    guardian_consent_recorded_by: input.consentRecordedBy,
  });
  if (error) {
    await service.auth.admin.deleteUser(id);
    throw new Error(`Writing the profile failed, so the login was removed again: ${error.message}`);
  }
  return { id, password };
}

/** The operator's path (`npm run user:create`): academy by slug, consent recorded by the operator. */
export async function createUser(service: SupabaseClient, user: NewUser): Promise<Created> {
  let orgId: string | null = null;
  if (user.org) {
    const { data, error } = await service.from('organisations').select('id').eq('slug', user.org).maybeSingle();
    if (error) throw new Error(`Looking up the academy failed: ${error.message}`);
    if (!data) throw new Error(`No academy with slug "${user.org}".`);
    orgId = data.id;
  }
  return insertAccount(service, {
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    dob: user.dob,
    orgId,
    guardianConsentAt: user.guardianConsent ? new Date().toISOString() : null,
    createdBy: null,
    consentRecordedBy: null,
  });
}
