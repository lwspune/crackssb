import { describe, it, expect } from 'vitest';
import { aggregate, computeLead, sittingSplit, MIN_N_LEAD } from '../stats.ts';
import type { SittingRow } from '../stats.ts';

const row = (over: Partial<SittingRow> = {}): SittingRow => ({
  itemId: 'q1',
  sittingId: 's1',
  seen: 30,
  attempted: 30,
  correct: 20,
  choiceCounts: { A: 3, B: 20, C: 5, D: 2 },
  discTopCorrect: 8,
  discTopN: 8,
  discBottomCorrect: 3,
  discBottomN: 8,
  keyAtMeasurement: 'B',
  measuredAt: '2026-09-01T00:00:00Z',
  ...over,
});

describe('aggregate — pooled at read time from sitting-grain rows', () => {
  it('nothing in, null out — never a fabricated zero', () => {
    expect(aggregate([], 'B')).toBeNull();
  });

  it('p-value is correct / attempted, never / seen', () => {
    const a = aggregate([row({ seen: 40, attempted: 20, correct: 10 })], 'B');
    expect(a?.pValue).toBe(0.5);
  });

  it('all skipped means no difficulty reading at all', () => {
    expect(aggregate([row({ attempted: 0, correct: 0, choiceCounts: {} })], 'B')).toBeNull();
  });

  it('pools counts across sittings, so a large sitting outweighs a small one', () => {
    const a = aggregate(
      [
        row({ sittingId: 's1', attempted: 100, correct: 90 }),
        row({ sittingId: 's2', attempted: 10, correct: 0 }),
      ],
      'B',
    );
    expect(a?.attempted).toBe(110);
    expect(a?.correct).toBe(90);
    expect(a?.pValue).toBeCloseTo(90 / 110);
    expect(a?.sittings).toBe(2);
  });

  it('discrimination pools as counts, not as a mean of per-sitting rates', () => {
    const a = aggregate(
      [
        row({ sittingId: 's1', discTopCorrect: 90, discTopN: 100, discBottomCorrect: 10, discBottomN: 100 }),
        row({ sittingId: 's2', discTopCorrect: 0, discTopN: 10, discBottomCorrect: 10, discBottomN: 10 }),
      ],
      'B',
    );
    // counts: top 90/110, bottom 20/110 → 0.636; a mean of rates would give (0.8 + -1)/2 = -0.1
    expect(a?.discrimination).toBeCloseTo(90 / 110 - 20 / 110);
  });

  it('discrimination is null when no sitting carried a split — not zero', () => {
    const a = aggregate([row({ discTopCorrect: null, discTopN: null, discBottomCorrect: null, discBottomN: null })], 'B');
    expect(a?.discrimination).toBeNull();
  });

  it('rows measured under a different key are stale and dropped, and counted', () => {
    const a = aggregate([row({ sittingId: 's1' }), row({ sittingId: 's2', keyAtMeasurement: 'C' })], 'B');
    expect(a?.sittings).toBe(1);
    expect(a?.staleDropped).toBe(1);
  });

  it('un-keyed items (WAT) aggregate with a null key', () => {
    const a = aggregate([row({ keyAtMeasurement: null, choiceCounts: {} })], null);
    expect(a?.attempted).toBe(30);
    expect(a?.choiceCounts).toEqual({ A: 0, B: 0, C: 0, D: 0 });
  });
});

describe('sittingSplit — the 27% split within one sitting', () => {
  const sitting = Array.from({ length: 20 }, (_, i) => ({ candidate: `c${i}`, total: i, correctOnItem: i >= 12 }));

  it('top and bottom groups are 27% of the sitting, at least one each', () => {
    const s = sittingSplit(sitting);
    expect(s.discTopN).toBe(5);
    expect(s.discBottomN).toBe(5);
    expect(s.discTopCorrect).toBe(5);   // totals 15–19 all correct on the item
    expect(s.discBottomCorrect).toBe(0); // totals 0–4 none
  });

  it('too few candidates to rank gives nulls', () => {
    expect(sittingSplit(sitting.slice(0, 1))).toEqual({ discTopCorrect: null, discTopN: null, discBottomCorrect: null, discBottomN: null });
  });
});

describe('computeLead — items whose distribution says the key may be wrong', () => {
  it('a distractor outpulling the key, above the volume gate', () => {
    const a = aggregate([row({ attempted: 30, correct: 5, choiceCounts: { A: 20, B: 5, C: 3, D: 2 } })], 'B');
    const lead = computeLead('q1', a, 'B');
    expect(lead).toMatchObject({ reason: 'distractor', keyCount: 5, topDistractor: { label: 'A', count: 20 }, ratio: 4 });
  });

  it('a key nobody chose is its own, stronger reason, with no ratio', () => {
    const a = aggregate([row({ attempted: 30, correct: 0, choiceCounts: { A: 25, B: 0, C: 3, D: 2 } })], 'B');
    expect(computeLead('q1', a, 'B')).toMatchObject({ reason: 'key-never-chosen', ratio: null });
  });

  it('below the gate a ratio means nothing, so there is no lead', () => {
    const a = aggregate([row({ attempted: MIN_N_LEAD - 1, correct: 1, choiceCounts: { A: 7, B: 1, C: 1, D: 0 } })], 'B');
    expect(computeLead('q1', a, 'B')).toBeNull();
  });

  it('a healthy item is not a lead; an un-keyed item cannot be', () => {
    expect(computeLead('q1', aggregate([row()], 'B'), 'B')).toBeNull();
    expect(computeLead('q1', aggregate([row({ keyAtMeasurement: null })], null), null)).toBeNull();
    expect(computeLead('q1', null, 'B')).toBeNull();
  });
});
