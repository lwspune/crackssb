import source from '../../../content/oir/agrawal-examcart/ch05-logical-sequence.source.json' with { type: 'json' };
import { AGRAWAL_CH05_LOGICAL_SEQUENCE as KEY } from '../oir/agrawal-ch05-logical-sequence.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 5 (Logical Sequence of Words), pages 17-21.
 * Dictionary questions are sorted in code; logical-order questions are
 * reasoned in words. Q1-2 print five options and are held (owner's call).
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch05',
  reasoningType: 'word_order',
  count: 88,
  held: [1, 2, 27, 59, 74],
  reasoned: [14, 15, 16, 17, 18, 20, 22, 23, 24, 25, 28, 29, 30, 31, 32, 33, 34, 35, 65],
});
