import { randomInt } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Manual logins (Sprint 1): an operator creates each account with
 * `npm run user:create`. Public sign-up is off; Google sign-in comes later.
 * Server-side only — this needs the service-role key.
 */

export type Role = 'candidate' | 'mentor' | 'org_admin' | 'superadmin';
const ROLES: readonly Role[] = ['candidate', 'mentor', 'org_admin', 'superadmin'];

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
  if (role === 'candidate' && dob === null) return { ok: false, error: 'A candidate needs a --dob (date of birth, YYYY-MM-DD).' };

  const org = values.org ?? null;
  if (org !== null && !SLUG.test(org)) return { ok: false, error: '--org must be an academy slug, like lws-pune.' };
  if ((role === 'mentor' || role === 'org_admin') && org === null) return { ok: false, error: `A ${role} needs an --org (their academy).` };

  return { ok: true, value: { email, fullName, role, dob, org, guardianConsent } };
}

/** No 0/O/o, 1/l/I — the password is read off a screen and typed by someone else. */
export const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generatePassword(length = 16): string {
  return Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('');
}

/** Under 18 today. The database applies the same rule when a test starts. */
export function isMinor(dob: string, today = new Date()): boolean {
  const d = new Date(`${dob}T00:00:00Z`);
  const eighteenth = new Date(Date.UTC(d.getUTCFullYear() + 18, d.getUTCMonth(), d.getUTCDate()));
  return today < eighteenth;
}

export interface Created {
  readonly id: string;
  readonly password: string;
}

/**
 * Create the login and its profile. The two are one unit: if the profile
 * cannot be written, the login is deleted again, so no account exists without
 * a profile (and an account without one can do nothing — 0001).
 */
export async function createUser(service: SupabaseClient, user: NewUser): Promise<Created> {
  let orgId: string | null = null;
  if (user.org) {
    const { data, error } = await service.from('organisations').select('id').eq('slug', user.org).maybeSingle();
    if (error) throw new Error(`Looking up the academy failed: ${error.message}`);
    if (!data) throw new Error(`No academy with slug "${user.org}".`);
    orgId = data.id;
  }

  const password = generatePassword();
  const created = await service.auth.admin.createUser({ email: user.email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(`Creating the login failed: ${created.error?.message ?? 'no user returned'}`);
  const id = created.data.user.id;

  const { error } = await service.from('profiles').insert({
    id,
    role: user.role,
    org_id: orgId,
    full_name: user.fullName,
    dob: user.dob,
    guardian_consent_at: user.guardianConsent ? new Date().toISOString() : null,
  });
  if (error) {
    await service.auth.admin.deleteUser(id);
    throw new Error(`Writing the profile failed, so the login was removed again: ${error.message}`);
  }
  return { id, password };
}
