import { describe, it, expect } from 'vitest';
import source from '../../../content/oir/agrawal-examcart/ch28-counting-figures.source.json' with { type: 'json' };
import { validateFigure } from '../oir/figure.ts';
import { AGRAWAL_CH28_COUNTING_FIGURES as KEY } from '../oir/agrawal-ch28-counting-figures.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 28 (Counting Figures), pages 125-127. The
 * figures are redrawn as lines and circles (D29) and every key is counted
 * from the figure that ships, by code.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch28',
  reasoningType: 'counting_figures',
  count: 50,
  held: [2, 9, 16, 17, 29, 30, 36, 37],
  reasoned: [],
  assessmentType: 'oir_nonverbal',
});

describe('chapter 28: the redrawn figures', () => {
  it('gives every keyed question a valid figure', () => {
    for (const q of source.questions) {
      if ('held' in KEY[q.n]) continue;
      expect(() => validateFigure((q as { figure?: unknown }).figure), `Q${q.n}`).not.toThrow();
    }
  });
});
