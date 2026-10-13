import source from '../../../content/oir/agrawal-examcart/ch17-syllogism.source.json' with { type: 'json' };
import { AGRAWAL_CH17_SYLLOGISM as KEY } from '../oir/agrawal-ch17-syllogism.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 17 (Syllogism), pages 62-68: statements and
 * conclusions. Each key is the one printed option that says what the solver
 * (`syllogism.ts`) finds follows. Q94-97 fall beyond the photos.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch17',
  reasoningType: 'syllogism',
  count: 93,
  held: [92],
  reasoned: [],
});
