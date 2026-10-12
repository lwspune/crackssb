import { bearingName, facingName, walk } from './check.ts';
import type { Compass, Step } from './check.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 8 "Directions"
 * (pages 29-34). Walks are run by `walk` (x east, y north, heading clockwise
 * from north); "where is X from Y" is the quadrant of X − Y, as the book reads
 * it. Shipped with `key_basis = 'derived'` until the book's key is compared
 * against it.
 *
 * Source: content/oir/agrawal-examcart/ch08-directions.source.json
 */

const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;
const reasoned = { kind: 'reasoned' } as const;
/** Where the walker ends, seen from the start. */
const endsFrom = (start: Compass, steps: readonly Step[]) => {
  const w = walk(start, steps);
  return bearingName(w.x, w.y);
};
/** Where the start is, seen from the end: the way back. */
const backFrom = (start: Compass, steps: readonly Step[]) => {
  const w = walk(start, steps);
  return bearingName(-w.x, -w.y);
};
const far = (start: Compass, steps: readonly Step[]) => {
  const w = walk(start, steps);
  return Math.hypot(w.x, w.y);
};
const facing = (start: Compass, steps: readonly Step[]) => facingName(walk(start, steps).heading);
/** Where point a is, seen from point b. */
const seenFrom = (a: { x: number; y: number }, b: { x: number; y: number }) => bearingName(a.x - b.x, a.y - b.y);
const gap = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const verdict = (i: boolean, ii: boolean) => (i && ii ? 'Both I and II' : i ? 'Only I' : ii ? 'Only II' : 'Neither I nor II');

// Shared walks, named for what the question asks of them.
const q19 = walk('E', [8, 'R', 3, 'R', 5, 'R', 8, 'L', 3]);
const q20 = walk('S', [7, 'L', 5, 'R', 5, 'R', 5]);
const q21 = walk('E', [15, 'L', 25, 'R', 10, 'L', 15, 'L', 25]);
const q22 = walk('N', [14, 'L', 20, 'L', 36, 'L', 65]);
const q23 = walk('S', [80, 'L', 40, 'R', 40, 'L', 20, 'L', 120]);
const q28 = walk('N', [3, 'R', 4, 'R', 3, 'R', 6]);
const q29 = walk('N', [30, 'R', 40, 'L', 35, 'R', 40, 'R', 85, 'R', 50, 'R', 20]);
const q35 = walk('N', [10, 'R', 10, 'L', 10, 'R', 10]);
const q47 = walk('E', [17, 'L', 17, 'L', 24]);
const q57 = (turns: number) => walk('E', ([50, 'L', 30, 'R', 40, { turn: -135 }, 20, 'L', 10, { turn: 45 }, 50] as const).slice(0, [2, 4, 6, 8, 10][turns - 1])).heading;
const q58 = { R: walk('N', [10, 'R', 14]), U: walk('N', [10, 'R', 14, 'L', 20, 'R', 12, 'R', 25]) };
const q59 = walk('S', [25, 'L', 40, 'L', 60, 'R', 20, 'R', 35, 'L', 19]);
const q63 = { T: { x: 0, y: 0 }, P: { x: 0, y: -12 }, L: { x: 12, y: -5 } };
const q65 = { L: walk('N', [10, 'R', 40]), end: walk('N', [10, 'R', 40, 'L', 24, 'L', 12, { turn: 180 }, 22]) };
const q68 = { K: { x: 0, y: 0 }, A: { x: -15, y: 20 }, B: { x: 0, y: 20 }, H: { x: 10, y: -5 } };
/** Renaming rules (Q90, Q91, Q93): the shift that takes a direction to its new name. */
const renamedBy = (shift: number, deg: number) => facingName(deg + shift);

export const AGRAWAL_CH08_DIRECTIONS: Readonly<Record<number, KeyEntry>> = {
  1: { key: 'A', confidence: 'high', rule: 'East 2, north 1, west 0.8, south 0.5, west 1.2, north 1: he ends 1.5 km due north of the start.', check: computed(endsFrom('E', [2, 'L', 1, 'L', 0.8, { face: 'S' }, 0.5, 'R', 1.2, 'R', 1])) },
  2: { key: 'C', confidence: 'high', rule: 'North 20, east 20, south 20: he ends 20 km east of the start.', check: computed(endsFrom('N', [20, 'R', 20, 'R', 20])) },
  3: { key: 'C', confidence: 'high', rule: 'North 15, east 15, south 15: she ends 15 km east of the start.', check: computed(endsFrom('N', [15, 'R', 15, 'R', 15])) },
  4: { key: 'A', confidence: 'high', rule: 'West 4, north 6, east 6: the school is 2 km east and 6 km north of the start.', check: computed(endsFrom('W', [4, 'R', 6, 'R', 6])) },
  5: {
    key: 'B',
    confidence: 'medium',
    rule: 'Four right turns from East (south, west, north, east) leave him walking east.',
    note: '"He then right me" is read as a right turn. If it is not a turn, the last right turn leaves him facing north (D). Check against the book key.',
    check: computed(facing('E', [2, 'R', 3, 'R', 3, 'R', 1, 'R', 1])),
  },
  6: {
    held: true,
    reason: 'Left, right and right turns from any start leave John facing a main direction, never North-West, and "took a straight turn to reach point X" cannot be followed. No reading reaches an option.',
  },
  7: { key: 'D', confidence: 'high', rule: 'East, then right (south), right (west), left (south): he heads south.', check: computed(facing('E', [4, 'R', 3, 'R', 4, 'L'])) },
  8: { key: 'D', confidence: 'high', rule: 'North 4, west 2.5, south 4: he ends 2.5 km due west of the start.', check: computed(endsFrom('N', [4, 'L', 2.5, 'L', 4])) },
  9: {
    key: 'A',
    confidence: 'medium',
    rule: "A left turn and then a right turn cancel, so the bus faces at the end the way it faced at the start: south-east.",
    note: 'Read as the direction the bus faced when it set off from Anand\'s house. "When it dropped Anand home" is ambiguous; check against the book key.',
    check: computed(facingName(135 - (-90 + 90))),
  },
  10: {
    held: true,
    reason: 'Two readings give two options. Walking the renamed North-East (true East), then two left turns, faces true West, renamed South-West (D). Walking true North-East faces true South-West, renamed South (A).',
    lean: 'D',
  },
  11: {
    key: 'A',
    confidence: 'high',
    rule: 'E is south of B and south-east of C, and C is due south of A, so B is east of A. A is therefore west of B.',
    check: reasoned,
  },
  12: { key: 'D', confidence: 'high', rule: 'D is due south of A and B due east of A, so D lies south and west of B: South-West.', check: computed(seenFrom({ x: 0, y: -1 }, { x: 1, y: 0 })) },
  13: { key: 'A', confidence: 'high', rule: 'On a grid: B is 1 east of A, C 1 north of B, D 1 east of C, E 1 south of D. E is 2 east of A, due east.', check: computed(bearingName(2, 0)) },
  14: {
    key: 'D',
    confidence: 'high',
    rule: "From the bus stop, Hemant goes west 0.5 and south 2; Anurag goes east 0.25 and south 1. Anurag's house is 0.75 km east and 1 km north of Hemant's.",
    check: computed(seenFrom(walk('N', [1, 'R', 0.25, 'R', 1]), walk('N', [1, 'L', 0.5, 'L', 2]))),
  },
  15: { key: 'C', confidence: 'high', rule: "North 500, west 500, south 250: her house is 500 m east and 250 m south of the friend's house.", check: computed(backFrom('N', [500, 'L', 500, 'L', 250])) },
  16: { key: 'A', confidence: 'high', rule: 'On a grid with E at the centre: B is 2 west, F 1 west and 1 north, A 1 west and 1 north of B. A is 3 west and 1 north of E.', check: computed(bearingName(-3, 1)) },
  17: {
    key: 'D',
    confidence: 'high',
    rule: 'Left, right, right is a net right turn, and he ends heading west, so he set off south. South 2, east 4, south 2, west 2: home is 2 km west and 4 km north of the school.',
    check: computed(facingName(walk('S', ['L', 'R', 'R']).heading) === 'West' ? backFrom('S', [2, 'L', 4, 'R', 2, 'R', 2]) : null),
  },
  18: { key: 'A', confidence: 'high', rule: 'Tina and Reena are the same distance south of Veena, Tina to the east and Reena to the west. Tina is east of Reena ("Rina" in the print).', check: computed(bearingName(2, 0)) },
  19: { key: 'D', confidence: 'high', rule: 'East 8, south 3, west 5, north 8, west 3: B is 5 km due north of A, so he drives 5 km south.', check: computed(`${Math.hypot(q19.x, q19.y)} km towards ${bearingName(-q19.x, -q19.y)}`) },
  20: { key: 'D', confidence: 'high', rule: 'South 7, east 5, south 5, west 5: Y is 12 km due south of X, so 12 km north.', check: computed(`${Math.hypot(q20.x, q20.y)} km, ${bearingName(-q20.x, -q20.y)}`) },
  21: { key: 'A', confidence: 'high', rule: 'East 15, north 25, east 10, north 15, west 25: 40 m due north of A.', check: computed(`${Math.hypot(q21.x, q21.y)} m ${bearingName(q21.x, q21.y)}`) },
  22: {
    key: 'A',
    confidence: 'high',
    rule: 'North 14, west 20, south 36, east 65: she stands 45 m east of the bank, 22 m south of the hospital, facing east. North is to her left: 22 m.',
    check: computed(`To the ${(((0 - q22.heading + 540) % 360) - 180) < 0 ? 'left' : 'right'}, ${-q22.y} m.`),
  },
  23: { key: 'D', confidence: 'high', rule: 'South 80, east 40, south 40, east 20, north 120: 60 m due east of Z.', check: computed(`${Math.hypot(q23.x, q23.y)} m. ${bearingName(q23.x, q23.y)}`) },
  24: {
    key: 'A',
    confidence: 'high',
    rule: 'A: east 35, south 15, west 60, ending 25 m west and 15 m south of the corner. B: north 20, west 25, south 20, ending 25 m west on the corner line. B is 15 m due north of A.',
    check: (() => {
      const a = walk('E', [35, { face: 'S' }, 15, 'R', 60]);
      const b = walk('N', [20, { face: 'W' }, 25, 'L', 20]);
      return computed(`${gap(b, a)} m ${seenFrom(b, a)}`);
    })(),
  },
  25: {
    key: 'C',
    confidence: 'high',
    rule: 'X ends 65 m west and 25 m south; Y ends 35 m east and 25 m south. Y is 100 m due east of X.',
    check: (() => {
      const x = walk('W', [65, 'L', 25]);
      const y = walk('N', [20, 'R', 35, { face: 'S' }, 45]);
      return computed(`${gap(y, x)} m ${seenFrom(y, x)}`);
    })(),
  },
  26: {
    key: 'C',
    confidence: 'high',
    rule: "The first house is 1.5 km west and 3 km north; the second is 3.5 km east and 3 km north. The first is 5 km due west of the second.",
    check: (() => {
      const first = walk('W', [1.5, 'R', 3]);
      const second = walk('N', [1, { face: 'E' }, 3.5, 'L', 2]);
      return computed(`${gap(first, second)} km ${seenFrom(first, second)}`);
    })(),
  },
  27: {
    key: 'C',
    confidence: 'high',
    rule: 'A ends 23 km west and 19 km south; B ends 23 km west and 5 km north. A is 24 km due south of B.',
    check: (() => {
      const a = walk('W', [23, 'L', 19]);
      const b = walk('W', [19, { face: 'N' }, 5, 'L', 4]);
      return computed(`${gap(a, b)} km ${seenFrom(a, b)}`);
    })(),
  },
  28: { key: 'A', confidence: 'high', rule: 'North 3, east 4, south 3, west 6: B is 2 km due west of A, so she drives 2 km east.', check: computed(`${Math.hypot(q28.x, q28.y)} km towards ${bearingName(-q28.x, -q28.y)}`) },
  29: { key: 'D', confidence: 'high', rule: 'North 30, east 40, north 35, east 40, south 85, west 50, north 20: 30 m due east of home.', check: computed(`${Math.hypot(q29.x, q29.y)} m ${bearingName(q29.x, q29.y)}`) },
  30: { key: 'A', confidence: 'high', rule: 'North 15, west 7, south 15, west 13: the school is 20 km due west of the house.', check: computed(`${far('N', [15, 'L', 7, 'L', 15, 'R', 13])} km`) },
  31: {
    key: 'A',
    confidence: 'high',
    rule: "In the evening the sun is in the west, so shadows fall east. Amit's shadow falls to Ashwini's right, so her right is east and she faces north. Back to back, Amit faces south.",
    check: reasoned,
  },
  32: {
    key: 'C',
    confidence: 'high',
    rule: 'At 5 pm the sun is in the west, so the shadow falls east. East is on the left only when facing south, so Ketki walks south to reach home: the school is to the north.',
    check: reasoned,
  },
  33: { key: 'B', confidence: 'high', rule: 'East 145, north 155, west 225, south 95: the house is 80 m west and 60 m north of the start, √(80² + 60²) = 100 m.', check: computed(`${far('E', [145, 'L', 155, 'L', 225, 'L', 95])} m`) },
  34: { key: 'B', confidence: 'high', rule: 'North 45, west 35, north 26, east 35, north 17: home is 88 m due north of the start.', check: computed(`${far('N', [45, 'L', 35, 'R', 26, 'R', 35, 'L', 17])} m`) },
  35: { key: 'C', confidence: 'high', rule: 'North 10, east 10, north 10, east 10: 20 km east and 20 km north, √800 = 20√2 km.', check: computed(Math.hypot(q35.x, q35.y) === 20 * Math.SQRT2 ? '20√2' : null) },
  36: { key: 'B', confidence: 'high', rule: 'East 15, south 10, west 15: 10 km due south of the start.', check: computed(far('E', [15, 'R', 10, 'R', 15])) },
  37: { key: 'C', confidence: 'high', rule: 'South 25, east 15, north 25: 15 km due east of home.', check: computed(`${far('S', [25, 'L', 15, 'L', 25])} km`) },
  38: { key: 'A', confidence: 'high', rule: 'West 20, south 9, west 20: 40 km west and 9 km south, √(40² + 9²) = 41 km.', check: computed(`${far('W', [20, 'L', 9, 'R', 20])} km`) },
  39: { key: 'C', confidence: 'high', rule: 'He goes 120 + 80 = 200 m south and A + B east. √((A + B)² + 200²) = 290, so A + B = 210 m.', check: computed(`${Math.sqrt(290 ** 2 - 200 ** 2)} m`) },
  40: {
    key: 'C',
    confidence: 'high',
    rule: 'From B, Pritam ends 65 m west and 35 m south ("he left me" read as a left turn). From A, Harmeet ends 45 m east and 35 m south at the same spot. So A is 110 m west of B.',
    check: (() => {
      const pritam = walk('W', [40, 'L', 35, 'R', 25]);
      const harmeet = walk('E', [45, 'R', 35]);
      return computed(`${gap(pritam, harmeet)} m`);
    })(),
  },
  41: {
    held: true,
    reason: 'The walk ends 7 m east and 24 m north of the house, 25 m away, not the 24 m the print states, and "how far is it from a pole located in the north" cannot be followed.',
  },
  42: {
    key: 'D',
    confidence: 'high',
    rule: 'West 27, north P, east 16, south 72, east 11 ends due north or south of the house, |P − 72| away. That is 11 m, so P is 83 or 61; only 83 is offered.',
    check: computed(`${72 + 11} m`),
  },
  43: {
    key: 'A',
    confidence: 'high',
    rule: 'North X then west Y is a right angle, so X² + Y² = 5² = 25. Only 3 and 4 give it.',
    check: computed(([[3, 4], [8, 4], [4, 6], [3, 5]] as const).filter(([x, y]) => x * x + y * y === 25).map(([x, y]) => `${x} and ${y}`)[0] ?? null),
  },
  44: {
    key: 'D',
    confidence: 'medium',
    rule: 'AC = BC = 130 m and D is the midpoint of AB, so CD is perpendicular to AB: AD = √(130² − 120²) = 50, and AB = 100 m.',
    note: 'Exact South-East and South-West headings would put C √2 × 65 ≈ 92 m from D, not 120 m; the question means the triangle, not the compass. Check against the book key.',
    check: computed(`${2 * Math.sqrt(130 ** 2 - 120 ** 2)} m`),
  },
  45: {
    key: 'B',
    confidence: 'medium',
    rule: 'North 4, east 5, south 2, west 3 leaves her 2 km east and 2 km north; 2 km more to the west ends 2 km due north of the start.',
    note: '"Then walks 2 km" gives no direction; read as continuing west. Check against the book key.',
    check: computed(`${far('N', [4, 'R', 5, { face: 'S' }, 2, { face: 'W' }, 3, 2])} km`),
  },
  46: { key: 'B', confidence: 'high', rule: 'South 5, west 3, north 5, west 5: 8 km due west of O.', check: computed(`${far('S', [5, 'R', 3, 'R', 5, 'L', 5])} km`) },
  47: { key: 'A', confidence: 'high', rule: 'East 17, north 17, west 24: 7 km west and 17 km north, √338 = 13√2 km.', check: computed(Math.hypot(q47.x, q47.y) ** 2 === 338 || Math.abs(Math.hypot(q47.x, q47.y) - 13 * Math.SQRT2) < 1e-9 ? '13√2' : null) },
  48: { key: 'A', confidence: 'high', rule: 'North 15, west 7, south 15, west 13: the school is 20 km due west of the house. (Q30 again.)', check: computed(`${far('N', [15, 'L', 7, 'L', 15, 'R', 13])} km`) },
  49: { key: 'C', confidence: 'high', rule: 'South 6 and east 8 put her 6 km below the house line; the school is level with A, 3 km north of the house. X = 6 + 3 = 9 km.', check: computed(`${6 + 3} km`) },
  50: { key: 'B', confidence: 'high', rule: '√(200² + 210²) = 290 m.', check: computed(`${Math.hypot(200, 210)} meters`) },
  51: { key: 'C', confidence: 'high', rule: 'East 50, north 15, west 30, south 15: 20 m due east of the start.', check: computed(`${far('E', [50, 'L', 15, 'L', 30, 'L', 15])} m`) },
  52: { key: 'B', confidence: 'high', rule: 'Four equal sides, each turning 90°, close a square: back home, 0 m.', check: computed(`${Math.round(far('NW', [30, { face: 'SW' }, 30, { face: 'SE' }, 30, { face: 'NE' }, 30]))} m`) },
  53: {
    key: 'C',
    confidence: 'high',
    rule: 'The market is 80 m west and 50 m south of the house; the school is further south of it. 80² + (50 + d)² = 170², so 50 + d = 150 and d = 100 m.',
    check: computed(`${Math.sqrt(170 ** 2 - 80 ** 2) - 50} meters`),
  },
  54: { key: 'D', confidence: 'high', rule: 'East 35, south 15, west 15: 20 km east and 15 km south, √(20² + 15²) = 25 km.', check: computed(`${far('E', [35, 'R', 15, 'R', 15])} km`) },
  55: {
    key: 'A',
    confidence: 'high',
    rule: 'Shyam ends 5 km west and 10 km south; Ram 5 km east and 2 km north. They are 10 km and 12 km apart on the two axes: √(100 + 144) = √244.',
    check: (() => {
      const shyam = walk('N', ['L', 5, 'L', 10]);
      const ram = walk('N', [2, 'R', 5]);
      return computed(`√${Math.round(gap(shyam, ram) ** 2)}`);
    })(),
  },
  56: {
    key: 'D',
    confidence: 'high',
    rule: 'With Q at the origin: P (0, 80), V (−20, 60). P is 20 m east and 20 m north of V: 20√2 metres, North-East.',
    note: 'Option D prints "North-Eeast"; it is the North-East option.',
    check: reasoned,
  },
  57: {
    key: 'B',
    confidence: 'high',
    rule: 'Facing east; after turn 1 north, turn 2 east, turn 3 (135° left) north-west, turn 4 south-west, turn 5 (45° right) west. Turn 3 is not North-East and turn 5 is not South.',
    check: computed(verdict(facingName(q57(3)) === 'North-East', facingName(q57(5)) === 'South')),
  },
  58: {
    key: 'A',
    confidence: 'high',
    rule: 'R is (14, 10) and U is (26, 5): 12 east and 5 south, so RU = 13 m. P (0, 0) is south-west of U, not north-east.',
    check: computed(verdict(gap(q58.R, q58.U) === 13, seenFrom({ x: 0, y: 0 }, q58.U) === 'North-East')),
  },
  59: {
    key: 'D',
    confidence: 'high',
    rule: 'The walk ends 79 m due east of the start, so the start is 79 m west of the finish. The turns face east, north, east, then south after the fourth.',
    check: computed(verdict(bearingName(-q59.x, -q59.y) === 'West' && Math.abs(q59.x) === 79, facing('S', [25, 'L', 40, 'L', 60, 'R', 20, 'R']) === 'South')),
  },
  60: { key: 'D', confidence: 'high', rule: 'South, +90° west, +180° east, −180° west, −45° south-west.', check: computed(facing('S', [{ turn: 90 }, { turn: 180 }, { turn: -180 }, { turn: -45 }])) },
  61: {
    held: true,
    reason: 'The turns net 120° clockwise (372 − 476 − 234 + 458), so it started 120° anticlockwise of east, at 330°: between North and North-West, none of the options.',
    lean: 'B',
  },
  62: {
    held: true,
    reason: 'The turns net 240° anticlockwise, leaving him at 120°: between East and South-East, none of the options.',
    lean: 'A',
  },
  63: {
    key: 'B',
    confidence: 'high',
    rule: 'With T at the origin: P (0, −12), L (12, −5). T is 12 west and 5 north of L, √(144 + 25) = 13 km; P is 12 west and 7 south of L: South-west.',
    check: computed(`${gap(q63.T, q63.L)} km., ${seenFrom(q63.P, q63.L)}`),
  },
  64: { key: 'C', confidence: 'high', rule: 'T is 13 km south and 4 km east of G: √(169 + 16) = √185 km.', check: computed(`√${13 ** 2 + 4 ** 2} km`) },
  65: {
    key: 'D',
    confidence: 'medium',
    rule: 'Shop L is 40 m east and 10 m north of the start. He goes on north 24, west 12, then back east 22, ending (50, 34). L is 10 m west and 24 m south of him: 26 m South-West.',
    note: 'The photo cuts the digit after "turns back 2"; read as 22. Check against the book key.',
    check: computed(`${gap(q65.L, q65.end)}m. ${seenFrom(q65.L, q65.end)}`),
  },
  66: {
    held: true,
    reason: 'Shop G is 300 m west of the start; hospital M is 1200 m further west and 500 m north of it, so √(1200² + 500²) = 1300 m North-West. No option says that: D prints "130 m, North-West", likely a misprint.',
    lean: 'D',
  },
  67: { key: 'D', confidence: 'high', rule: 'East (90°) + 135 − 90 + 270 + 45 + 135 − 180 = 405° = 45°: North-East.', check: computed(facing('E', [{ turn: 135 }, { turn: -90 }, { turn: 270 }, { turn: 45 }, { turn: 135 }, { turn: -180 }])) },
  68: {
    key: 'B',
    confidence: 'high',
    rule: 'With K at the origin: B (0, 20), A (−15, 20), C (10, 0), H (10, −5). K is √(15² + 20²) = 25 km from A; H is 10 east and 25 south of B: south-east.',
    check: computed(`${gap(q68.K, q68.A)} km, ${seenFrom(q68.H, q68.B)}`),
  },
  69: { key: 'C', confidence: 'high', rule: '145 − 290 − 345 + 400 = −90°: from north, west.', check: computed(facing('N', [{ turn: 145 }, { turn: -290 }, { turn: -345 }, { turn: 400 }])) },
  70: { key: 'A', confidence: 'high', rule: 'Flowing south, a quarter-circle to the left turns it east; a right angle to the right turns it south again.', check: computed(facing('S', ['L', 'R'])) },
  71: { key: 'C', confidence: 'high', rule: "East 8, north 5, west 8: Swapna's house is 5 km due north of his home.", check: computed(`${far('E', [8, { face: 'N' }, 5, 'L', 8])} km`) },
  72: { key: 'D', confidence: 'high', rule: 'North 30, south 50, east 20, north 20: 20 m due east of the start.', check: computed(`${far('N', [30, { face: 'S' }, 50, { face: 'E' }, 20, { face: 'N' }, 20])} m ${endsFrom('N', [30, { face: 'S' }, 50, { face: 'E' }, 20, { face: 'N' }, 20])}`) },
  73: { key: 'D', confidence: 'high', rule: 'The school is east of the house and the market south of it, whatever the distances: the school is north and east of the market.', check: computed(seenFrom({ x: 1, y: 0 }, { x: 0, y: -2 })) },
  74: { key: 'D', confidence: 'high', rule: 'The school is east of the house and the post office west of it: the school is east of the post office.', check: computed(seenFrom({ x: 1, y: 0 }, { x: -1, y: 0 })) },
  75: { key: 'A', confidence: 'high', rule: 'West 78, north 22, east 32, south 41, west 34, south 41: 80 m west and 60 m south, √(6400 + 3600) = 100 m.', check: computed(`${far('W', [78, 'R', 22, 'R', 32, 'R', 41, 'R', 34, 'L', 41])} m`) },
  76: { key: 'C', confidence: 'high', rule: 'The temple is north of the house and the market south of it: the temple is north of the market.', check: computed(seenFrom({ x: 0, y: 1 }, { x: 0, y: -1 })) },
  77: { key: 'A', confidence: 'high', rule: 'At equal distances the market (0, −1) is west and south of the school (1, 0): South-West.', check: computed(seenFrom({ x: 0, y: -1 }, { x: 1, y: 0 })) },
  78: { key: 'D', confidence: 'high', rule: 'West 48, north 32, east 54, south 40: 6 m east and 8 m south, √(36 + 64) = 10 m.', check: computed(`${far('W', [48, { face: 'N' }, 32, 'R', 54, { face: 'S' }, 40])} m`) },
  79: { key: 'D', confidence: 'high', rule: 'East 38, north 57, east 17, south 17, west 25: 30 m east and 40 m north, √(900 + 1600) = 50 m.', check: computed(`${far('E', [38, 'L', 57, { face: 'E' }, 17, 'R', 17, 'R', 25])} m`) },
  80: { key: 'D', confidence: 'high', rule: 'West 30, north 45, east 20, south 60: 10 m west and 15 m south, √325 ≈ 18 m.', check: computed(`${Math.round(far('W', [30, 'R', 45, 'R', 20, 'R', 60]))} m`) },
  81: { key: 'D', confidence: 'high', rule: 'West (270°) + 45 + 180 − 270 = 225°: South-West.', check: computed(facing('W', [{ turn: 45 }, { turn: 180 }, { turn: -270 }])) },
  82: { key: 'D', confidence: 'high', rule: 'At 3 o\'clock the hour hand is 90° clockwise of the minute hand. Minute hand north-east (45°), so the hour hand is at 135°: South-East.', check: computed(facingName(45 + 90)) },
  83: { key: 'B', confidence: 'high', rule: 'East 90, south 20, west 30, north 100: 60 m east and 80 m north, √(3600 + 6400) = 100 m.', check: computed(`${far('E', [90, 'R', 20, 'R', 30, { face: 'N' }, 100])} meters`) },
  84: {
    key: 'C',
    confidence: 'high',
    rule: 'The hour hand at 6 points north, so the 6 is north and each hour mark is 30° clockwise from the last: the 3 is 90° anticlockwise of north. At 9.15 the minute hand is on the 3: West.',
    check: computed(facingName((3 - 6) * 30)),
  },
  85: { key: 'D', confidence: 'high', rule: 'North + 45 + 180 − 45 = 180°: South.', check: computed(facing('N', [{ turn: 45 }, { turn: 180 }, { turn: -45 }])) },
  86: { key: 'B', confidence: 'high', rule: "West 0.3, north 0.5, east 0.3: the friend's place is 0.5 km due north of the house.", check: computed(`${Math.round(far('W', [0.3, 'R', 0.5, 'R', 0.3]) * 10) / 10} km`) },
  87: {
    held: true,
    reason: 'East (90°) + 90 + 145 = 325°: between North-West and North, none of the options.',
    lean: 'C',
  },
  88: { key: 'B', confidence: 'high', rule: 'South, left to east, left to north: he faces north.', check: computed(facing('S', [6, 'L', 4, 'L', 5])) },
  89: { key: 'C', confidence: 'high', rule: 'East, then right: south.', check: computed(facing('E', [1, 'R', 1])) },
  90: { key: 'C', confidence: 'high', rule: 'South-East (135°) becomes North (0°): every direction moves 135° anticlockwise. North-East becomes West, as stated; West (270°) becomes 135°: South-East.', check: computed(renamedBy(-135, 45) === 'West' ? renamedBy(-135, 270) : null) },
  91: {
    key: 'A',
    confidence: 'medium',
    rule: 'The example turns North into West and East into North: 90° anticlockwise. North-West (315°) becomes 225°: South-West.',
    note: 'The print says "clockwise", which would give North-East (B); the example decides. Check against the book key.',
    check: computed(renamedBy(-90, 0) === 'West' && renamedBy(-90, 90) === 'North' ? renamedBy(-90, 315) : null),
  },
  92: { key: 'D', confidence: 'high', rule: 'However the watch is turned, at 3 o\'clock the hour hand is 90° clockwise of the minute hand. Minute hand north-east, so the hour hand points south-east.', check: computed(facingName(45 + 90)) },
  93: { key: 'A', confidence: 'high', rule: 'North-East (45°) becomes West (270°) and South-East (135°) becomes North (360°): every direction moves 225° clockwise. West (270°) becomes 495° = 135°: South-East.', check: computed(renamedBy(225, 45) === 'West' && renamedBy(225, 135) === 'North' ? renamedBy(225, 270) : null) },
  94: { key: 'D', confidence: 'high', rule: 'Facing east: left and 10 north, left and 10 west, then 45° right puts you on a north-west heading for 25. You end west and north of the start.', check: computed(endsFrom('E', ['L', 10, 'L', 10, { turn: 45 }, 25])) },
  95: {
    key: 'C',
    confidence: 'medium',
    rule: 'House to market 5 km, on to the fair 2 km, and back the same way, 7 km: 14 km in all.',
    note: 'The fair\'s distance from the house is not stated; read as 2 km beyond the market on the same road. Check against the book key.',
    check: computed(`${5 + 2 + (2 + 5)} km`),
  },
  96: { key: 'C', confidence: 'high', rule: 'East, right to south, left to east: he goes east.', check: computed(facing('E', [5, 'R', 4, 'L', 5])) },
  97: {
    key: 'B',
    confidence: 'high',
    rule: 'Both run 50 m the same way. Rakesh goes 60 right then 50 on; Govind 40 left then 50 on. They end level, 60 + 40 = 100 m apart.',
    check: computed(`${gap(walk('N', [50, 'R', 60, 'L', 50]), walk('N', [50, 'L', 40, 'R', 50]))}m`),
  },
  98: { key: 'B', confidence: 'high', rule: 'South, left to east, right to south: she faces south.', check: computed(facing('S', [4, 'L', 3, 'R', 4])) },
  99: { key: 'B', confidence: 'high', rule: 'East, right (south), right (west), left (south), left (east), left (north): it faces north.', check: computed(facing('E', [20, 'R', 10, 'R', 9, 'L', 5, 'L', 12, 'L', 6])) },
  100: { key: 'C', confidence: 'high', rule: 'North 25, west 20, south 15, east 20: 10 km due north of the house.', check: computed(endsFrom('N', [25, { face: 'W' }, 20, { face: 'S' }, 15, { face: 'E' }, 20])) },
};
