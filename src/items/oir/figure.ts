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
  /** [x1, y1, x2, y2] per straight line. */
  readonly lines: readonly (readonly [number, number, number, number])[];
  /** [cx, cy, r] per circle. Drawn, never counted. */
  readonly circles?: readonly (readonly [number, number, number])[];
}

const finite = z.number().finite();
const line = z
  .tuple([finite, finite, finite, finite])
  .refine(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1) > 0, 'a line has length');
const circle = z.tuple([finite, finite, finite]).refine(([, , r]) => r > 0, 'a circle has a radius');

export const figureSchema = z.object({ lines: z.array(line).min(1), circles: z.array(circle).optional() }).strict();

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
  return { points, joined };
}

const area2 = (a: Pt, b: Pt, c: Pt) => cross2(b[0] - a[0], b[1] - a[1], c[0] - a[0], c[1] - a[1]);

/** Triangles with every side along a drawn line. */
export function countTriangles(figure: Figure): number {
  const { points, joined } = graph(figure);
  let n = 0;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    if (!joined(i, j)) continue;
    for (let k = j + 1; k < points.length; k++) {
      if (joined(i, k) && joined(j, k) && Math.abs(area2(points[i], points[j], points[k])) > SAME) n++;
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
      if (Math.abs(ux * vx + uy * vy) > SAME * lu * lv) continue;
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
  const xs = [...figure.lines.flatMap(([x1, , x2]) => [x1, x2]), ...(figure.circles ?? []).flatMap(([cx, , r]) => [cx - r, cx + r])];
  const ys = [...figure.lines.flatMap(([, y1, , y2]) => [y1, y2]), ...(figure.circles ?? []).flatMap(([, cy, r]) => [cy - r, cy + r])];
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
