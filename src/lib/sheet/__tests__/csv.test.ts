import { describe, it, expect } from 'vitest';
import { parseCsv } from '../csv.ts';

/** A .csv as Excel and Google Sheets save it. */
describe('parseCsv', () => {
  it('reads rows and fields', () => {
    expect(parseCsv('Name,Email\nCadet One,one@example.com\n')).toEqual([['Name', 'Email'], ['Cadet One', 'one@example.com']]);
  });

  it('handles quotes, commas and line breaks inside quotes, and doubled quotes', () => {
    expect(parseCsv('"Mehta, Arjun","say ""hi""","two\nlines"')).toEqual([['Mehta, Arjun', 'say "hi"', 'two\nlines']]);
  });

  it('handles Windows line ends and the byte-order mark Excel writes', () => {
    expect(parseCsv('﻿Name,Email\r\nA,a@example.com\r\n')).toEqual([['Name', 'Email'], ['A', 'a@example.com']]);
  });

  it('reads a semicolon file (Excel in some regions) when the header has no comma', () => {
    expect(parseCsv('Name;Email\nA;a@example.com')).toEqual([['Name', 'Email'], ['A', 'a@example.com']]);
  });
});
