import { describe, it, expect } from 'vitest';
import source from '../../../content/oir/agrawal-examcart/ch16-venn-diagram.source.json' with { type: 'json' };
import { OPTION_LABELS } from '../bank.ts';
import { validateFigure } from '../oir/figure.ts';
import { AGRAWAL_CH16_VENN_DIAGRAM as KEY, READINGS, matchingOptions, shapeRelations } from '../oir/agrawal-ch16-venn-diagram.ts';
import { chapterSuite } from './oir-chapter-suite.ts';
import type { SourceFile } from './oir-chapter-suite.ts';

/**
 * Agrawal ExamCart OIR, Chapter 16 ("Ven Diagram"), pages 59-61. Every
 * diagram is redrawn as circles (rectangles in Q39-40), and every key is the
 * one option whose drawing matches the stated relation between the classes,
 * found by code (D29).
 */
chapterSuite({
  source: source as SourceFile,
  key: KEY,
  idPrefix: 'oir-agx-ch16',
  reasoningType: 'venn',
  count: 50,
  held: [3, 10, 16, 32, 37, 49],
  reasoned: [],
  directionOverrides: [41],
  assessmentType: 'oir_nonverbal',
});

type Q = { n: number; figure?: unknown; answerPanels?: Record<string, { figure?: unknown }> };
const questions = source.questions as Q[];

describe('chapter 16: the redrawn diagrams', () => {
  it('gives every question either four drawn answers (which diagram) or a drawn figure (which classes), never both', () => {
    for (const q of questions) {
      expect(Boolean(q.answerPanels) !== Boolean(q.figure), `Q${q.n}`).toBe(true);
      if (q.answerPanels) expect(Object.keys(q.answerPanels).sort(), `Q${q.n}`).toEqual([...OPTION_LABELS]);
    }
  });

  it('draws every answer and figure as a valid figure', () => {
    for (const q of questions) {
      if (q.figure) expect(() => validateFigure(q.figure), `Q${q.n}`).not.toThrow();
      for (const l of OPTION_LABELS) if (q.answerPanels) expect(() => validateFigure(q.answerPanels![l].figure), `Q${q.n} ${l}`).not.toThrow();
    }
  });

  it('keys every "which diagram" question that has drawn answers', () => {
    const keyedWithPanels = questions.filter((q) => q.answerPanels && !('held' in KEY[q.n])).map((q) => q.n);
    expect(keyedWithPanels.length).toBe(37);
  });
});

describe('chapter 16: the matcher', () => {
  it('reads a frame as the whole page, not a class: only the circles inside it count', () => {
    const framed = { lines: [[0, 0, 100, 0], [100, 0, 100, 100], [100, 100, 0, 100], [0, 100, 0, 0]] as const, circles: [[50, 50, 40], [40, 50, 10], [60, 50, 10]] as const };
    expect(shapeRelations(framed).shapes).toBe(3);
  });

  it('reads rectangles drawn as four lines each, when a diagram has no circles', () => {
    const rect = (x1: number, y1: number, x2: number, y2: number) => [[x1, y1, x2, y1], [x2, y1, x2, y2], [x2, y2, x1, y2], [x1, y2, x1, y1]] as const;
    const fig = { lines: [...rect(0, 0, 100, 100), ...rect(10, 10, 40, 40), ...rect(60, 10, 120, 40)] };
    expect(shapeRelations(fig).rels).toEqual([['inside', 1, 0], ['overlap', 0, 2], ['apart', 1, 2]]);
  });

  it('puts a printed label in the smallest drawn shape that holds it', () => {
    const fig = { lines: [], circles: [[50, 50, 40], [50, 50, 15]] as const, labels: [[50, 20, 'P'], [50, 50, 'B']] as const };
    expect(shapeRelations(fig).labelled).toEqual({ P: 0, B: 1 });
  });
});

describe('chapter 16: the held questions, held by code', () => {
  // Two defensible readings of the classes, each picking a different printed option.
  const split: Record<number, string[]> = { 3: ['B', 'D'], 10: ['A', 'C'], 16: ['A', 'B'], 32: ['C', 'D'], 37: ['B', 'C'] };

  it.each(Object.entries(split).map(([n, picks]) => [Number(n), picks] as const))('Q%i: each reading matches exactly one option, and they differ', (n, picks) => {
    const found = READINGS[n].map((r) => matchingOptions(n, r.rels, r.labels));
    for (const f of found) expect(f.length, `Q${n}`).toBe(1);
    expect(found.flat().sort()).toEqual(picks);
  });

  it('Q49: the statements (markers inside boards inside printers) match no drawn option', () => {
    const [r] = READINGS[49];
    expect(matchingOptions(49, r.rels, r.labels)).toEqual([]);
  });
});
