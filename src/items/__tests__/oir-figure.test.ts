import { describe, it, expect } from 'vitest';
import { circleRelations, countCircles, countLines, countQuadrilaterals, countRectangles, countSemicircles, countSquares, countTriangles, figureBounds, validateFigure } from '../oir/figure.ts';
import type { Figure } from '../oir/figure.ts';

/**
 * Redrawn OIR figures (D29): a figure is straight lines (and circles that only
 * decorate), and the counting chapter's keys are counted from it by code.
 */

const rect = (x0: number, y0: number, x1: number, y1: number): Figure['lines'] => [
  [x0, y0, x1, y0],
  [x1, y0, x1, y1],
  [x1, y1, x0, y1],
  [x0, y1, x0, y0],
];

describe('countTriangles', () => {
  it('counts the triangles a square and both its diagonals make', () => {
    expect(countTriangles({ lines: [...rect(0, 0, 10, 10), [0, 0, 10, 10], [10, 0, 0, 10]] })).toBe(8);
  });

  it('counts triangles whose sides run along a longer line through other points', () => {
    // A triangle split by a line from its apex: 3 triangles.
    expect(countTriangles({ lines: [[0, 10, 10, 10], [0, 10, 5, 0], [10, 10, 5, 0], [5, 0, 4, 10]] })).toBe(3);
  });

  it('joins a line drawn in two pieces that meet end to end', () => {
    const split: Figure = { lines: [[0, 10, 5, 10], [5, 10, 10, 10], [0, 10, 5, 0], [10, 10, 5, 0]] };
    expect(countTriangles(split)).toBe(1);
  });

  it('ignores circles, which make no straight sides', () => {
    expect(countTriangles({ lines: [[0, 10, 10, 10], [0, 10, 5, 0], [10, 10, 5, 0]], circles: [[5, 6, 8]] })).toBe(1);
  });

  it('gives the same count when every coordinate is rounded, as a stored figure is', () => {
    // Lines from a corner to points a third of the way along a slanting side: the crossings are irrational.
    const a = [0, 0], b = [90, 70], c = [100, 0];
    const at = (p: number[], q: number[], t: number) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const lines: [number, number, number, number][] = [
      [...a, ...b], [...b, ...c], [...c, ...a],
      [...a, ...at(b, c, 1 / 3)], [...a, ...at(b, c, 2 / 3)], [...c, ...at(a, b, 1 / 3)], [...c, ...at(a, b, 2 / 3)],
    ] as [number, number, number, number][];
    const exact = countTriangles({ lines });
    const r = (x: number) => Math.round(x * 1e4) / 1e4;
    expect(countTriangles({ lines: lines.map((l) => l.map(r) as [number, number, number, number]) })).toBe(exact);
  });

  it('does not count three points on one line', () => {
    expect(countTriangles({ lines: [[0, 0, 10, 0], [5, 0, 5, 5]] })).toBe(0);
  });
});

describe('countSquares and countRectangles', () => {
  it('counts the squares of a 2 × 2 grid, and its rectangles', () => {
    const grid: Figure = { lines: [...rect(0, 0, 2, 2), [1, 0, 1, 2], [0, 1, 2, 1]] };
    expect(countSquares(grid)).toBe(5);
    expect(countRectangles(grid)).toBe(9);
  });

  it('counts a square set on its corner', () => {
    expect(countSquares({ lines: [[0, 5, 5, 0], [5, 0, 10, 5], [10, 5, 5, 10], [5, 10, 0, 5]] })).toBe(1);
  });

  it('counts a 3 × 1 strip: no square bigger than a cell, six rectangles', () => {
    const strip: Figure = { lines: [...rect(0, 0, 3, 1), [1, 0, 1, 1], [2, 0, 2, 1]] };
    expect(countSquares(strip)).toBe(3);
    expect(countRectangles(strip)).toBe(6);
  });
});

describe('countQuadrilaterals', () => {
  it('counts every four-sided figure with its sides along drawn lines', () => {
    // A rectangle split by one vertical: two cells and the whole.
    expect(countQuadrilaterals({ lines: [...rect(0, 0, 2, 1), [1, 0, 1, 1]] })).toBe(3);
    // A trapezium is a quadrilateral too; its diagonal makes triangles, not more quadrilaterals.
    expect(countQuadrilaterals({ lines: [[0, 2, 4, 2], [1, 0, 3, 0], [0, 2, 1, 0], [4, 2, 3, 0], [0, 2, 3, 0]] })).toBe(1);
  });

  it('does not count a crossed four-point path, or three points in a line', () => {
    expect(countQuadrilaterals({ lines: [...rect(0, 0, 2, 2), [0, 0, 2, 2], [2, 0, 0, 2]] })).toBe(1);
  });
});

describe('countCircles and countSemicircles', () => {
  it('counts the circles drawn', () => {
    expect(countCircles({ lines: [[0, 0, 1, 0]], circles: [[0, 0, 1], [3, 0, 1]] })).toBe(2);
  });

  it('counts two semicircles for each line drawn right across a circle through its centre', () => {
    const f = { lines: [[-1, 0, 1, 0], [0, -1, 0, 1], [-1, -1, 0.5, 1]] as const, circles: [[0, 0, 1], [5, 5, 1]] as const };
    expect(countSemicircles(f)).toBe(4);
    // A line through the centre that stops inside the circle cuts no semicircle.
    expect(countSemicircles({ lines: [[-1, 0, 0.5, 0]], circles: [[0, 0, 1]] })).toBe(0);
  });
});

describe('countLines', () => {
  it('counts each straight run once, however it was drawn in pieces', () => {
    expect(countLines({ lines: [[0, 0, 1, 0], [1, 0, 2, 0], [0, 0, 0, 1], [3, 0, 4, 0]] })).toBe(3);
  });
});

describe('circleRelations', () => {
  it('reads each pair of circles as apart, overlapping, or one inside the other', () => {
    const f = { lines: [], circles: [[0, 0, 5], [1, 0, 2], [20, 0, 3], [23, 0, 3]] as const };
    expect(circleRelations(f)).toEqual([
      ['inside', 1, 0],
      ['apart', 0, 2],
      ['apart', 0, 3],
      ['apart', 1, 2],
      ['apart', 1, 3],
      ['overlap', 2, 3],
    ]);
  });
});

describe('figureBounds', () => {
  it('spans every line and circle', () => {
    expect(figureBounds({ lines: [[0, 0, 10, 4]], circles: [[5, 5, 6]] })).toEqual({ x: -1, y: -1, width: 12, height: 12 });
  });
});

describe('validateFigure', () => {
  it('accepts text labels placed in the figure', () => {
    expect(validateFigure({ lines: [], circles: [[0, 0, 1]], labels: [[0, 0, 'A']] }).labels).toEqual([[0, 0, 'A']]);
    expect(() => validateFigure({ lines: [], labels: [[0, 0, '']] })).toThrow();
  });

  it('accepts lines and circles of finite numbers, or circles alone', () => {
    expect(() => validateFigure({ lines: [[0, 0, 1, 1]], circles: [[0, 0, 2]] })).not.toThrow();
    expect(() => validateFigure({ lines: [], circles: [[0, 0, 2]] })).not.toThrow();
  });

  it('refuses no lines, a line of zero length, a bad circle, or a stray field', () => {
    expect(() => validateFigure({ lines: [] })).toThrow();
    expect(() => validateFigure({ lines: [[1, 1, 1, 1]] })).toThrow(/length/);
    expect(() => validateFigure({ lines: [[0, 0, 1, 1]], circles: [[0, 0, 0]] })).toThrow();
    expect(() => validateFigure({ lines: [[0, 0, 1, Number.NaN]] })).toThrow();
    expect(() => validateFigure({ lines: [[0, 0, 1, 1]], fill: 'red' })).toThrow();
  });
});
