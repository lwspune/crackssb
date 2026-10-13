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
/** Shapes that are a line: they lie along a direction but point neither way along it. */
const AXIAL = new Set(['slash', 'bar']);

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

/** A fold: the line it folds along, and a point on the side that stays put. */
export interface Fold {
  readonly line: FoldLine;
  readonly keep: Pt;
}

const side = ([a, b]: FoldLine, p: Pt) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

/** The part of a polygon on the kept side of a fold (Sutherland-Hodgman, one edge). */
function clip(poly: readonly Pt[], f: Fold): Pt[] {
  const s0 = Math.sign(side(f.line, f.keep));
  const inside = (p: Pt) => side(f.line, p) * s0 >= -1e-9;
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const [p, q] = [poly[i], poly[(i + 1) % poly.length]];
    if (inside(p)) out.push(p);
    if (inside(p) !== inside(q)) {
      const [sp, sq] = [side(f.line, p), side(f.line, q)];
      const t = sp / (sp - sq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

/** Is a point inside a polygon (or on its edge)? */
function within(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = [poly[i], poly[j]];
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const onEdge = Math.abs(cross) < 1e-6 && p[0] >= Math.min(a[0], b[0]) - 1e-6 && p[0] <= Math.max(a[0], b[0]) + 1e-6 && p[1] >= Math.min(a[1], b[1]) - 1e-6 && p[1] <= Math.max(a[1], b[1]) + 1e-6;
    if (onEdge) return true;
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

/**
 * Every mark once the paper is opened out, following the paper through each
 * fold: a punch goes through a folded-over flap only where the flap lies
 * over it, so a mark is mirrored across a fold only when its mirror falls on
 * the paper as it was before that fold. `folds` are in the order made.
 */
export function unfoldPaper(paper: readonly Pt[], folds: readonly Fold[], punched: readonly Mark[]): Mark[] {
  const before: Pt[][] = [];
  let sheet: Pt[] = [...paper];
  for (const f of folds) {
    before.push(sheet);
    sheet = clip(sheet, f);
  }
  let marks = [...punched];
  for (let k = folds.length - 1; k >= 0; k--) {
    const mirrored = marks
      .map((m) => reflectMark(m, folds[k].line))
      .filter((r) => within(r.at, before[k]) && !marks.some((m) => m.shape === r.shape && near(m.at, r.at, 1e-6)));
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
  const along = u[0] * v[0] + u[1] * v[1];
  return AXIAL.has(e.shape) ? Math.abs(along) > 0.9 : along > 0.9;
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
