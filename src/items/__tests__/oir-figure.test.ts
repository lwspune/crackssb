import { describe, it, expect } from 'vitest';
import { countRectangles, countSquares, countTriangles, figureBounds, validateFigure } from '../oir/figure.ts';
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

describe('figureBounds', () => {
  it('spans every line and circle', () => {
    expect(figureBounds({ lines: [[0, 0, 10, 4]], circles: [[5, 5, 6]] })).toEqual({ x: -1, y: -1, width: 12, height: 12 });
  });
});

describe('validateFigure', () => {
  it('accepts lines and circles of finite numbers', () => {
    expect(() => validateFigure({ lines: [[0, 0, 1, 1]], circles: [[0, 0, 2]] })).not.toThrow();
  });

  it('refuses no lines, a line of zero length, a bad circle, or a stray field', () => {
    expect(() => validateFigure({ lines: [] })).toThrow();
    expect(() => validateFigure({ lines: [[1, 1, 1, 1]] })).toThrow(/length/);
    expect(() => validateFigure({ lines: [[0, 0, 1, 1]], circles: [[0, 0, 0]] })).toThrow();
    expect(() => validateFigure({ lines: [[0, 0, 1, Number.NaN]] })).toThrow();
    expect(() => validateFigure({ lines: [[0, 0, 1, 1]], fill: 'red' })).toThrow();
  });
});
