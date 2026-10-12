import { describe, it, expect } from 'vitest';
import { slugify } from '../slug.ts';

describe('slugify — an academy name to the short name in its address', () => {
  it('lower-cases and hyphenates', () => {
    expect(slugify('LWS Pune Academy')).toBe('lws-pune-academy');
  });

  it('drops punctuation and collapses runs of separators', () => {
    expect(slugify('  Sainik  — Prep & Coaching (Nagpur)  ')).toBe('sainik-prep-coaching-nagpur');
  });

  it('keeps digits and caps the length at 80 without a trailing hyphen', () => {
    expect(slugify('Batch 2026')).toBe('batch-2026');
    const long = slugify('word '.repeat(40));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long.endsWith('-')).toBe(false);
  });

  it('gives an empty string when nothing usable is left', () => {
    expect(slugify('—!—')).toBe('');
  });
});
