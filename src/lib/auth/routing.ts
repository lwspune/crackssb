/**
 * Sign-in routing. Pure, so the proxy, the login action and the tests share
 * one definition of where each role belongs and what a `?next=` may name.
 */

export type Role = 'candidate' | 'mentor' | 'org_admin' | 'superadmin';
export const ROLES: readonly Role[] = ['candidate', 'mentor', 'org_admin', 'superadmin'];

export type Area = 'student' | 'staff' | 'admin';

/**
 * Layered access (D25): each role reaches its own area and every area below
 * it, own area first. A candidate stays in the student app; staff add the
 * staff app; the superadmin reaches all three. Data is still scoped by row
 * level security — reaching an area never widens whose rows a user can read.
 */
const AREAS: Readonly<Record<Role, readonly Area[]>> = {
  candidate: ['student'],
  mentor: ['staff', 'student'],
  org_admin: ['staff', 'student'],
  superadmin: ['admin', 'staff', 'student'],
};

export function areasFor(role: Role): readonly Area[] {
  return AREAS[role];
}

export function areaOfPath(pathname: string): Area {
  if (pathname === '/staff' || pathname.startsWith('/staff/')) return 'staff';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  return 'student';
}

export const AREA_HOME: Readonly<Record<Area, string>> = { student: '/', staff: '/staff', admin: '/admin' };

/** Where a role lands at sign-in: its own area, not the ones below it. */
export function homeFor(role: Role): string {
  return AREA_HOME[AREAS[role][0]];
}

/** May this user be at this path at all? */
export function pathAllowedFor(pathname: string, role: Role): boolean {
  return AREAS[role].includes(areaOfPath(pathname));
}

const BASE = 'https://crackssb.invalid';

/**
 * A `?next=` target, or null. Only a same-site path in the user's own area:
 * no scheme, no `//host`, no backslashes (browsers read `/\host` as a host),
 * no encoded slashes, and never the sign-in page.
 */
export function safeNext(next: string | null, role: Role): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
  if (/%2f|%5c/i.test(next)) return null;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  if (url.pathname === '/login') return null;
  if (!pathAllowedFor(url.pathname, role)) return null;
  return url.pathname + url.search;
}

/** Reachable without a session: the sign-in page, and the blank printable sheet (no data on it). */
export function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/sheets/');
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type Credentials = { ok: true; email: string; password: string } | { ok: false; error: string };

/** Fail fast: nothing malformed reaches the auth server. The password is passed through exactly as typed. */
export function parseCredentials(form: FormData): Credentials {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: 'Enter the email your academy gave you.' };
  if (password.length === 0 || password.length > 200) return { ok: false, error: 'Enter your password.' };
  return { ok: true, email, password };
}
