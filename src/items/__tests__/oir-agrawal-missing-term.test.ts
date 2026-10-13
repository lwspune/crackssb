import source from '../../../content/oir/agrawal-examcart/ch12-missing-term.source.json' with { type: 'json' };
import { AGRAWAL_CH12_MISSING_TERM as KEY } from '../oir/agrawal-ch12-missing-term.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 12 (Find the Missing Term), pages 45-48:
 * number grids, crosses, trees and circles with one term missing. Grids carry
 * their printed tables; a figure that cannot be tabled is described in words.
 * Every key's rule is run on the figure's own complete rows first; the two
 * word puzzles (72, 73) rest on their argument alone.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch12',
  reasoningType: 'missing_term',
  count: 79,
  held: [7, 31, 39, 54],
  reasoned: [72, 73],
});
