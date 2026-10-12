import { describe, it, expect } from 'vitest';
import { parsePeopleLines } from '../people-lines.ts';

/** The "Add people" box: one person per line, pasted from wherever an academy keeps its list. */
describe('parsePeopleLines', () => {
  it('reads name, email and date of birth, comma-separated', () => {
    expect(parsePeopleLines('Cadet One, one@example.com, 2007-03-14', 'candidate')).toEqual({
      people: [{ fullName: 'Cadet One', email: 'one@example.com', dob: '2007-03-14' }],
      errors: [],
    });
  });

  it('reads tab-separated rows pasted from a spreadsheet, and Indian date formats', () => {
    const r = parsePeopleLines('Cadet One\tONE@Example.com\t14/03/2007\nCadet Two\ttwo@example.com\t02-11-2006', 'candidate');
    expect(r.errors).toEqual([]);
    expect(r.people).toEqual([
      { fullName: 'Cadet One', email: 'one@example.com', dob: '2007-03-14' },
      { fullName: 'Cadet Two', email: 'two@example.com', dob: '2006-11-02' },
    ]);
  });

  it('skips blank lines and a header row', () => {
    const r = parsePeopleLines('Name, Email, DOB\n\nCadet One, one@example.com, 2007-03-14\n   \n', 'candidate');
    expect(r.people).toHaveLength(1);
    expect(r.errors).toEqual([]);
  });

  it('lets staff be added without a date of birth', () => {
    expect(parsePeopleLines('A Mentor, mentor@lws.in', 'mentor')).toEqual({
      people: [{ fullName: 'A Mentor', email: 'mentor@lws.in', dob: null }],
      errors: [],
    });
  });

  it('names the line of every problem and keeps the good lines', () => {
    const r = parsePeopleLines(['Good One, good@example.com, 2007-03-14', 'No Email, , 2007-03-14', 'Bad Date, bad@example.com, 2007-02-30', 'No Dob, nodob@example.com', 'Future, future@example.com, 2999-01-01'].join('\n'), 'candidate');
    expect(r.people.map((p) => p.email)).toEqual(['good@example.com']);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4, 5]);
    expect(r.errors[0].message).toMatch(/email/i);
    expect(r.errors[1].message).toMatch(/date of birth/i);
    expect(r.errors[2].message).toMatch(/date of birth/i);
  });

  it('flags an email that appears twice in the same paste', () => {
    const r = parsePeopleLines('A, same@example.com, 2007-01-01\nB, SAME@example.com, 2007-01-01', 'candidate');
    expect(r.people).toHaveLength(1);
    expect(r.errors).toEqual([{ line: 2, message: 'same@example.com is already on line 1.' }]);
  });

  it('refuses more than 100 people at once, without parsing them', () => {
    const many = Array.from({ length: 101 }, (_, i) => `P${i}, p${i}@example.com, 2007-01-01`).join('\n');
    const r = parsePeopleLines(many, 'candidate');
    expect(r.people).toEqual([]);
    expect(r.errors[0].message).toMatch(/100/);
  });
});
