import { z } from 'zod';

/**
 * A redrawn OIR figure (D29): straight lines, and circles that only decorate.
 * Coordinates are the drawing's own units, y pointing down as on screen; the
 * practice screen scales the figure to fit.
 *
 * The counters read the figure as a candidate does: every point where lines
 * meet or end is a corner, and two corners are joined when one drawn line
 * runs through both. Lines drawn in pieces along one straight line are joined
 * first, so how a figure was typed in never changes a count.
 */

export interface Figure {
  /** [x1, y1, x2, y2] per straight line. A figure of circles alone has none. */
  readonly lines: readonly (readonly [number, number, number, number])[];
  /** [cx, cy, r] per circle. */
  readonly circles?: readonly (readonly [number, number, number])[];
  /** [x, y, text]: a label centred at a point (a Venn class letter, a number on a face). */
  readonly labels?: readonly (readonly [number, number, string])[];
  /** Dashed lines: a fold, or the outline of paper folded away. Never counted. */
  readonly dashed?: readonly (readonly [number, number, number, number])[];
  /** Arrows from the first point to the second: which way a sheet folds. Never counted. */
  readonly arrows?: readonly (readonly [number, number, number, number])[];
  /** Closed shapes, outlined or filled: a punched square or triangle, a shaded corner. Never counted. */
  readonly polygons?: readonly { readonly points: readonly (readonly [number, number])[]; readonly fill?: boolean }[];
}

const finite = z.number().finite();
const line = z
  .tuple([finite, finite, finite, finite])
  .refine(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1) > 0, 'a line has length');
const circle = z.tuple([finite, finite, finite]).refine(([, , r]) => r > 0, 'a circle has a radius');
const label = z.tuple([finite, finite, z.string().min(1)]);
const polygon = z.object({ points: z.array(z.tuple([finite, finite])).min(3), fill: z.boolean().optional() }).strict();

export const figureSchema = z
  .object({
    lines: z.array(line),
    circles: z.array(circle).optional(),
    labels: z.array(label).optional(),
    dashed: z.array(line).optional(),
    arrows: z.array(line).optional(),
    polygons: z.array(polygon).optional(),
  })
  .strict()
  .refine((f) => [f.lines, f.circles, f.labels, f.dashed, f.arrows, f.polygons].some((xs) => (xs?.length ?? 0) > 0), 'a figure draws something');

/** Throws, naming the field, on anything that is not a figure. */
export function validateFigure(figure: unknown): Figure {
  return figureSchema.parse(figure) as Figure;
}

type Pt = readonly [number, number];
type Seg = readonly [Pt, Pt];

/** Points closer than this are one point: a hand-placed figure lands on round numbers, its crossings need not. */
const SAME = 1e-4;

const cross2 = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;

/** Distance-scaled: is p on the infinite line through a and b? */
const onLine = (p: Pt, [a, b]: Seg) => Math.abs(cross2(b[0] - a[0], b[1] - a[1], p[0] - a[0], p[1] - a[1])) <= SAME * Math.hypot(b[0] - a[0], b[1] - a[1]);
const within = (p: Pt, [a, b]: Seg) =>
  p[0] >= Math.min(a[0], b[0]) - SAME && p[0] <= Math.max(a[0], b[0]) + SAME && p[1] >= Math.min(a[1], b[1]) - SAME && p[1] <= Math.max(a[1], b[1]) + SAME;
const onSeg = (p: Pt, s: Seg) => onLine(p, s) && within(p, s);

/** Collinear lines that overlap or touch become one. */
function merge(lines: Figure['lines']): Seg[] {
  let segs: Seg[] = lines.map(([x1, y1, x2, y2]) => [[x1, y1], [x2, y2]]);
  for (let changed = true; changed; ) {
    changed = false;
    outer: for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const [s, t] = [segs[i], segs[j]];
        if (!onLine(t[0], s) || !onLine(t[1], s)) continue;
        if (!onSeg(t[0], s) && !onSeg(t[1], s) && !onSeg(s[0], t) && !onSeg(s[1], t)) continue;
        // Furthest pair of the four ends along the shared direction.
        const ends = [s[0], s[1], t[0], t[1]];
        const [dx, dy] = [s[1][0] - s[0][0], s[1][1] - s[0][1]];
        const along = (p: Pt) => p[0] * dx + p[1] * dy;
        ends.sort((p, q) => along(p) - along(q));
        segs = [...segs.slice(0, i), [ends[0], ends[3]], ...segs.slice(i + 1, j), ...segs.slice(j + 1)];
        changed = true;
        break outer;
      }
    }
  }
  return segs;
}

function meet([a, b]: Seg, [c, d]: Seg): Pt | null {
  const den = cross2(b[0] - a[0], b[1] - a[1], d[0] - c[0], d[1] - c[1]);
  if (Math.abs(den) < 1e-12) return null;
  const t = cross2(c[0] - a[0], c[1] - a[1], d[0] - c[0], d[1] - c[1]) / den;
  const p: Pt = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  return onSeg(p, [a, b]) && onSeg(p, [c, d]) ? p : null;
}

interface Graph {
  readonly points: readonly Pt[];
  readonly joined: (i: number, j: number) => boolean;
  /** True when three corners lie on one line, to within a thousandth of the figure's size: stored figures are rounded. */
  readonly flat: (a: Pt, b: Pt, c: Pt) => boolean;
}

function graph(figure: Figure): Graph {
  const segs = merge(figure.lines);
  const points: Pt[] = [];
  const add = (p: Pt) => {
    if (!points.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < SAME * 10)) points.push(p);
  };
  for (const [a, b] of segs) {
    add(a);
    add(b);
  }
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const p = meet(segs[i], segs[j]);
    if (p) add(p);
  }
  const lineOf = points.map((p) => segs.flatMap((s, k) => (onSeg(p, s) ? [k] : [])));
  const joined = (i: number, j: number) => i !== j && lineOf[i].some((k) => lineOf[j].includes(k));
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const size = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const flat = (a: Pt, b: Pt, c: Pt) => {
    const longest = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - b[0], c[1] - b[1]), Math.hypot(a[0] - c[0], a[1] - c[1]));
    return Math.abs(area2(a, b, c)) <= 1e-3 * size * longest;
  };
  return { points, joined, flat };
}

const area2 = (a: Pt, b: Pt, c: Pt) => cross2(b[0] - a[0], b[1] - a[1], c[0] - a[0], c[1] - a[1]);

/** Triangles with every side along a drawn line. */
export function countTriangles(figure: Figure): number {
  const { points, joined, flat } = graph(figure);
  let n = 0;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    if (!joined(i, j)) continue;
    for (let k = j + 1; k < points.length; k++) {
      if (joined(i, k) && joined(j, k) && !flat(points[i], points[j], points[k])) n++;
    }
  }
  return n;
}

/** Rectangles (squares among them) with every side along a drawn line, at any tilt. */
function rectangles(figure: Figure): { w: number; h: number }[] {
  const { points, joined } = graph(figure);
  const find = (p: Pt) => points.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < SAME * 10);
  const seen = new Set<string>();
  const found: { w: number; h: number }[] = [];
  for (let b = 0; b < points.length; b++) for (let a = 0; a < points.length; a++) {
    if (!joined(a, b)) continue;
    for (let c = a + 1; c < points.length; c++) {
      if (c === b || !joined(b, c)) continue;
      const [pa, pb, pc] = [points[a], points[b], points[c]];
      const [ux, uy, vx, vy] = [pa[0] - pb[0], pa[1] - pb[1], pc[0] - pb[0], pc[1] - pb[1]];
      const [lu, lv] = [Math.hypot(ux, uy), Math.hypot(vx, vy)];
      if (Math.abs(ux * vx + uy * vy) > 1e-3 * lu * lv) continue;
      const d = find([pa[0] + vx, pa[1] + vy]);
      if (d < 0 || !joined(a, d) || !joined(c, d)) continue;
      const key = [a, b, c, d].sort((x, y) => x - y).join();
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ w: lu, h: lv });
    }
  }
  return found;
}

export const countRectangles = (figure: Figure) => rectangles(figure).length;
export const countSquares = (figure: Figure) => rectangles(figure).filter(({ w, h }) => Math.abs(w - h) < SAME * Math.max(w, h) * 10).length;

/** The box every line and circle sits in. */
export function figureBounds(figure: Figure): { x: number; y: number; width: number; height: number } {
  const segs = [...figure.lines, ...(figure.dashed ?? []), ...(figure.arrows ?? [])];
  const pts: (readonly [number, number])[] = [
    ...segs.flatMap(([x1, y1, x2, y2]) => [[x1, y1], [x2, y2]] as const),
    ...(figure.circles ?? []).flatMap(([cx, cy, r]) => [[cx - r, cy - r], [cx + r, cy + r]] as const),
    ...(figure.labels ?? []).map(([x, y]) => [x, y] as const),
    ...(figure.polygons ?? []).flatMap((p) => p.points),
  ];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

const segIntersect = (p1: Pt, p2: Pt, p3: Pt, p4: Pt) => {
  const d1 = area2(p3, p4, p1), d2 = area2(p3, p4, p2), d3 = area2(p1, p2, p3), d4 = area2(p1, p2, p4);
  return d1 * d2 < -SAME && d3 * d4 < -SAME;
};

/**
 * Four-sided figures with every side along a drawn line: four corners, joined
 * in turn, no three in a line, and the sides not crossing each other.
 */
export function countQuadrilaterals(figure: Figure): number {
  const { points, joined, flat } = graph(figure);
  const n = points.length;
  const seen = new Set<string>();
  let count = 0;
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    if (!joined(a, b)) continue;
    for (let c = 0; c < n; c++) {
      if (c === a || !joined(b, c)) continue;
      for (let d = 0; d < n; d++) {
        if (d === a || d === b || !joined(c, d) || !joined(d, a)) continue;
        const [pa, pb, pc, pd] = [points[a], points[b], points[c], points[d]];
        const corners = [
          [pd, pa, pb],
          [pa, pb, pc],
          [pb, pc, pd],
          [pc, pd, pa],
        ] as const;
        if (corners.some(([x, y, z]) => flat(x, y, z))) continue;
        if (segIntersect(pa, pb, pc, pd) || segIntersect(pb, pc, pd, pa)) continue;
        // One shape, whichever corner and direction it is walked from: its corners and its two diagonals.
        const diagonals = [[a, c], [b, d]].map((p) => [Math.min(...p), Math.max(...p)]).sort((x, y) => x[0] - y[0]);
        const key = `${[a, b, c, d].sort((x, y) => x - y).join()}|${diagonals.join('|')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        count++;
      }
    }
  }
  return count;
}

export const countCircles = (figure: Figure) => (figure.circles ?? []).length;

/** Two semicircles for every drawn line that runs right across a circle through its centre. */
export function countSemicircles(figure: Figure): number {
  const segs = merge(figure.lines);
  let n = 0;
  for (const [cx, cy, r] of figure.circles ?? []) {
    for (const s of segs) {
      if (!onLine([cx, cy], s)) continue;
      const [a, b] = s;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const [ux, uy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      const across = (p: Pt) => (p[0] - cx) * ux + (p[1] - cy) * uy;
      const [lo, hi] = [Math.min(across(a), across(b)), Math.max(across(a), across(b))];
      if (lo <= -r + SAME * r * 10 && hi >= r - SAME * r * 10) n += 2;
    }
  }
  return n;
}

/** Straight lines needed to draw the figure: collinear pieces that touch are one line. */
export const countLines = (figure: Figure) => merge(figure.lines).length;

export type CircleRelation = readonly ['apart' | 'overlap', number, number] | readonly ['inside', number, number];

/**
 * Each pair of circles, by index: apart, overlapping, or the first inside the
 * second (['inside', inner, outer]). Touching counts as apart.
 */
export function circleRelations(figure: Figure): CircleRelation[] {
  const cs = figure.circles ?? [];
  const out: CircleRelation[] = [];
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const [[x1, y1, r1], [x2, y2, r2]] = [cs[i], cs[j]];
    const d = Math.hypot(x2 - x1, y2 - y1);
    if (d >= r1 + r2) out.push(['apart', i, j]);
    else if (d + r1 <= r2) out.push(['inside', i, j]);
    else if (d + r2 <= r1) out.push(['inside', j, i]);
    else out.push(['overlap', i, j]);
  }
  return out;
}

/** The straight runs of a figure, collinear pieces joined: for comparing two drawings. */
export function straightRuns(figure: Figure): [number, number, number, number][] {
  return merge(figure.lines).map(([a, b]) => [a[0], a[1], b[0], b[1]]);
}
