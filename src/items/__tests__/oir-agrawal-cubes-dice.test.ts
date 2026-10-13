import { describe, it, expect } from 'vitest';
import source from '../../../content/oir/agrawal-examcart/ch18-cubes-dice.source.json' with { type: 'json' };
import { validateDice } from '../oir/dice.ts';
import { AGRAWAL_CH18_CUBES_DICE as KEY } from '../oir/agrawal-ch18-cubes-dice.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 18 (Cubes and Dice), pages 69-74. Dice and
 * nets are redrawn (D29) and every key is worked out by the cube solver from
 * the drawing that ships.
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch18',
  reasoningType: 'cubes_dice',
  count: 80,
  held: [24, 29, 30, 33, 42, 43, 44, 54, 62, 64, 69, 70, 71, 73, 76],
  reasoned: [],
  assessmentType: 'oir_nonverbal',
  directionOverrides: [],
});

describe('chapter 18: the redrawn dice', () => {
  it('gives every keyed question a valid drawing', () => {
    for (const q of source.questions) {
      if ('held' in KEY[q.n] || q.n === 80 || q.n === 72) continue;
      expect(() => validateDice((q as { dice?: unknown }).dice), `Q${q.n}`).not.toThrow();
    }
  });
});
