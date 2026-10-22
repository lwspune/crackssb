import { describe, it, expect } from 'vitest';
import { LANDING, PUBLIC_PAGES, areasFor, entryFor, googleCallbackFailure, googleSignInError, homeFor, isPublicPath, parseCredentials, pathAllowedFor, safeNext, signInError } from '../routing.ts';
import type { Role } from '../routing.ts';

/** Sign-in routing: where each role lands, and what a `?next=` may point at. */
describe('homeFor', () => {
  it('sends candidates to the student app, staff to the staff app, the superadmin to admin', () => {
    expect(homeFor('candidate')).toBe('/');
    expect(homeFor('mentor')).toBe('/staff');
    expect(homeFor('org_admin')).toBe('/staff');
    expect(homeFor('superadmin')).toBe('/admin');
  });
});

describe('safeNext — never an open redirect', () => {
  it('keeps a path inside the role’s own area', () => {
    expect(safeNext('/practise', 'candidate')).toBe('/practise');
    expect(safeNext('/run/wat?x=1', 'candidate')).toBe('/run/wat?x=1');
    expect(safeNext('/staff/people', 'mentor')).toBe('/staff/people');
    expect(safeNext('/admin/orgs', 'superadmin')).toBe('/admin/orgs');
  });

  const hostile = ['https://evil.example', '//evil.example', '/\\evil.example', '\\\\evil.example', 'javascript:alert(1)', ' /practise', '/%2F%2Fevil.example', ''];
  for (const next of hostile) {
    it(`refuses ${JSON.stringify(next)}`, () => {
      expect(safeNext(next, 'candidate')).toBeNull();
    });
  }

  it('refuses null', () => {
    expect(safeNext(null, 'candidate')).toBeNull();
  });

  it('refuses an area above the role, so a link cannot land a candidate on a staff page', () => {
    expect(safeNext('/staff', 'candidate')).toBeNull();
    expect(safeNext('/admin', 'candidate')).toBeNull();
    expect(safeNext('/admin', 'mentor')).toBeNull();
    expect(safeNext('/admin', 'org_admin')).toBeNull();
  });

  it('keeps a link into an area below the role (D25)', () => {
    expect(safeNext('/practise', 'mentor')).toBe('/practise');
    expect(safeNext('/staff/people', 'superadmin')).toBe('/staff/people');
  });

  it('refuses the sign-in page itself, so a sign-in cannot loop', () => {
    expect(safeNext('/login', 'candidate')).toBeNull();
  });
});

describe('layered access (D25): each role reaches its own area and every area below it', () => {
  const table: [Role, string, boolean][] = [
    ['candidate', '/', true],
    ['candidate', '/run/wat', true],
    ['candidate', '/staff/people', false],
    ['candidate', '/admin/academies', false],
    ['mentor', '/', true],
    ['mentor', '/run/wat', true],
    ['mentor', '/staff/people', true],
    ['mentor', '/admin/academies', false],
    ['org_admin', '/practise', true],
    ['org_admin', '/staff/people/new', true],
    ['org_admin', '/admin', false],
    ['superadmin', '/', true],
    ['superadmin', '/run/wat', true],
    ['superadmin', '/staff/people', true],
    ['superadmin', '/admin/academies', true],
  ];
  for (const [role, path, allowed] of table) {
    it(`${role} ${allowed ? 'may' : 'may not'} open ${path}`, () => {
      expect(pathAllowedFor(path, role)).toBe(allowed);
    });
  }

  it('lists the areas a role may switch between, its own first', () => {
    expect(areasFor('candidate')).toEqual(['student']);
    expect(areasFor('mentor')).toEqual(['staff', 'student']);
    expect(areasFor('org_admin')).toEqual(['staff', 'student']);
    expect(areasFor('superadmin')).toEqual(['admin', 'staff', 'student']);
  });

  it('still signs each role in to its own area', () => {
    expect(homeFor('candidate')).toBe('/');
    expect(homeFor('mentor')).toBe('/staff');
    expect(homeFor('superadmin')).toBe('/admin');
  });
});

describe('isPublicPath', () => {
  it('lets the sign-in page, Google’s return and the printable sheet through without a session', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/auth/callback')).toBe(true);
    expect(isPublicPath('/sheets/wat')).toBe(true);
  });

  it('lets the privacy policy through: Google links to it from its sign-in screen', () => {
    expect(isPublicPath('/privacy')).toBe(true);
  });

  it('lets crawlers read robots.txt, the sitemap and the share images', () => {
    for (const p of ['/robots.txt', '/sitemap.xml', '/opengraph-image', '/twitter-image', '/apple-icon']) expect(isPublicPath(p)).toBe(true);
  });

  it('guards everything else', () => {
    for (const p of ['/', '/practise', '/run/wat', '/staff', '/admin', '/loginx', '/auth', '/auth/callbackx', '/auth/other', '/privacyx', '/privacy/x', '/robots.txtx', '/sitemap.xml/x']) {
      expect(isPublicPath(p)).toBe(false);
    }
  });
});

describe('entryFor — what the proxy does with a request', () => {
  it('shows a visitor with no session the landing page at /, without changing the address', () => {
    expect(entryFor('/', false)).toEqual({ kind: 'rewrite', to: LANDING });
  });

  it('keeps Home at / for someone signed in', () => {
    expect(entryFor('/', true)).toEqual({ kind: 'pass' });
  });

  it('gives the landing page one address: its own path goes to /', () => {
    expect(entryFor(LANDING, false)).toEqual({ kind: 'redirect', to: '/' });
    expect(entryFor(LANDING, true)).toEqual({ kind: 'redirect', to: '/' });
    expect(entryFor(`${LANDING}/x`, false)).toEqual({ kind: 'login' });
  });

  it('sends a visitor with no session to sign in for anything not public', () => {
    for (const p of ['/practise', '/staff', '/results/wat/x']) expect(entryFor(p, false)).toEqual({ kind: 'login' });
    for (const p of ['/login', '/privacy', '/sheets/tat', '/robots.txt']) expect(entryFor(p, false)).toEqual({ kind: 'pass' });
  });

  it('lets someone signed in through to everything else (pages decide by role)', () => {
    for (const p of ['/practise', '/staff', '/login']) expect(entryFor(p, true)).toEqual({ kind: 'pass' });
  });
});

describe('PUBLIC_PAGES — what the sitemap lists', () => {
  it('is the landing page and the privacy policy, each reachable without a session', () => {
    expect(PUBLIC_PAGES).toEqual(['/', '/privacy']);
    for (const p of PUBLIC_PAGES) expect(entryFor(p, false).kind).not.toBe('login');
  });
});

describe('googleSignInError — what the sign-in page says when Google sends someone back', () => {
  it('names each way it can go wrong, plainly', () => {
    expect(googleSignInError('cancelled')).toMatch(/cancelled/i);
    expect(googleSignInError('not_set_up')).toMatch(/not set up/i);
    expect(googleSignInError('failed')).toMatch(/didn’t work/i);
  });

  it('says nothing without a known code, so a crafted link cannot put words on the page', () => {
    expect(googleSignInError(null)).toBeNull();
    expect(googleSignInError('')).toBeNull();
    expect(googleSignInError('<script>alert(1)</script>')).toBeNull();
    expect(googleSignInError('toString')).toBeNull();
  });
});

describe('googleCallbackFailure — Google’s reply, read before anything is exchanged', () => {
  const q = (s: string) => new URLSearchParams(s);
  it('reads a refusal on Google’s screen as cancelled', () => {
    expect(googleCallbackFailure(q('error=access_denied&error_description=x'))).toBe('cancelled');
  });
  it('reads any other error, or no code at all, as failed', () => {
    expect(googleCallbackFailure(q('error=server_error'))).toBe('failed');
    expect(googleCallbackFailure(q(''))).toBe('failed');
    expect(googleCallbackFailure(q('code='))).toBe('failed');
  });
  it('passes a reply that carries a code', () => {
    expect(googleCallbackFailure(q('code=abc&next=%2Fpractise'))).toBeNull();
  });
});

describe('parseCredentials — checked before the auth server is asked', () => {
  const form = (entries: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  };

  it('accepts an email and password, trimming and lower-casing the email', () => {
    expect(parseCredentials(form({ email: ' Cadet@Example.COM ', password: 'secret-pass' }))).toEqual({ ok: true, email: 'cadet@example.com', password: 'secret-pass' });
  });

  it('refuses a missing or malformed email', () => {
    expect(parseCredentials(form({ password: 'x' })).ok).toBe(false);
    expect(parseCredentials(form({ email: 'nope', password: 'x' })).ok).toBe(false);
  });

  it('refuses an empty or absurdly long password without trimming it', () => {
    expect(parseCredentials(form({ email: 'a@b.co', password: '' })).ok).toBe(false);
    expect(parseCredentials(form({ email: 'a@b.co', password: 'x'.repeat(201) })).ok).toBe(false);
    expect(parseCredentials(form({ email: 'a@b.co', password: '  spaced  ' }))).toMatchObject({ password: '  spaced  ' });
  });
});

describe('signInError — what the sign-in form says', () => {
  it('says the same thing for a wrong email as for a wrong password', () => {
    expect(signInError('invalid_credentials')).toBe('Email or password is wrong.');
  });

  it('reads a switched-off login as a wrong password: the auth server says user_banned whatever password is typed (D31)', () => {
    expect(signInError('user_banned')).toBe('Email or password is wrong.');
  });

  it('calls anything else the service being unavailable', () => {
    expect(signInError('over_request_rate_limit')).toMatch(/unavailable/i);
    expect(signInError(undefined)).toMatch(/unavailable/i);
  });
});
