import { describe, it, expect } from 'vitest';
import source from '../../../content/oir/agrawal-examcart/ch25-mirror-water.source.json' with { type: 'json' };
import { OPTION_LABELS } from '../bank.ts';
import { AGRAWAL_CH25_MIRROR_WATER as KEY, PRINTED, matchingOptions } from '../oir/agrawal-ch25-mirror-water.ts';
import { isHeld } from '../oir/key.ts';
import { glyphSchema } from '../oir/mirror.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 25 (Mirror and Water Images), pages 109-113.
 * Only questions printed as text are keyed: each option is transcribed glyph
 * by glyph (D29) and the key is the one option whose glyphs are the mirror or
 * water image of the printed text, found by code (`mirror.ts`). Drawn figures
 * are held.
 */
const HELD_TEXT = [13, 14, 16, 27, 35, 36, 53];
const HELD_FIGURES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 18, 19, 20, 21, 28, 31, 34, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 55, 56, 57, 61, 62, 63, 65, 66, 67, 68, 69, 70, 72, 74, 75];

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

const questions = source.questions as SourceFile['questions'];

describe('chapter 25: the printed glyphs', () => {
  it('gives every keyed question a row of glyphs for each option', () => {
    for (const q of questions) {
      if (isHeld(KEY[q.n])) continue;
      const panels = q.answerPanels as Record<string, { glyphs?: unknown[] }> | undefined;
      expect(panels, `Q${q.n}`).toBeDefined();
      for (const l of OPTION_LABELS) {
        expect(panels![l].glyphs, `Q${q.n} ${l}`).toBeDefined();
        for (const g of panels![l].glyphs!) expect(() => glyphSchema.parse(g), `Q${q.n} ${l}`).not.toThrow();
      }
    }
  });

  it('transcribes exactly the text questions, keyed and held, and no figure', () => {
    const withGlyphs = questions.filter((q) => q.answerPanels).map((q) => q.n);
    expect(withGlyphs).toEqual(Object.keys(PRINTED).map(Number).sort((a, b) => a - b));
    for (const n of HELD_FIGURES) expect(PRINTED[n], `Q${n}`).toBeUndefined();
  });

  it('holds only text questions whose glyphs give no single image (none, or more than one option, is it)', () => {
    for (const n of HELD_TEXT) expect(matchingOptions(n).length, `Q${n} options matching`).not.toBe(1);
  });
});
