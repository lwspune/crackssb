import { describe, it, expect } from 'vitest';
import { CODE_ALPHABET, isSessionCode, sessionCode, sheetPages } from '../paper.ts';

/**
 * The code a candidate writes at the top of a paper sheet, linking the scan
 * to the session (D22). Read off a phone photo of handwriting, so it avoids
 * every character a hand blurs into another.
 */
describe('session code', () => {
  it('is six characters, grouped 3-3 for copying by hand', () => {
    expect(sessionCode(() => 0)).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  });

  it('never uses characters handwriting confuses — 0/O, 1/I/L, 5/S, 8/B, 2/Z', () => {
    for (const c of ['0', 'O', '1', 'I', 'L', '5', 'S', '8', 'B', '2', 'Z']) expect(CODE_ALPHABET).not.toContain(c);
  });

  it('draws every character from the alphabet', () => {
    const seq = [0, 0.2, 0.4, 0.6, 0.8, 0.99];
    let i = 0;
    const code = sessionCode(() => seq[i++ % seq.length]);
    for (const c of code.replace('-', '')) expect(CODE_ALPHABET).toContain(c);
  });

  it('differs between sessions', () => {
    const codes = new Set(Array.from({ length: 200 }, () => sessionCode(Math.random)));
    expect(codes.size).toBeGreaterThan(195);
  });

  it('accepts only its own shape — the sheet page validates the query string with this', () => {
    expect(isSessionCode(sessionCode(Math.random))).toBe(true);
    for (const bad of ['', 'ABC', 'ABC-DE0', 'abc-def', 'ABC-DEF-GHK', '<script>', 'ABCDEF']) expect(isSessionCode(bad)).toBe(false);
  });
});

describe('answer sheet pages', () => {
  it('splits sixty lines into two pages of thirty', () => {
    const pages = sheetPages(60, 30);
    expect(pages).toHaveLength(2);
    expect(pages[0][0]).toBe(1);
    expect(pages[1].at(-1)).toBe(60);
  });

  it('numbers every line exactly once, in order', () => {
    expect(sheetPages(12, 5).flat()).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });
});
