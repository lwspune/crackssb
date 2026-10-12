import { describe, it, expect } from 'vitest';
import { scoreAgreement, GRADE_SCALE } from '../eval/agreement.ts';

/**
 * Measuring a judge against the assessor.
 *
 * The corpus grade distribution is badly skewed — LOW 50, Just Avg 37, AVG 5,
 * Good 1, V. good 0. A judge that answers LOW every time scores 54%. Any
 * agreement report that does not state that baseline is misleading, so the
 * scorer computes it and the tests require it.
 */

const pair = (expected: string, actual: string, slide = 1) => ({
  id: `p-${Math.random()}`,
  slide,
  expected: { grade: expected },
  actual: { grade: actual },
});

describe('grade scale', () => {
  it('is the assessor closed vocabulary, in order', () => {
    expect(GRADE_SCALE).toEqual(['LOW', 'Just Avg', 'AVG', 'Good', 'V. good']);
  });
});

describe('exact and adjacent agreement', () => {
  it('scores a perfect run at 100%', () => {
    const r = scoreAgreement([pair('LOW', 'LOW'), pair('Just Avg', 'Just Avg')]);
    expect(r.exact.rate).toBe(1);
    expect(r.exact.n).toBe(2);
  });

  it('counts an off-by-one as adjacent but not exact', () => {
    const r = scoreAgreement([pair('LOW', 'Just Avg')]);
    expect(r.exact.rate).toBe(0);
    expect(r.adjacent.rate).toBe(1);
  });

  it('does not count an off-by-two as adjacent', () => {
    const r = scoreAgreement([pair('LOW', 'AVG')]);
    expect(r.adjacent.rate).toBe(0);
  });

  it('treats adjacent as inclusive of exact', () => {
    const r = scoreAgreement([pair('LOW', 'LOW'), pair('LOW', 'Just Avg'), pair('LOW', 'Good')]);
    expect(r.exact.rate).toBeCloseTo(1 / 3);
    expect(r.adjacent.rate).toBeCloseTo(2 / 3);
  });
});

describe('the majority-class baseline', () => {
  it('reports what always guessing the commonest grade would score', () => {
    // 3 LOW, 1 Just Avg -> always-LOW scores 0.75
    const rows = [pair('LOW', 'Good'), pair('LOW', 'Good'), pair('LOW', 'Good'), pair('Just Avg', 'Good')];
    const r = scoreAgreement(rows);
    expect(r.baseline.grade).toBe('LOW');
    expect(r.baseline.rate).toBe(0.75);
  });

  it('flags a judge that fails to beat the baseline', () => {
    const rows = [pair('LOW', 'LOW'), pair('LOW', 'Just Avg'), pair('LOW', 'Just Avg'), pair('Just Avg', 'Just Avg')];
    const r = scoreAgreement(rows);
    expect(r.baseline.rate).toBe(0.75);
    expect(r.exact.rate).toBe(0.5);
    expect(r.beatsBaseline).toBe(false);
  });

  it('confirms a judge that does beat it', () => {
    const rows = [pair('LOW', 'LOW'), pair('LOW', 'LOW'), pair('LOW', 'LOW'), pair('Just Avg', 'Just Avg')];
    const r = scoreAgreement(rows);
    expect(r.exact.rate).toBe(1);
    expect(r.beatsBaseline).toBe(true);
  });
});

describe('bias detection', () => {
  it('reports the judge grade distribution so collapse is visible', () => {
    const rows = [pair('LOW', 'LOW'), pair('Just Avg', 'LOW'), pair('AVG', 'LOW')];
    const r = scoreAgreement(rows);
    expect(r.actualDistribution.LOW).toBe(3);
    expect(r.collapsed).toBe(true);
  });

  it('does not call a varied judge collapsed', () => {
    const rows = [pair('LOW', 'LOW'), pair('Just Avg', 'Just Avg'), pair('AVG', 'AVG')];
    expect(scoreAgreement(rows).collapsed).toBe(false);
  });

  it('reports mean signed error so systematic leniency is visible', () => {
    // Judge grades one step high every time.
    const rows = [pair('LOW', 'Just Avg'), pair('Just Avg', 'AVG')];
    expect(scoreAgreement(rows).meanSignedError).toBe(1);
  });

  it('reports negative mean signed error for a harsh judge', () => {
    const rows = [pair('AVG', 'Just Avg'), pair('Just Avg', 'LOW')];
    expect(scoreAgreement(rows).meanSignedError).toBe(-1);
  });
});

describe('per-slide breakdown', () => {
  it('reports agreement per slide, since slides differ in difficulty', () => {
    const rows = [
      pair('LOW', 'LOW', 11),
      pair('LOW', 'Good', 11),
      pair('Just Avg', 'Just Avg', 9),
    ];
    const r = scoreAgreement(rows);
    expect(r.bySlide[11].exact).toBe(0.5);
    expect(r.bySlide[9].exact).toBe(1);
  });
});

describe('input handling', () => {
  it('ignores pairs with no ground-truth grade rather than scoring them as wrong', () => {
    const rows = [pair('LOW', 'LOW'), { id: 'x', slide: 1, expected: { grade: null }, actual: { grade: 'LOW' } }];
    const r = scoreAgreement(rows);
    expect(r.exact.n).toBe(1);
    expect(r.skipped).toBe(1);
  });

  it('counts a judge that returned nothing as a miss, not a skip', () => {
    const rows = [pair('LOW', 'LOW'), { id: 'y', slide: 1, expected: { grade: 'LOW' }, actual: { grade: null } }];
    const r = scoreAgreement(rows);
    expect(r.exact.n).toBe(2);
    expect(r.exact.rate).toBe(0.5);
    expect(r.skipped).toBe(0);
  });

  it('throws on an empty set rather than reporting a vacuous 100%', () => {
    expect(() => scoreAgreement([])).toThrow(/no scorable/i);
  });
});
