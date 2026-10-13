import { describe, it, expect } from 'vitest';
import source from '../../../content/oir/agrawal-examcart/ch25-mirror-water.source.json' with { type: 'json' };
import { OPTION_LABELS } from '../bank.ts';
import { AGRAWAL_CH25_MIRROR_WATER as KEY, PRINTED, REDRAWN, figureMatches, matchingOptions } from '../oir/agrawal-ch25-mirror-water.ts';
import { validateFigure } from '../oir/figure.ts';
import { isHeld } from '../oir/key.ts';
import type { KeyedEntry } from '../oir/key.ts';
import { glyphSchema } from '../oir/mirror.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 25 (Mirror and Water Images), pages 109-113.
 * Questions printed as text are transcribed glyph by glyph (D29) and the key
 * is the one option whose glyphs are the mirror or water image of the printed
 * text (`mirror.ts`). Drawn questions are redrawn as figures and the key is
 * the one option whose drawing is the question's drawing reflected
 * (`fold.ts`), both found by code.
 */
const HELD_TEXT = [13, 14, 16, 27, 35, 36, 53];
const KEYED_FIGURES = [2, 4, 5, 6, 7, 8, 10, 17, 19, 20, 21, 34, 40, 45, 47, 48, 49, 50, 51, 56, 61, 62, 63, 65, 69, 70, 72, 74];
/** Redrawn, but the redraw is no option's image (18, 28, 57) or two options' (55): held, never adjusted to fit. */
const HELD_REDRAWN = [18, 28, 55, 57];
/** Not redrawn: letters whose turn decides, curves, or marks below the photo's resolution. */
const HELD_UNDRAWN = [1, 3, 9, 31, 39, 41, 42, 43, 44, 46, 66, 67, 68, 75];
const HELD_FIGURES = [...HELD_REDRAWN, ...HELD_UNDRAWN].sort((a, b) => a - b);

chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch25',
  reasoningType: 'mirror_water',
  count: 76,
  held: [...HELD_TEXT, ...HELD_FIGURES].sort((a, b) => a - b),
  reasoned: [],
  assessmentType: 'oir_nonverbal',
});

type Q = SourceFile['questions'][number] & { readonly answerPanels?: Readonly<Record<string, { glyphs?: unknown[]; figure?: unknown }>> };
const questions = source.questions as unknown as Q[];
const question = (n: number) => questions[n - 1];

describe('chapter 25: the printed glyphs', () => {
  it('gives every keyed text question a row of glyphs for each option', () => {
    for (const q of questions) {
      if (isHeld(KEY[q.n]) || !PRINTED[q.n]) continue;
      expect(q.answerPanels, `Q${q.n}`).toBeDefined();
      for (const l of OPTION_LABELS) {
        expect(q.answerPanels![l].glyphs, `Q${q.n} ${l}`).toBeDefined();
        for (const g of q.answerPanels![l].glyphs!) expect(() => glyphSchema.parse(g), `Q${q.n} ${l}`).not.toThrow();
      }
    }
  });

  it('transcribes exactly the text questions as glyphs', () => {
    const withGlyphs = questions.filter((q) => q.answerPanels?.A.glyphs).map((q) => q.n);
    expect(withGlyphs).toEqual(Object.keys(PRINTED).map(Number).sort((a, b) => a - b));
    for (const n of [...KEYED_FIGURES, ...HELD_FIGURES]) expect(PRINTED[n], `Q${n}`).toBeUndefined();
  });

  it('holds only text questions whose glyphs give no single image (none, or more than one option, is it)', () => {
    for (const n of HELD_TEXT) expect(matchingOptions(n).length, `Q${n} options matching`).not.toBe(1);
  });
});

describe('chapter 25: the redrawn figures', () => {
  it('redraws exactly the keyed figure questions and the held ones whose redraw is no single option', () => {
    const drawn = questions.filter((q) => q.figure).map((q) => q.n);
    expect(drawn).toEqual([...KEYED_FIGURES, ...HELD_REDRAWN].sort((a, b) => a - b));
    expect(Object.keys(REDRAWN).map(Number).sort((a, b) => a - b)).toEqual(drawn);
    for (const n of HELD_UNDRAWN) expect(question(n).answerPanels, `Q${n}`).toBeUndefined();
  });

  it('gives every redrawn question a valid figure and a valid drawing for each option', () => {
    for (const n of [...KEYED_FIGURES, ...HELD_REDRAWN]) {
      const q = question(n);
      expect(() => validateFigure(q.figure), `Q${n} figure`).not.toThrow();
      for (const l of OPTION_LABELS) expect(() => validateFigure(q.answerPanels?.[l]?.figure), `Q${n} ${l}`).not.toThrow();
    }
  });

  it('keys every redrawn figure question by code: the one option that is its image', () => {
    for (const n of KEYED_FIGURES) {
      const k = KEY[n];
      expect(isHeld(k), `Q${n}`).toBe(false);
      expect(figureMatches(n), `Q${n}`).toEqual([(k as KeyedEntry).key]);
    }
  });

  it('holds the redrawn questions whose image is no single option', () => {
    for (const n of HELD_REDRAWN) {
      expect(isHeld(KEY[n]), `Q${n}`).toBe(true);
      expect(figureMatches(n).length, `Q${n} options matching`).not.toBe(1);
    }
  });

  it('describes every redrawn option in words', () => {
    for (const n of [...KEYED_FIGURES, ...HELD_REDRAWN]) {
      const opts = OPTION_LABELS.map((l) => question(n).options[l]);
      for (const o of opts) expect(o, `Q${n}`).not.toMatch(/^Figure [A-D]$/);
      // Q55 prints figure d as both C and D.
      if (n !== 55) expect(new Set(opts).size, `Q${n}`).toBe(4);
    }
  });
});
