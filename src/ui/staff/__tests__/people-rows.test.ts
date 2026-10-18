import { describe, it, expect } from 'vitest';
import { checkPeople, MAX_PEOPLE } from '../people-rows.ts';
import type { RawPerson } from '../people-rows.ts';

/**
 * Every person added — typed into the form or read from a spreadsheet — passes
 * this one check, in the browser for the preview and again on the server (D31).
 */
const row = (over: Partial<RawPerson> = {}): RawPerson => ({ fullName: 'Cadet One', email: 'one@example.com', dob: '14/03/2007', phone: '', password: '', ...over });

describe('checkPeople', () => {
  it('cleans each field: trimmed name, lower-case email, ISO date, +digits phone', () => {
    const r = checkPeople([row({ fullName: '  Cadet One ', email: ' ONE@Example.com', phone: '98765 43210', password: 'Cadet@2026' })], 'candidate');
    expect(r.errors).toEqual([]);
    expect(r.people).toEqual([{ fullName: 'Cadet One', email: 'one@example.com', dob: '2007-03-14', phone: '+919876543210', password: 'Cadet@2026' }]);
  });

  it('reads ISO and Indian date formats', () => {
    expect(checkPeople([row({ dob: '2007-03-14' })], 'candidate').people[0].dob).toBe('2007-03-14');
    expect(checkPeople([row({ dob: '2-11-2006' })], 'candidate').people[0].dob).toBe('2006-11-02');
  });

  it('leaves a blank password to be made for them', () => {
    expect(checkPeople([row()], 'candidate').people[0].password).toBeNull();
  });

  it('lets staff be added without a date of birth', () => {
    expect(checkPeople([row({ dob: '' })], 'mentor')).toMatchObject({ errors: [], people: [{ dob: null }] });
  });

  it('names the row of every problem and keeps the good rows', () => {
    const r = checkPeople(
      [
        row({ email: 'good@example.com' }),
        row({ email: '' }),
        row({ email: 'bad@example.com', dob: '30/02/2007' }),
        row({ email: 'nodob@example.com', dob: '' }),
        row({ email: 'future@example.com', dob: '01/01/2999' }),
        row({ email: 'phone@example.com', phone: '12345' }),
        row({ email: 'weak@example.com', password: 'short' }),
        row({ email: 'noname@example.com', fullName: ' ' }),
      ],
      'candidate',
    );
    expect(r.people.map((p) => p.email)).toEqual(['good@example.com']);
    expect(r.errors.map((e) => e.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(r.errors.map((e) => e.message)).toEqual([
      'Needs a valid email.',
      'The date of birth is not a real past date.',
      'A candidate needs a date of birth.',
      'The date of birth is not a real past date.',
      'The mobile number is not a mobile number.',
      'Password: At least 8 characters.',
      'Needs a name.',
    ]);
  });

  it('says how to fix a mobile number Excel turned into 9.19123E+11', () => {
    expect(checkPeople([row({ phone: '9.19123E+11' })], 'candidate').errors[0].message).toBe(
      'Excel turned the mobile number into 9.19123E+11. Format the column as Text, type it again, and upload the .xlsx.',
    );
  });

  it('flags an email that appears twice', () => {
    const r = checkPeople([row({ email: 'same@example.com' }), row({ email: 'SAME@example.com' })], 'candidate');
    expect(r.people).toHaveLength(1);
    expect(r.errors).toEqual([{ index: 1, message: 'same@example.com is also on an earlier row.' }]);
  });

  it('notices a password shared by several rows, without refusing it', () => {
    const r = checkPeople(
      [row({ email: 'a@example.com', password: 'Batch@2026' }), row({ email: 'b@example.com', password: 'Own@20266' }), row({ email: 'c@example.com', password: 'Batch@2026' })],
      'candidate',
    );
    expect(r.errors).toEqual([]);
    expect(r.sharedPasswords).toEqual([[0, 2]]);
  });

  it(`refuses more than ${MAX_PEOPLE} people at once, without checking them`, () => {
    const many = Array.from({ length: MAX_PEOPLE + 1 }, (_, i) => row({ email: `c${i}@example.com` }));
    expect(checkPeople(many, 'candidate')).toEqual({ people: [], errors: [{ index: -1, message: `Add at most ${MAX_PEOPLE} people at a time.` }], sharedPasswords: [] });
  });
});
