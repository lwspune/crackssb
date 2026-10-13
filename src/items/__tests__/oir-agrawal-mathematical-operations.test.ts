import source from '../../../content/oir/agrawal-examcart/ch13-mathematical-operations.source.json' with { type: 'json' };
import { AGRAWAL_CH13_MATHEMATICAL_OPERATIONS as KEY } from '../oir/agrawal-ch13-mathematical-operations.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 13 (Mathematical Operations), pages 49-52:
 * signs swapped or coded, and number systems read from examples. Every key is
 * worked out by evaluating the printed sum (`evaluate`, no `eval`); a "which
 * swap" key is the only printed option that balances the equation. The chapter
 * prints no direction, so its items carry none.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch13',
  reasoningType: 'mathematical_operations',
  count: 114,
  held: [44, 68],
  reasoned: [],
});
