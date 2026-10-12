import source from '../../../content/oir/agrawal-examcart/ch03-coding-decoding.source.json' with { type: 'json' };
import { AGRAWAL_CH03_CODING_DECODING as KEY } from '../oir/agrawal-ch03-coding-decoding.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 3 (Coding Decoding), pages 9-14. Every code
 * rule is run on the book's own examples before it is trusted (the key file
 * refuses to load otherwise); phrase codes are solved by intersection. The
 * renaming riddles and a few phrase codes the solver cannot separate are
 * reasoned in words.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch03',
  reasoningType: 'coding',
  count: 150,
  held: [7, 27, 69, 98, 121, 124],
  reasoned: [51, 52, 53, 54, 55, 56, 57, 58, 75, 87, 91, 143, 146, 148],
});
