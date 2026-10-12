import source from '../../../content/oir/agrawal-examcart/ch01-analogy.source.json' with { type: 'json' };
import { AGRAWAL_CH01_ANALOGY as KEY } from '../oir/agrawal-ch01-analogy.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 1 (Analogy), pages 1-3. Word analogies are
 * reasoned; number and letter analogies are rules run on the question's own
 * pair first.
 */
const words = Array.from({ length: 31 }, (_, i) => i + 1);

chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch01',
  reasoningType: 'analogy',
  count: 98,
  held: [32, 35, 51, 64, 74, 75, 88, 96],
  reasoned: words,
});
