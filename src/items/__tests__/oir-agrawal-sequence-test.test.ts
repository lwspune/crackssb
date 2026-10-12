import source from '../../../content/oir/agrawal-examcart/ch06-sequence-test.source.json' with { type: 'json' };
import { AGRAWAL_CH06_SEQUENCE_TEST as KEY } from '../oir/agrawal-ch06-sequence-test.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 6 (Sequence Test), pages 22-23: letter
 * positions in the alphabet as printed, with the first half, the second half
 * or the whole of it reversed. Every key is computed from positions.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch06',
  reasoningType: 'alphabet',
  count: 51,
  held: [7, 8, 50],
  reasoned: [],
});
