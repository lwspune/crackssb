import { describe, it, expect } from 'vitest';
import { generatePassword, parseNewUser, PASSWORD_ALPHABET } from '../users.ts';

/**
 * Manual logins (Sprint 1): an operator creates every account. The input is
 * checked here, before anything touches the auth server — fail fast.
 */
const base = ['--email', 'Cadet.One@Example.com', '--name', 'Cadet One'];

describe('parseNewUser', () => {
  it('accepts a candidate with a date of birth, and normalises the email', () => {
    const r = parseNewUser([...base, '--role', 'candidate', '--dob', '2006-03-14']);
    expect(r).toEqual({ ok: true, value: { email: 'cadet.one@example.com', fullName: 'Cadet One', role: 'candidate', dob: '2006-03-14', org: null, guardianConsent: false } });
  });

  it('defaults to candidate', () => {
    const r = parseNewUser([...base, '--dob', '2006-03-14']);
    expect(r.ok && r.value.role).toBe('candidate');
  });

  it('records guardian consent only when told to', () => {
    const r = parseNewUser([...base, '--dob', '2010-01-01', '--guardian-consent']);
    expect(r.ok && r.value.guardianConsent).toBe(true);
  });

  it('accepts a candidate with no date of birth: it is optional (D37)', () => {
    const r = parseNewUser([...base, '--role', 'candidate']);
    expect(r).toEqual({ ok: true, value: { email: 'cadet.one@example.com', fullName: 'Cadet One', role: 'candidate', dob: null, org: null, guardianConsent: false } });
  });

  it('places a candidate in an academy when given one', () => {
    const r = parseNewUser([...base, '--dob', '2006-03-14', '--org', 'lws-pune']);
    expect(r.ok && r.value.org).toBe('lws-pune');
  });

  const refusals: [string, string[], RegExp][] = [
    ['no email', ['--name', 'X', '--dob', '2006-01-01'], /email/i],
    ['a malformed email', ['--email', 'not-an-email', '--name', 'X', '--dob', '2006-01-01'], /email/i],
    ['no name', ['--email', 'a@b.co', '--dob', '2006-01-01'], /name/i],
    ['an unknown role', [...base, '--role', 'admin', '--dob', '2006-01-01'], /role/i],
    ['an impossible date', [...base, '--dob', '2006-02-30'], /date of birth/i],
    ['a date in the future', [...base, '--dob', '2999-01-01'], /date of birth/i],
    ['a mentor without an academy', [...base, '--role', 'mentor'], /academy/i],
    ['an org_admin without an academy', [...base, '--role', 'org_admin'], /academy/i],
    ['a malformed academy slug', [...base, '--dob', '2006-01-01', '--org', 'LWS Pune'], /academy/i],
    ['an unknown flag', [...base, '--dob', '2006-01-01', '--sudo'], /unknown/i],
  ];
  for (const [label, argv, message] of refusals) {
    it(`refuses ${label}`, () => {
      const r = parseNewUser(argv);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(message);
    });
  }
});

describe('generatePassword', () => {
  it('is long enough for the project policy (10) with room to spare', () => {
    expect(generatePassword()).toHaveLength(16);
  });

  it('avoids characters people misread when copying a password off a screen', () => {
    for (const c of ['0', 'O', 'o', '1', 'l', 'I']) expect(PASSWORD_ALPHABET).not.toContain(c);
    for (const c of generatePassword()) expect(PASSWORD_ALPHABET).toContain(c);
  });

  it('differs every time', () => {
    expect(new Set(Array.from({ length: 50 }, generatePassword)).size).toBe(50);
  });
});
