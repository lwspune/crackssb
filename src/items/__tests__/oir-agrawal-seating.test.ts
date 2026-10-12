import source from '../../../content/oir/agrawal-examcart/ch10-seating.source.json' with { type: 'json' };
import { AGRAWAL_CH10_SEATING as KEY } from '../oir/agrawal-ch10-seating.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 10 (Seating Arrangment), pages 38-40. Puzzles
 * are solved by trying every order; simple chains are reasoned. The three
 * passage sets carry their shared information as `passage`.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch10',
  reasoningType: 'seating',
  count: 51,
  held: [2, 12, 15, 29],
  reasoned: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 35, 38, 51],
});
