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

/** The pages anyone may read and search engines should find: the sitemap lists exactly these. */
export const PUBLIC_PAGES: readonly string[] = ['/', '/privacy'];

/** The landing page's real route. Visitors with no session see it at `/`; its own path redirects there, so it has one address. */
export const LANDING = '/welcome';

/** What crawlers fetch besides pages (src/app/robots.ts, sitemap.ts, the share images and icon). */
const CRAWLER_FILES = ['/robots.txt', '/sitemap.xml', '/opengraph-image', '/twitter-image', '/apple-icon'];

/** Reachable without a session: the sign-in page, Google's return to it, the privacy policy, the blank printable sheet (no data on it), and the crawler files. */
export function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname === GOOGLE_CALLBACK || pathname === '/privacy' || pathname.startsWith('/sheets/') || CRAWLER_FILES.includes(pathname);
}

export type Entry = { kind: 'pass' } | { kind: 'rewrite'; to: string } | { kind: 'redirect'; to: string } | { kind: 'login' };

/** What the proxy does with a request: the landing page at `/` for a visitor with no session, Home for someone signed in. */
export function entryFor(pathname: string, signedIn: boolean): Entry {
  if (pathname === LANDING) return { kind: 'redirect', to: '/' };
  if (signedIn) return { kind: 'pass' };
  if (pathname === '/') return { kind: 'rewrite', to: LANDING };
  return isPublicPath(pathname) ? { kind: 'pass' } : { kind: 'login' };
}

/** Where Google sends someone back (D42). It must also be on Supabase's redirect allow-list. */
export const GOOGLE_CALLBACK = '/auth/callback';

export type GoogleFailure = 'cancelled' | 'failed' | 'not_set_up';

const GOOGLE_ERRORS: Readonly<Record<GoogleFailure, string>> = {
  cancelled: 'Google sign-in was cancelled.',
  failed: 'Google sign-in didn’t work. Try again.',
  not_set_up: 'This login is not set up yet. Ask your academy.',
};

/** The sign-in page's message for `?error=`. Only a known code shows anything, so a crafted link cannot put words on the page. */
export function googleSignInError(code: string | null): string | null {
  return code !== null && Object.hasOwn(GOOGLE_ERRORS, code) ? GOOGLE_ERRORS[code as GoogleFailure] : null;
}

/** Google's reply, read before any code is exchanged: a refusal on Google's screen, any other error, or no code. */
export function googleCallbackFailure(query: URLSearchParams): GoogleFailure | null {
  const error = query.get('error');
  if (error === 'access_denied') return 'cancelled';
  if (error || !query.get('code')) return 'failed';
  return null;
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

/**
 * What the sign-in form says for an auth error code. A wrong email and a wrong
 * password read the same, so the form never reveals which emails have an
 * account. A switched-off login (D31) reads the same too: the auth server says
 * `user_banned` whatever password is typed, so naming it would reveal the email.
 */
export function signInError(code: string | undefined): string {
  if (code === 'invalid_credentials' || code === 'user_banned') return 'Email or password is wrong.';
  return 'Sign-in is unavailable right now. Try again in a minute.';
}
