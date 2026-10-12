import source from '../../../content/oir/agrawal-examcart/ch09-ranking.source.json' with { type: 'json' };
import { AGRAWAL_CH09_RANKING as KEY } from '../oir/agrawal-ch09-ranking.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 9 (Ranking Test), pages 35-37: positions in a
 * row and ranks in a class. Every key is computed by arithmetic. The chapter
 * prints no direction, so its items carry none.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch09',
  reasoningType: 'ranking',
  count: 50,
  held: [],
  reasoned: [],
});
