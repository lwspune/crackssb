import source from '../../../content/oir/agrawal-examcart/ch04-word-formation.source.json' with { type: 'json' };
import { AGRAWAL_CH04_WORD_FORMATION as KEY } from '../oir/agrawal-ch04-word-formation.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 4 (Word Formation), pages 15-16. Every key is
 * a letter count: the keyed word is the only option the given word's letters
 * cannot make, each letter used as often as it appears.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch04',
  reasoningType: 'word_formation',
  count: 47,
  held: [],
  reasoned: [],
});
