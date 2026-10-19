import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { INSTRUMENT_CONFIGS } from '../../runner/modes.ts';
import { PROMPTS } from '../prompts.ts';

/** SDT (D40): the five paragraphs the SSB asks for, in its order, in fifteen minutes. */
describe('the SDT prompts', () => {
  it('are the SSB’s five, in order', () => {
    expect(PROMPTS.map((p) => p.key)).toEqual(['parents', 'teachers', 'friends', 'self', 'become']);
    expect(PROMPTS[0].text).toMatch(/parents/i);
    expect(PROMPTS[1].text).toMatch(/teachers/i);
    expect(PROMPTS[4].text).toMatch(/qualities .* develop/i);
  });

  it('run fifteen minutes, as the runner does', () => {
    expect(INSTRUMENT_CONFIGS.sdt).toMatchObject({ mode: 'free_write', itemCount: PROMPTS.length, timeLimitSeconds: 900 });
  });
});

describe('the blank sheet as a PDF', () => {
  it('ships, 2 A4 pages, for students to download and print (D38)', () => {
    const pdf = readFileSync(new URL('../../../public/sdt-sheet.pdf', import.meta.url));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(2);
  });
});
