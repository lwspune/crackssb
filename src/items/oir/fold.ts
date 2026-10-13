import { figureBounds, straightRuns } from './figure.ts';
import type { Figure } from './figure.ts';

/**
 * Paper folding and whole-figure images (D29).
 *
 * A mark is something punched or cut: its shape, where it sits, and for a
 * shape with a way round (a triangle, an arrow, a half circle) the direction
 * it points. A cut is a polygon taken out of the paper. Unfolding reflects
 * every mark across each fold line, last fold first, keeping the originals:
 * every layer the punch went through comes back.
 */

type Pt = readonly [number, number];
export type FoldLine = readonly [Pt, Pt];

export interface Mark {
  readonly shape: string;
  readonly at: Pt;
  /** The way an asymmetric mark points. */
  readonly dir?: Pt;
  /** A cut's corners. */
  readonly poly?: readonly Pt[];
}

/** Shapes that look the same reflected across any fold line the book uses. */
const SYMMETRIC = new Set(['circle', 'dot', 'square', 'diamond', 'cross', 'ring']);

function reflect(p: Pt, [a, b]: FoldLine): Pt {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const foot: Pt = [a[0] + t * dx, a[1] + t * dy];
  return [round(2 * foot[0] - p[0]), round(2 * foot[1] - p[1])];
}

const round = (x: number) => Math.round(x * 1e9) / 1e9;
const near = (p: Pt, q: Pt, tol: number) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol;

function reflectMark(m: Mark, line: FoldLine): Mark {
  const at = reflect(m.at, line);
  const tip = m.dir ? reflect([m.at[0] + m.dir[0], m.at[1] + m.dir[1]], line) : undefined;
  return {
    shape: m.shape,
    at,
    ...(tip ? { dir: [round(tip[0] - at[0]), round(tip[1] - at[1])] as const } : {}),
    ...(m.poly ? { poly: m.poly.map((p) => reflect(p, line)) } : {}),
  };
}

/** Every mark once the paper is opened out. `folds` are in the order they were made. */
export function unfold(punched: readonly Mark[], folds: readonly FoldLine[]): Mark[] {
  let marks = [...punched];
  for (const line of [...folds].reverse()) {
    const mirrored = marks.map((m) => reflectMark(m, line)).filter((r) => !marks.some((m) => m.shape === r.shape && near(m.at, r.at, 1e-6)));
    marks = [...marks, ...mirrored];
  }
  return marks;
}

const unit = ([x, y]: Pt): Pt => ((l) => [x / l, y / l] as const)(Math.hypot(x, y) || 1);
const samePoly = (a: readonly Pt[], b: readonly Pt[], tol: number) =>
  a.length === b.length && a.every((p) => b.some((q) => near(p, q, tol))) && b.every((q) => a.some((p) => near(p, q, tol)));

function sameMark(e: Mark, g: Mark, tol: number): boolean {
  if (e.shape !== g.shape) return false;
  if (e.poly || g.poly) return !!e.poly && !!g.poly && samePoly(e.poly, g.poly, tol);
  if (!near(e.at, g.at, tol)) return false;
  if (SYMMETRIC.has(e.shape) || !e.dir || !g.dir) return true;
  const [u, v] = [unit(e.dir), unit(g.dir)];
  return u[0] * v[0] + u[1] * v[1] > 0.9;
}

/** Pairs every item of `a` with its own item of `b`, trying every pairing until one works. */
function oneForOne<T>(a: readonly T[], b: readonly T[], same: (x: T, y: T) => boolean): boolean {
  if (a.length !== b.length) return false;
  const used = new Array<boolean>(b.length).fill(false);
  const go = (i: number): boolean => {
    if (i === a.length) return true;
    for (let j = 0; j < b.length; j++) {
      if (used[j] || !same(a[i], b[j])) continue;
      used[j] = true;
      if (go(i + 1)) return true;
      used[j] = false;
    }
    return false;
  };
  return go(0);
}

/** Do two sets of marks match one for one: same shapes, each within `tol`, asymmetric ones the same way round? */
export function matchMarks(expected: readonly Mark[], got: readonly Mark[], tol: number): boolean {
  return oneForOne(expected, got, (e, g) => sameMark(e, g, tol));
}

/** A figure as a mirror on its right shows it (left to right), or water below it (upside down). */
export function reflectFigure(f: Figure, where: 'mirror' | 'water'): Figure {
  const p = ([x, y]: Pt): [number, number] => (where === 'mirror' ? [-x, y] : [x, -y]);
  const seg = ([a, b, c, d]: readonly [number, number, number, number]): [number, number, number, number] => [...p([a, b]), ...p([c, d])];
  return {
    lines: f.lines.map(seg),
    ...(f.circles ? { circles: f.circles.map(([x, y, r]) => [...p([x, y]), r] as [number, number, number]) } : {}),
    ...(f.polygons ? { polygons: f.polygons.map((g) => ({ ...g, points: g.points.map(p) })) } : {}),
    ...(f.labels ? { labels: f.labels.map(([x, y, t]) => [...p([x, y]), t] as [number, number, string]) } : {}),
  };
}

/** A figure moved and scaled so its box starts at 0 and its longer side is 1. */
function normal(f: Figure) {
  const b = figureBounds(f);
  const s = Math.max(b.width, b.height) || 1;
  const n = ([x, y]: Pt): Pt => [(x - b.x) / s, (y - b.y) / s];
  return {
    lines: straightRuns(f).map(([a, c, d, e]) => [n([a, c]), n([d, e])] as const),
    circles: (f.circles ?? []).map(([x, y, r]) => [n([x, y]), r / s] as const),
    polygons: (f.polygons ?? []).map((g) => ({ fill: !!g.fill, points: g.points.map(n) })),
    labels: (f.labels ?? []).map(([x, y, t]) => [n([x, y]), t] as const),
  };
}

/**
 * Do two drawings show the same figure, whatever their size and place on the
 * page? `tol` is a fraction of the figure's longer side.
 */
export function sameFigure(a: Figure, b: Figure, tol: number): boolean {
  const [x, y] = [normal(a), normal(b)];
  const sameLine = ([p, q]: readonly [Pt, Pt], [r, s]: readonly [Pt, Pt]) => (near(p, r, tol) && near(q, s, tol)) || (near(p, s, tol) && near(q, r, tol));
  return (
    oneForOne(x.lines, y.lines, sameLine) &&
    oneForOne(x.circles, y.circles, ([p, r], [q, s]) => near(p, q, tol) && Math.abs(r - s) <= tol) &&
    oneForOne(x.polygons, y.polygons, (g, h) => g.fill === h.fill && samePoly(g.points, h.points, tol)) &&
    oneForOne(x.labels, y.labels, ([p, t], [q, u]) => t === u && near(p, q, tol))
  );
}
