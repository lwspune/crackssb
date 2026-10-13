import { z } from 'zod';

/**
 * Cubes and dice for OIR (D29). A face is a label: text, a symbol, `pips:N`
 * for N dots, `fill` for a solid black face, `cross` for a face crossed
 * corner to corner, or '' for a blank one.
 *
 * Geometry: x to the right, y away from the viewer, z up. A view is a cube
 * drawn corner-on from the front right: its top face (+z), its front face
 * (-y), drawn on the left, and its right face (+x). A net is folded printed
 * side out: its first square becomes the top, and each neighbour folds down
 * along their shared edge. Only which label sits on which face is tracked,
 * not which way up a label is drawn on its face.
 */

export interface DiceView {
  readonly top: string;
  readonly left: string;
  readonly right: string;
  readonly caption?: string;
}

export interface NetCell {
  readonly r: number;
  readonly c: number;
  readonly face: string;
}

export interface DiceFigure {
  readonly views?: readonly DiceView[];
  readonly nets?: readonly { readonly cells: readonly NetCell[]; readonly caption?: string }[];
}

const view = z.object({ top: z.string(), left: z.string(), right: z.string(), caption: z.string().min(1).optional() }).strict();
const cell = z.object({ r: z.number().int(), c: z.number().int(), face: z.string() }).strict();
const net = z.object({ cells: z.array(cell).min(1), caption: z.string().min(1).optional() }).strict();

export const diceSchema = z
  .object({ views: z.array(view).optional(), nets: z.array(net).optional() })
  .strict()
  .refine((d) => (d.views?.length ?? 0) + (d.nets?.length ?? 0) > 0, 'a dice figure draws a view or a net');

export function validateDice(dice: unknown): DiceFigure {
  return diceSchema.parse(dice) as DiceFigure;
}

type Vec = readonly [number, number, number];
/** A labelled cube: each label's outward normal. */
export type Cube = ReadonlyMap<string, Vec>;

const NORMALS: readonly Vec[] = [
  [0, 0, 1],
  [0, 0, -1],
  [0, -1, 0],
  [0, 1, 0],
  [1, 0, 0],
  [-1, 0, 0],
];

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crossV = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const neg = (a: Vec): Vec => [-a[0], -a[1], -a[2]];
const same = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/**
 * Can this cube be turned to show the view? The three faces must meet at one
 * corner, in the same turn as top, front, right: n(top) · (n(front) × n(right)) = +1.
 */
export function canShow(cube: Cube, v: DiceView): boolean {
  const [t, l, r] = [cube.get(v.top), cube.get(v.left), cube.get(v.right)];
  if (!t || !l || !r) return false;
  return dot(t, crossV(l, r)) === 1;
}

function permutations<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [xs.slice()];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/**
 * Every labelling of a cube with these faces that shows every view. A die that
 * names fewer than six faces is padded with unknown faces, '?', '?2', ... which
 * read back as '?'. Labellings that differ only by a turn of the whole cube
 * are all kept; questions read from them as a set.
 */
export function cubesFromViews(labels: readonly string[], views: readonly DiceView[]): Cube[] {
  if (new Set(labels).size !== labels.length || labels.length > 6) throw new Error('a cube has six different faces');
  const padded = [...labels, ...Array.from({ length: 6 - labels.length }, (_, i) => (i === 0 ? '?' : `?${i + 1}`))];
  for (const v of views) for (const f of [v.top, v.left, v.right]) if (!padded.includes(f)) throw new Error(`"${f}" is not one of the faces`);
  const cubes: Cube[] = [];
  for (const p of permutations(padded)) {
    const cube: Cube = new Map(p.map((label, i) => [label, NORMALS[i]] as const));
    if (views.every((v) => canShow(cube, v))) cubes.push(cube);
  }
  return cubes;
}

const unknown = (label: string) => (label.startsWith('?') ? '?' : label);
const labelAt = (cube: Cube, n: Vec) => [...cube].find(([, m]) => same(m, n))![0];

/** Every face that is opposite `face` in some cube allowed. One answer means the views settle it. */
export function opposite(cubes: readonly Cube[], face: string): string[] {
  return [...new Set(cubes.map((c) => unknown(labelAt(c, neg(c.get(face)!)))))];
}

/** Every face that sits next to `face` in some cube allowed. */
export function adjacent(cubes: readonly Cube[], face: string): string[] {
  return [...new Set(cubes.flatMap((c) => [...c].filter(([, n]) => dot(n, c.get(face)!) === 0).map(([l]) => unknown(l))))];
}

/**
 * Folds a net printed side out. The first square becomes the top; moving
 * right on the sheet, a square folds down to become the face beyond the
 * current one's right edge, and so on. Throws unless the sheet is six
 * connected squares that land on six different faces.
 */
export function foldNet(cells: readonly NetCell[]): Cube {
  if (cells.length !== 6) throw new Error('a net has six squares');
  const at = new Map(cells.map((c) => [`${c.r},${c.c}`, c]));
  interface Frame {
    readonly n: Vec;
    readonly right: Vec;
    readonly down: Vec;
  }
  const placed = new Map<NetCell, Frame>([[cells[0], { n: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] }]]);
  const queue = [cells[0]];
  while (queue.length) {
    const cur = queue.shift()!;
    const f = placed.get(cur)!;
    const moves: [number, number, Frame][] = [
      [0, 1, { n: f.right, right: neg(f.n), down: f.down }],
      [0, -1, { n: neg(f.right), right: f.n, down: f.down }],
      [1, 0, { n: f.down, right: f.right, down: neg(f.n) }],
      [-1, 0, { n: neg(f.down), right: f.right, down: f.n }],
    ];
    for (const [dr, dc, frame] of moves) {
      const next = at.get(`${cur.r + dr},${cur.c + dc}`);
      if (!next || placed.has(next)) continue;
      placed.set(next, frame);
      queue.push(next);
    }
  }
  if (placed.size !== 6) throw new Error('the squares of a net are connected');
  const normals = [...placed.values()].map((f) => f.n);
  if (normals.some((n, i) => normals.findIndex((m) => same(m, n)) !== i)) throw new Error('two squares fold onto one face');
  return new Map([...placed].map(([c, f]) => [c.face, f.n] as const));
}
