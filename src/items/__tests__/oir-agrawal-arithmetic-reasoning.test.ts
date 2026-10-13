import source from '../../../content/oir/agrawal-examcart/ch15-arithmetic-reasoning.source.json' with { type: 'json' };
import { AGRAWAL_CH15_ARITHMETIC_REASONING as KEY } from '../oir/agrawal-ch15-arithmetic-reasoning.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 15 (Arithmetic Reasoning), pages 55-58: ages,
 * ratios, speeds, percentages, sets and shares. Every key is worked out by
 * code. The chapter prints no direction, so its items carry none.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch15',
  reasoningType: 'arithmetic',
  count: 90,
  held: [34, 39],
  reasoned: [],
});
