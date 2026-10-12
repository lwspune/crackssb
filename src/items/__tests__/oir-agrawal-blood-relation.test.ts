import source from '../../../content/oir/agrawal-examcart/ch07-blood-relation.source.json' with { type: 'json' };
import { AGRAWAL_CH07_BLOOD_RELATION as KEY } from '../oir/agrawal-ch07-blood-relation.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 7 (Blood Relation), pages 24-28. Every key is
 * a family tree traced in words, so all keyed questions are reasoned; the
 * held ones are those whose print leaves no single answer.
 */
const keyed = Array.from({ length: 98 }, (_, i) => i + 1).filter((n) => ![31, 44, 61, 75, 85, 94].includes(n));

chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch07',
  reasoningType: 'blood_relation',
  count: 98,
  held: [31, 44, 61, 75, 85, 94],
  reasoned: keyed,
});
