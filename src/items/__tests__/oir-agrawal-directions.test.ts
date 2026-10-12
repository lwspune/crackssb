import source from '../../../content/oir/agrawal-examcart/ch08-directions.source.json' with { type: 'json' };
import { AGRAWAL_CH08_DIRECTIONS as KEY } from '../oir/agrawal-ch08-directions.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 8 (Directions), pages 29-34. Walks and turns
 * are run by `walk`; the shadow questions and one misprinted option are
 * reasoned in words. The chapter prints no direction, so its items carry none.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch08',
  reasoningType: 'directions',
  count: 100,
  held: [6, 10, 41, 61, 62, 66, 87],
  reasoned: [11, 31, 32, 56],
});
