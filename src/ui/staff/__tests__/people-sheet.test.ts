import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loginsWorkbook, peopleTemplate, readPeopleFile, readPeopleSheet, TEMPLATE_HEADERS } from '../people-sheet.ts';
import { readXlsx } from '../../../lib/sheet/xlsx.ts';

/**
 * Bulk upload (D31 §8): the template staff download, and how an uploaded
 * sheet becomes rows for checkPeople. The fixtures were saved by Excel 16
 * itself (our template filled in; a sheet an academy made on its own, with
 * real date cells and numeric phones; that sheet saved as CSV) — so these
 * tests read what Excel actually writes, not what we assume it writes.
 */
const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

describe('the template', () => {
  it('has the columns upload reads, in order, and nothing to upload by mistake', async () => {
    const rows = await readXlsx(peopleTemplate());
    expect(rows).toEqual([[...TEMPLATE_HEADERS]]);
    expect(readPeopleSheet(rows)).toEqual({ rows: [], error: null });
  });
});

describe('readPeopleSheet', () => {
  it('maps columns by their header, in any order, under any of their usual names', () => {
    const r = readPeopleSheet([
      ['E-mail ID', 'Full Name', 'Phone', 'DOB'],
      ['one@example.com', 'Cadet One', 9876543210, '14/03/2008'],
    ]);
    expect(r).toEqual({ error: null, rows: [{ sheetRow: 2, person: { fullName: 'Cadet One', email: 'one@example.com', dob: '14/03/2008', phone: '9876543210', password: '' } }] });
  });

  it('turns an Excel date cell into a date', () => {
    const r = readPeopleSheet([['Name', 'Email', 'Date of birth'], ['A', 'a@example.com', 39521]]);
    expect(r.rows[0].person.dob).toBe('2008-03-14');
  });

  it('skips blank rows and keeps each row’s own number', () => {
    const r = readPeopleSheet([['Name', 'Email'], ['A', 'a@example.com'], [null, ''], ['B', 'b@example.com']]);
    expect(r.rows.map((x) => x.sheetRow)).toEqual([2, 4]);
  });

  it('starts at the first row that has anything in it', () => {
    const r = readPeopleSheet([[], [null], ['Name', 'Email'], ['A', 'a@example.com']]);
    expect(r.rows).toEqual([{ sheetRow: 4, person: { fullName: 'A', email: 'a@example.com', dob: '', phone: '', password: '' } }]);
  });

  it('says what is missing when the header row has no name or email column', () => {
    expect(readPeopleSheet([['Student', 'Contact'], ['A', 'x']]).error).toMatch(/Name and an Email column/);
    expect(readPeopleSheet([]).error).toMatch(/empty/i);
  });
});

describe('files saved by Excel', () => {
  it('our template, filled in', async () => {
    const r = await readPeopleFile('people.xlsx', fixture('excel-template-filled.xlsx'));
    expect(r.error).toBeNull();
    expect(r.rows).toEqual([
      { sheetRow: 2, person: { fullName: 'Cadet One', email: 'one@example.com', dob: '14/03/2008', phone: '98765 43210', password: 'Cadet@2026' } },
      { sheetRow: 3, person: { fullName: 'Cadet Two', email: 'two@example.com', dob: '02/11/2007', phone: '', password: '' } },
      { sheetRow: 5, person: { fullName: 'Cadet Three', email: 'three@example.com', dob: '2007-01-05', phone: '+91 91234 56789', password: 'Batch@2026' } },
    ]);
  });

  it('a sheet of their own: date cells and number phones', async () => {
    const r = await readPeopleFile('mine.xlsx', fixture('excel-own-sheet.xlsx'));
    expect(r.error).toBeNull();
    expect(r.rows.map((x) => x.person)).toEqual([
      { fullName: 'Cadet One', email: 'one@example.com', dob: '2008-03-14', phone: '9876543210', password: '' },
      { fullName: 'Cadet Two', email: 'two@example.com', dob: '2007-11-02', phone: '919123456789', password: '' },
    ]);
  });

  it('the same sheet saved as CSV — where Excel has already lost a 12-digit number', async () => {
    const r = await readPeopleFile('mine.csv', fixture('excel-own-sheet.csv'));
    expect(r.error).toBeNull();
    expect(r.rows.map((x) => x.person)).toEqual([
      { fullName: 'Cadet One', email: 'one@example.com', dob: '14/03/2008', phone: '9876543210', password: '' },
      // Excel writes what the cell shows, and General shows 919123456789 as 9.19123E+11: the digits are gone before we see the file.
      { fullName: 'Cadet Two', email: 'two@example.com', dob: '02/11/2007', phone: '9.19123E+11', password: '' },
    ]);
  });

  it('refuses another kind of file', async () => {
    expect((await readPeopleFile('people.pdf', new Uint8Array([1, 2, 3]))).error).toMatch(/\.xlsx or \.csv/);
  });
});

describe('loginsWorkbook', () => {
  it('lists each new login with its WhatsApp message, for the academy’s records', async () => {
    const rows = await readXlsx(loginsWorkbook([{ fullName: 'Cadet One', email: 'one@example.com', password: 'Cadet@2026', phone: '+919876543210', needsConsent: false }]));
    expect(rows[0]).toEqual(['Name', 'Email', 'Password', 'Mobile', 'Message']);
    expect(rows[1].slice(0, 4)).toEqual(['Cadet One', 'one@example.com', 'Cadet@2026', '+91 98765 43210']);
    expect(rows[1][4]).toMatch(/^Hi Cadet, your CadetPrep login:/);
  });
});
