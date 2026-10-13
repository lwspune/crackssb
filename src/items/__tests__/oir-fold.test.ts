import { describe, it, expect } from 'vitest';
import { matchMarks, reflectFigure, sameFigure, unfold, unfoldPaper } from '../oir/fold.ts';
import type { Mark } from '../oir/fold.ts';

/**
 * Paper folding (Chapter 24) and whole-figure mirror images (Chapter 25), D29.
 * Paper sits in the drawing's own units, y down. A fold is the line it folds
 * along; unfolding reflects every mark across each fold, last fold first.
 */

const hole = (x: number, y: number, shape = 'circle', dir?: [number, number]): Mark => ({ shape, at: [x, y], ...(dir ? { dir } : {}) });

describe('unfold', () => {
  it('reflects a punch across one fold, keeping the original', () => {
    const out = unfold([hole(2, 3)], [[[6, 0], [6, 12]]]);
    expect(out.map((m) => m.at)).toEqual([[2, 3], [10, 3]]);
  });

  it('undoes folds last first: two folds make four holes', () => {
    const out = unfold([hole(2, 3)], [[[6, 0], [6, 12]], [[0, 6], [12, 6]]]);
    expect(out.map((m) => m.at).sort()).toEqual([[10, 3], [10, 9], [2, 3], [2, 9]].sort());
  });

  it('turns an asymmetric mark: a triangle pointing right points left in its mirror', () => {
    const out = unfold([hole(2, 3, 'triangle', [1, 0])], [[[6, 0], [6, 12]]]);
    expect(out[1].dir).toEqual([-1, 0]);
  });

  it('reflects across a diagonal fold', () => {
    const out = unfold([hole(1, 4)], [[[0, 0], [12, 12]]]);
    expect(out[1].at[0]).toBeCloseTo(4);
    expect(out[1].at[1]).toBeCloseTo(1);
  });

  it('keeps one mark where a punch sits on the fold line', () => {
    expect(unfold([hole(6, 3)], [[[6, 0], [6, 12]]])).toHaveLength(1);
  });
});

describe('unfoldPaper', () => {
  const SQUARE: [number, number][] = [[0, 0], [12, 0], [12, 12], [0, 12]];

  it('mirrors a punch only where the folded flap lies over it', () => {
    // A strip 3 wide folded over from the left: a punch at x = 4 is under it, one at x = 8 is not.
    const out = unfoldPaper(SQUARE, [{ line: [[3, 0], [3, 12]], keep: [10, 6] }], [hole(4, 6), hole(8, 6)]);
    expect(out.map((m) => m.at).sort()).toEqual([[2, 6], [4, 6], [8, 6]].sort());
  });

  it('follows the paper through two folds: a corner punch under both flaps comes back four times', () => {
    const folds = [
      { line: [[0, 3], [12, 3]] as const, keep: [6, 8] as const },
      { line: [[3, 0], [3, 12]] as const, keep: [8, 8] as const },
    ];
    const out = unfoldPaper(SQUARE, folds, [hole(4, 4), hole(10, 10)]);
    expect(out).toHaveLength(5);
    expect(out.map((m) => m.at).sort()).toEqual([[2, 2], [2, 4], [4, 2], [4, 4], [10, 10]].sort());
  });

  it('agrees with unfold when every fold is in half', () => {
    const half = [{ line: [[6, 0], [6, 12]] as const, keep: [9, 6] as const }];
    expect(unfoldPaper(SQUARE, half, [hole(8, 3)]).map((m) => m.at)).toEqual(unfold([hole(8, 3)], [[[6, 0], [6, 12]]]).map((m) => m.at));
  });
});

describe('matchMarks', () => {
  const expected = [hole(2, 3), hole(10, 3, 'triangle', [-1, 0])];

  it('matches marks pairwise, near enough, same shape and way round', () => {
    expect(matchMarks(expected, [hole(10.4, 3.3, 'triangle', [-1, 0]), hole(2.2, 2.8)], 1)).toBe(true);
  });

  it('refuses a wrong count, a wrong shape, a mark too far off, or a triangle the wrong way round', () => {
    expect(matchMarks(expected, [hole(2, 3)], 1)).toBe(false);
    expect(matchMarks(expected, [hole(2, 3, 'square'), hole(10, 3, 'triangle', [-1, 0])], 1)).toBe(false);
    expect(matchMarks(expected, [hole(2, 6), hole(10, 3, 'triangle', [-1, 0])], 1)).toBe(false);
    expect(matchMarks(expected, [hole(2, 3), hole(10, 3, 'triangle', [1, 0])], 1)).toBe(false);
  });

  it('treats a slash or a bar as a line: pointing either way along it is the same', () => {
    expect(matchMarks([{ shape: 'slash', at: [2, 3], dir: [1, -1] }], [{ shape: 'slash', at: [2, 3], dir: [-1, 1] }], 1)).toBe(true);
    expect(matchMarks([{ shape: 'slash', at: [2, 3], dir: [1, -1] }], [{ shape: 'slash', at: [2, 3], dir: [1, 1] }], 1)).toBe(false);
  });

  it('ignores the way round of a symmetric mark', () => {
    expect(matchMarks([hole(2, 3, 'circle', [1, 0])], [hole(2, 3, 'circle', [0, 1])], 1)).toBe(true);
  });

  it('turns a punched shape with its corners: a shape that is not symmetric is told from its mirror', () => {
    // An L of three points: reflected across a vertical fold it becomes a backwards L.
    const L: Mark = { shape: 'tab', at: [2, 2], poly: [[2, 2], [2, 4], [3, 4]] };
    const [, back] = unfold([L], [[[6, 0], [6, 12]]]);
    expect(matchMarks([back], [{ shape: 'tab', at: [10, 2], poly: [[10, 2], [10, 4], [9, 4]] }], 0.3)).toBe(true);
    expect(matchMarks([back], [{ shape: 'tab', at: [10, 2], poly: [[10, 2], [10, 4], [11, 4]] }], 0.3)).toBe(false);
  });

  it('compares cut polygons by their corners', () => {
    const cut: Mark = { shape: 'cut', at: [0, 0], poly: [[0, 4], [2, 6], [0, 8]] };
    const same: Mark = { shape: 'cut', at: [0, 0], poly: [[0, 8.2], [0, 4], [2.1, 6]] };
    const off: Mark = { shape: 'cut', at: [0, 0], poly: [[0, 4], [4, 6], [0, 8]] };
    expect(matchMarks([cut], [same], 0.5)).toBe(true);
    expect(matchMarks([cut], [off], 0.5)).toBe(false);
  });
});

describe('reflectFigure and sameFigure', () => {
  const f = { lines: [[0, 0, 4, 0], [4, 0, 4, 2]] as [number, number, number, number][], polygons: [{ points: [[1, 1], [2, 1], [1, 2]] as [number, number][], fill: true }] };

  it('mirrors a figure across a vertical line and matches it however its lines were listed', () => {
    const m = reflectFigure(f, 'mirror');
    const other = { lines: [[0, 2, 0, 0], [4, 0, 0, 0]] as [number, number, number, number][], polygons: [{ points: [[3, 2], [3, 1], [2, 1]] as [number, number][], fill: true }] };
    expect(sameFigure(m, other, 0.05)).toBe(true);
  });

  it('turns a figure upside down for a water image, and tells a filled shape from an outline', () => {
    const w = reflectFigure(f, 'water');
    expect(sameFigure(w, { lines: [[0, 2, 4, 2], [4, 2, 4, 0]], polygons: [{ points: [[1, 1], [2, 1], [1, 0]], fill: true }] }, 0.05)).toBe(true);
    expect(sameFigure(w, { lines: [[0, 2, 4, 2], [4, 2, 4, 0]], polygons: [{ points: [[1, 1], [2, 1], [1, 0]] }] }, 0.05)).toBe(false);
  });

  it('compares figures by shape, not by where they sit on the page', () => {
    const moved = { lines: f.lines.map(([a, b, c, d]) => [a + 10, b + 5, c + 10, d + 5] as [number, number, number, number]), polygons: f.polygons.map((p) => ({ ...p, points: p.points.map(([x, y]) => [x + 10, y + 5] as [number, number]) })) };
    expect(sameFigure(f, moved, 0.05)).toBe(true);
  });
});
