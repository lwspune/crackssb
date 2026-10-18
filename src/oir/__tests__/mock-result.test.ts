import { describe, it, expect } from 'vitest';
import { standings, summarise } from '../mock-result.ts';
import type { ResultRow } from '../mock-result.ts';

/**
 * A mock's result (D32), from test_result's rows: the score, what was wrong
 * and what was left, and accuracy by question type — weakest first, each
 * pointing at its chapter. Practice, so no percentile and no band.
 */
const row = (ordinal: number, reasoning_type: string, chosen: string, key: string): ResultRow => ({
  ordinal, item_id: `i${ordinal}`, chosen, key, rule: null, reasoning_type,
});

describe('summarise', () => {
  const rows = [
    row(0, 'series', 'A', 'A'),
    row(1, 'series', 'B', 'A'),
    row(2, 'coding', 'C', 'C'),
    row(3, 'coding', 'D', 'D'),
    row(4, 'venn', '', 'B'),
    row(5, 'venn', 'A', 'B'),
  ];

  it('counts right, wrong and left blank; a blank is not wrong', () => {
    expect(summarise(rows)).toMatchObject({ total: 6, answered: 5, correct: 3, wrong: 2, skipped: 1 });
  });

  it('gives accuracy by question type, weakest first, each with its chapter', () => {
    expect(summarise(rows).byType).toEqual([
      { reasoningType: 'venn', title: 'Venn Diagrams', slug: 'venn', total: 2, correct: 0, wrong: 1, skipped: 1 },
      { reasoningType: 'series', title: 'Series', slug: 'series', total: 2, correct: 1, wrong: 1, skipped: 0 },
      { reasoningType: 'coding', title: 'Coding-Decoding', slug: 'coding', total: 2, correct: 2, wrong: 0, skipped: 0 },
    ]);
  });

  it('breaks a tie in accuracy by putting the type with more questions first', () => {
    const r = summarise([row(0, 'series', 'B', 'A'), row(1, 'coding', 'B', 'A'), row(2, 'coding', 'B', 'A')]);
    expect(r.byType.map((t) => t.reasoningType)).toEqual(['coding', 'series']);
  });

  it('names an unknown type plainly rather than failing', () => {
    expect(summarise([row(0, 'new_type', 'A', 'A')]).byType[0]).toMatchObject({ title: 'new_type', slug: null });
  });
});

describe('standings', () => {
  const a = (testId: string, over: boolean, correct: number | null, startedAt: string) => ({
    sessionId: `${testId}-${startedAt}`, testId, startedAt, endedAt: over ? startedAt : null, over, answered: 0, correct,
  });

  it('gives each mock its best score and how many times it was taken', () => {
    const s = standings([a('m1', true, 20, '2026-10-01'), a('m1', true, 31, '2026-10-02'), a('m2', true, 12, '2026-10-03')]);
    expect(s.get('m1')).toEqual({ best: 31, tries: 2, live: null });
    expect(s.get('m2')).toEqual({ best: 12, tries: 1, live: null });
    expect(s.get('m3')).toBeUndefined();
  });

  it('marks a mock with an attempt still running, which does not count as a try yet', () => {
    const s = standings([a('m1', true, 20, '2026-10-01'), a('m1', false, null, '2026-10-02')]);
    expect(s.get('m1')).toEqual({ best: 20, tries: 1, live: 'm1-2026-10-02' });
  });
});
