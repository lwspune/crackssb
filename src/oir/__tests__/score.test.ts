import { describe, it, expect } from 'vitest';
import { scoreOir, percentileOf, bandFor, BAND_THRESHOLDS } from '../score.ts';
import type { AssembledBooklet } from '../../items/bank.ts';

/** Ten items: 4 analogy (key A), 3 series (key B), 3 classification (key C). */
const booklet: AssembledBooklet = {
  type: 'oir_verbal',
  released: [
    ...[0, 1, 2, 3].map((o) => ({ id: `an${o}`, ordinal: o, payload: { reasoningType: 'analogy' } })),
    ...[4, 5, 6].map((o) => ({ id: `se${o}`, ordinal: o, payload: { reasoningType: 'series' } })),
    ...[7, 8, 9].map((o) => ({ id: `cl${o}`, ordinal: o, payload: { reasoningType: 'classification' } })),
  ],
  answerKey: { 0: 'A', 1: 'A', 2: 'A', 3: 'A', 4: 'B', 5: 'B', 6: 'B', 7: 'C', 8: 'C', 9: 'C' },
};

const answers = (fn: (ordinal: number) => string) =>
  Object.fromEntries(booklet.released.map((r) => [String(r.ordinal), fn(r.ordinal)]));

describe('scoreOir — raw and per-type', () => {
  it('all correct', () => {
    const s = scoreOir(booklet, answers((o) => booklet.answerKey[o]));
    expect(s).toMatchObject({ attempted: 10, correct: 10, raw: 10 });
    expect(s.byType.analogy).toEqual({ n: 4, attempted: 4, correct: 4, pValue: 1 });
    expect(s.byType.series).toEqual({ n: 3, attempted: 3, correct: 3, pValue: 1 });
  });

  it('all blank: nothing attempted, and a type with no attempts has no p-value — not zero', () => {
    const s = scoreOir(booklet, answers(() => ''));
    expect(s).toMatchObject({ attempted: 0, correct: 0, raw: 0 });
    expect(s.byType.analogy).toEqual({ n: 4, attempted: 0, correct: 0, pValue: null });
    for (const i of s.items) expect(i.correct).toBeNull();
  });

  it('wrong is attempted and false; blank is not attempted and null', () => {
    const s = scoreOir(booklet, { ...answers(() => ''), '0': 'D', '1': 'A' });
    expect(s.attempted).toBe(2);
    expect(s.correct).toBe(1);
    expect(s.items[0]).toEqual({ ordinal: 0, chosen: 'D', correct: false });
    expect(s.items[1]).toEqual({ ordinal: 1, chosen: 'A', correct: true });
    expect(s.items[2]).toEqual({ ordinal: 2, chosen: null, correct: null });
  });

  it('per-type split: series all right, the rest all wrong', () => {
    const s = scoreOir(booklet, answers((o) => (o >= 4 && o <= 6 ? 'B' : 'D')));
    expect(s.raw).toBe(3);
    expect(s.byType.series.pValue).toBe(1);
    expect(s.byType.analogy.pValue).toBe(0);
    expect(s.byType.classification.pValue).toBe(0);
  });

  it('a missing response key counts as blank; case and whitespace are normalised', () => {
    const s = scoreOir(booklet, { '0': ' a ', '4': 'b' });
    expect(s.correct).toBe(2);
    expect(s.attempted).toBe(2);
    expect(s.items[9]).toEqual({ ordinal: 9, chosen: null, correct: null });
  });

  it('emits no OLQ scores — that mapping needs a norm and is not faked here', () => {
    const s = scoreOir(booklet, answers((o) => booklet.answerKey[o]));
    expect(s).not.toHaveProperty('olq');
  });
});

describe('scoreOir — percentile and band', () => {
  it('without a norm both are null, never a fabricated 50th', () => {
    const s = scoreOir(booklet, answers((o) => booklet.answerKey[o]));
    expect(s.percentile).toBeNull();
    expect(s.band).toBeNull();
  });

  it('with a norm, percentile is the share strictly below, ties counted half', () => {
    expect(percentileOf(5, [0, 2, 4, 6, 8])).toBe(60);
    expect(percentileOf(4, [0, 2, 4, 4, 8])).toBe(60);
    expect(percentileOf(9, [0, 2, 4, 6, 8])).toBe(100);
    expect(percentileOf(0, [1, 2, 3])).toBe(0);
  });

  it('an empty norm is no norm', () => {
    expect(percentileOf(5, [])).toBeNull();
    expect(scoreOir(booklet, answers(() => 'A'), []).percentile).toBeNull();
  });

  it('band boundaries follow the provisional thresholds exactly', () => {
    expect(BAND_THRESHOLDS).toEqual([90, 70, 40, 15]);
    expect(bandFor(100)).toBe(1);
    expect(bandFor(90)).toBe(1);
    expect(bandFor(89.9)).toBe(2);
    expect(bandFor(70)).toBe(2);
    expect(bandFor(40)).toBe(3);
    expect(bandFor(15)).toBe(4);
    expect(bandFor(14.9)).toBe(5);
    expect(bandFor(0)).toBe(5);
  });

  it('threads through: raw 10 against a weak norm is band 1', () => {
    const s = scoreOir(booklet, answers((o) => booklet.answerKey[o]), [1, 2, 3, 4, 5, 6, 7, 8, 9, 9]);
    expect(s.percentile).toBe(100);
    expect(s.band).toBe(1);
  });
});

describe('scoreOir — rejects at the boundary', () => {
  it('a response for an ordinal not in the booklet', () => {
    expect(() => scoreOir(booklet, { '99': 'A' })).toThrow(/ordinal 99/);
  });

  it('a choice that is not an option', () => {
    expect(() => scoreOir(booklet, { '0': 'E' })).toThrow(/choice/);
  });

  it('an empty booklet', () => {
    expect(() => scoreOir({ type: 'oir_verbal', released: [], answerKey: {} }, {})).toThrow(/empty/);
  });

  it('a booklet item with no key', () => {
    const noKey: AssembledBooklet = { ...booklet, answerKey: { ...booklet.answerKey, 3: undefined as never } };
    expect(() => scoreOir(noKey, {})).toThrow(/key.*ordinal 3/);
  });
});
