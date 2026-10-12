import source from '../../../content/oir/agrawal-examcart/ch02-classification.source.json' with { type: 'json' };
import { AGRAWAL_CH02_CLASSIFICATION as KEY } from '../oir/agrawal-ch02-classification.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 2 (Odd One Out), pages 4-8. Number and letter
 * questions name the shared property as code (`odd`); word questions are
 * reasoned. A question is held when no plain property singles out one option.
 */
const held = [
  9, 11, 29, 36, 66, 71, 80, 87, 89, 95, 97,
  102, 119, 120, 126, 130, 137, 140, 146, 150, 152, 175, 178, 185,
  191, 206, 213, 235, 239, 240, 248, 249, 251, 276, 285, 291,
];
const words = Array.from({ length: 97 }, (_, i) => i + 1).filter((n) => n !== 58 && !held.includes(n));

chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch02',
  reasoningType: 'classification',
  count: 292,
  held,
  reasoned: [...words, 254, 270],
});
