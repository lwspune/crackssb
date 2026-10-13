import { describe, it, expect } from 'vitest';
import source from '../../../content/oir/agrawal-examcart/ch24-paper-folding.source.json' with { type: 'json' };
import { validateFigure } from '../oir/figure.ts';
import { AGRAWAL_CH24_PAPER_FOLDING as KEY } from '../oir/agrawal-ch24-paper-folding.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 24 (Paper Cutting and Folding), pages 102-108.
 * Folds, punches and answer figures ship in sheet units (D29) and every key is
 * found by opening the sheet out in code.
 */
const HELD = [5, 9, 15, 17, 20, 21, 22, 23, 29, 30, 31, 33, 47, 54, 57, 63, 69, 73, 74, 75, 78, 79, 80, 82];

chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch24',
  reasoningType: 'paper_folding',
  count: 82,
  held: HELD,
  reasoned: [],
  assessmentType: 'oir_nonverbal',
});

describe('chapter 24: the drawings', () => {
  it('gives every keyed question a valid question figure and four valid answer figures', () => {
    for (const q of source.questions as { n: number; figure?: unknown; answerPanels?: Record<string, { figure: unknown }> }[]) {
      if ('held' in KEY[q.n]) continue;
      expect(() => validateFigure(q.figure), `Q${q.n} figure`).not.toThrow();
      for (const l of ['A', 'B', 'C', 'D']) expect(() => validateFigure(q.answerPanels![l].figure), `Q${q.n} ${l}`).not.toThrow();
    }
  });
});
