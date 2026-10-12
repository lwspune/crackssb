import { describe, it, expect } from 'vitest';
import { areasFor, homeFor, isPublicPath, parseCredentials, pathAllowedFor, safeNext } from '../routing.ts';
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
  it('lets the sign-in page and the printable sheet through without a session', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/sheets/wat')).toBe(true);
  });

  it('guards everything else', () => {
    for (const p of ['/', '/practise', '/run/wat', '/staff', '/admin', '/loginx']) expect(isPublicPath(p)).toBe(false);
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
