import { facingName } from './check.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 10 "Seating Arrangment"
 * (pages 38-40). Arrangement puzzles are solved by trying every order and
 * keeping those that meet every condition; a key is computed only when the
 * answer is the same in every surviving order. Simple chains are reasoned in
 * words. Shipped with `key_basis = 'derived'` until the book's key is compared
 * against it.
 *
 * Conventions: a row facing north reads left to right; around a table, seats
 * run clockwise seen from above, and someone facing the centre has the next
 * seat anticlockwise on their right.
 *
 * Source: content/oir/agrawal-examcart/ch10-seating.source.json
 */

function* perms<T>(xs: readonly T[]): Generator<T[]> {
  if (xs.length <= 1) {
    yield [...xs];
    return;
  }
  for (let i = 0; i < xs.length; i++) for (const p of perms([...xs.slice(0, i), ...xs.slice(i + 1)])) yield [xs[i], ...p];
}

/** Every order of `names` in a row that meets `ok`. */
const rows = (names: readonly string[], ok: (pos: (x: string) => number, a: readonly string[]) => boolean) => [...perms(names)].filter((a) => ok((x) => a.indexOf(x), a));

interface Table {
  readonly at: (i: number) => string;
  readonly seat: (x: string) => number;
  /** k seats to x's right (negative for left). */
  readonly right: (x: string, k: number) => string;
  readonly left: (x: string, k: number) => string;
  readonly neighbours: (x: string) => readonly string[];
}
function table(a: readonly string[], facesOut: Readonly<Record<string, boolean>> = {}): Table {
  const n = a.length;
  const at = (i: number) => a[((i % n) + n) % n];
  const seat = (x: string) => a.indexOf(x);
  const dir = (x: string) => (facesOut[x] ? 1 : -1);
  return {
    at,
    seat,
    right: (x, k) => at(seat(x) + dir(x) * k),
    left: (x, k) => at(seat(x) - dir(x) * k),
    neighbours: (x) => [at(seat(x) + 1), at(seat(x) - 1)],
  };
}
/** Every seating of `names` round a table (the first name fixed, to drop rotations) that meets `ok`. */
const tables = (names: readonly string[], ok: (t: Table, a: readonly string[]) => boolean) =>
  [...perms(names.slice(1))].map((p) => [names[0], ...p]).filter((a) => ok(table(a), a));

/** The one answer every solution gives; null when solutions disagree or none exist. */
function only<S>(solutions: readonly S[], answer: (s: S) => string | number): string | number | null {
  const answers = new Set(solutions.map(answer));
  return solutions.length > 0 && answers.size === 1 ? [...answers][0] : null;
}

/**
 * Round-table facing: the anchor faces `anchorFacing` (compass degrees), so sits
 * on the opposite side; `steps` seats on, in the listed (anticlockwise) order,
 * someone sits 360/n × steps further anticlockwise and faces the centre.
 */
const facingAround = (n: number, anchorFacing: number, steps: number) => facingName(anchorFacing + 180 - (360 / n) * steps + 180);

const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;
const reasoned = { kind: 'reasoned' } as const;
const r = (key: 'A' | 'B' | 'C' | 'D', rule: string) => ({ key, confidence: 'high', rule, check: reasoned }) as const;

// ---------------------------------------------------------------- the passages, solved once
const P40 = (() => {
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const out: { a: readonly string[]; t: Table }[] = [];
  for (const a of tables(names, () => true)) {
    for (let mask = 0; mask < 256; mask++) {
      const facesOut = Object.fromEntries(names.map((x, i) => [x, Boolean(mask & (1 << i))]));
      if (names.filter((x) => facesOut[x]).length !== 4) continue;
      const t = table(a, facesOut);
      if (!facesOut.E || t.neighbours('E').some((x) => facesOut[x])) continue;
      if (facesOut.D || t.neighbours('D').some((x) => !facesOut[x])) continue;
      if (t.right('E', 2) !== 'H' || t.left('E', 3) !== 'B' || t.left('A', 2) !== 'G' || t.right('H', 3) !== 'B') continue;
      if (!t.neighbours('D').includes('F') || !t.neighbours('G').includes('C') || t.neighbours('D').includes('B')) continue;
      out.push({ a, t });
    }
  }
  return out;
})();
const WORDS = ['None', 'One', 'Two', 'Three', 'Four'];

/** Q43-44: men face south (their left is east), ladies face north (their left is west); columns run west to east. */
const P43 = (() => {
  const out: { men: string[]; ladies: string[] }[] = [];
  for (const men of perms(['A', 'B', 'C', 'D', 'E'])) {
    for (const ladies of perms(['M', 'N', 'O', 'P', 'Q'])) {
      const m = (x: string) => men.indexOf(x);
      const l = (x: string) => ladies.indexOf(x);
      if (m('B') !== m('D') + 1 || m('B') !== l('Q')) continue;
      if (!((m('C') === 0 && l('N') === 4) || (m('C') === 4 && l('N') === 0))) continue;
      if (m('E') !== l('O') || l('O') !== l('M') + 1) continue;
      if (l('P') !== l('Q') - 1 || l('P') !== m('D')) continue;
      if (l('M') !== 0 && l('M') !== 4) continue;
      out.push({ men, ladies });
    }
  }
  return out;
})();

const P45 = tables(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], (t) =>
  t.left('B', 4) === 'H' && t.right('F', 2) === 'H' && t.left('C', 3) === 'A' && !t.neighbours('C').includes('F') && t.left('A', 2) === 'G' && t.right('E', 2) === 'D',
);

export const AGRAWAL_CH10_SEATING: Readonly<Record<number, KeyEntry>> = {
  1: r('C', 'Sattu, then Subhash, Amit, Sonu, Yatendra: the middle one is Amit.'),
  2: { held: true, reason: "The photograph blurs the circles' subscripts, so the comparisons the question is built on cannot be read." },
  3: r('A', 'C and D are equal; E is taller than D; F is shorter than C. F is shorter than everyone.'),
  4: r('C', 'Sumit is older than Dara, who is older than Manjeet; the two older than Sumit are Vivek and Akram, and Vivek is older than Akram. Vivek is eldest.'),
  5: r('D', 'Rama, Saaho, Dinesh, Tara, Kailash, Manoj, tallest to shortest: Manoj is shortest.'),
  6: r('C', 'P, Q, R are the three eldest. S, T, U follow, and U is not the youngest, so V is.'),
  7: r('D', 'B has two taller, and D is taller than B; E is not tallest, so D, E, B, then A, C, F, G. Four are taller than C.'),
  8: r('C', 'P, Q, R are the three tallest; S, T, U follow, and U is not the shortest, so V is. U and V are shorter than T: two.'),
  9: r('D', "Mohini, Neeta, Sarita and Malini are placed by height, but Hema only by age: her height is unknown, so the second tallest cannot be named."),
  10: r('A', 'U is 2nd, T 3rd, P 4th; S has four above, so 5th; C is 7th; K above S takes 1st and M 6th. Third from last is 5th: S.'),
  11: r('C', 'G > H > F > K > J, and I is third lowest, below F: G, H, F, I, K, J. G is highest.'),
  12: { held: true, reason: 'Six students are scored but only five are named, and nothing places Raghav; none of the options follows.' },
  13: r('C', 'D > C > B > A > E: C is second.'),
  14: r('A', 'C finished before A, A before B, B before D, D before E: C was first.'),
  15: { held: true, reason: 'Kailash is eldest, Daksh second (39), Ashish fourth (19). Manish (younger than Daksh) and Lalit fill third and fifth either way round, so the youngest is not fixed.', lean: 'C' },
  16: {
    key: 'C',
    confidence: 'medium',
    rule: 'E is youngest and F sixth; A is third; G is older than A and younger than B, so B first, G second. B is the eldest.',
    note: 'The question asks "who is the tallest" of friends ranked by age; read as the eldest. Check against the book key.',
    check: reasoned,
  },
  17: {
    key: 'D',
    confidence: 'medium',
    rule: 'C and D are older than E; E falls between A and C, so A is younger than E; A is older than B. B is youngest.',
    note: '"E who is between A and C" is read as E\'s age lying between theirs. Check against the book key.',
    check: reasoned,
  },
  18: r('C', 'G is 7th; D is ahead of only two, so 5th; C is behind only two, so 3rd; F is not first, so F 2nd, E 4th, A 6th, B 1st. Fourth from behind is 4th: E.'),
  19: r('C', 'E > B > C > A > D: B is second costliest.'),
  20: r('C', "Sheetal, Shayana, Brinda, Dipesh run in a line; Amit is not next to Dipesh, so he is at Sheetal's end. Sheetal's neighbours are Amit and Shayana."),
  21: {
    key: 'B',
    confidence: 'high',
    rule: 'P1 P6 P5 P4 P2 are consecutive, and P3 is left of P1: P3 P1 P6 P5 P4 P2. One phone lies between P3 and P6.',
    check: computed(only(rows(['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], (pos) => pos('P1') === pos('P6') - 1 && pos('P5') === pos('P2') - 2 && pos('P4') === pos('P6') + 2 && pos('P4') === pos('P5') + 1 && pos('P3') < pos('P1')), (a) => Math.abs(a.indexOf('P3') - a.indexOf('P6')) - 1)),
  },
  22: r('D', 'White, Red, Pink, Blue, Yellow, Green in a stack: Blue is between Pink and Yellow.'),
  23: r('B', 'F C B ... with E at the other end and A D E before it: F C B A D E. Fourth from the right is B.'),
  24: r('D', 'Monkey at the left end, lion at the right; cow just left of deer, fox between deer and lion: Monkey, Cow, Deer, Fox, Lion.'),
  25: r('B', 'D, then B, then A, then C and O in some order: A is in the middle.'),
  26: r('C', 'Navin is richer than Ramesh, who is richer than everyone else.'),
  27: {
    key: 'D',
    confidence: 'high',
    rule: 'Asha, Selia, Emili, Barsha sit together; Disha cannot be at an end and Ferheen not at the right end, which leaves Ferheen, Disha, Asha, Selia, Emili, Barsha. Four sit right of Disha.',
    check: computed(only(rows(['Asha', 'Barsha', 'Selia', 'Disha', 'Emili', 'Ferheen'], (pos) => Math.abs(pos('Asha') - pos('Selia')) === 1 && Math.abs(pos('Emili') - pos('Selia')) === 1 && pos('Disha') !== 0 && pos('Disha') !== 5 && pos('Barsha') === pos('Emili') + 1 && pos('Ferheen') !== 5), (a) => 5 - a.indexOf('Disha'))),
  },
  28: {
    key: 'D',
    confidence: 'high',
    rule: 'A faces B, so C faces D and C likes black. C is right of the blue-liker, yellow is left of red, and B is not yellow: only A yellow, C black, B blue, D red works.',
    check: computed((() => {
      const found: string[] = [];
      for (const a of tables(['A', 'B', 'C', 'D'], () => true)) {
        for (const colours of perms(['Yellow', 'Blue', 'Black', 'Red'])) {
          const t = table(a);
          const likes = Object.fromEntries(a.map((x, i) => [x, colours[i]]));
          const who = (c: string) => a[colours.indexOf(c)];
          const opposite = (x: string) => t.at(t.seat(x) + 2);
          if (likes[opposite('D')] === 'Black' && t.right(who('Blue'), 1) === 'C' && t.left(who('Red'), 1) === who('Yellow') && opposite('A') === 'B' && likes.B !== 'Yellow') found.push(who('Red'));
        }
      }
      return only(found, (x) => x);
    })()),
  },
  29: { held: true, reason: '"Junaid is on the right side who is standing facing Chaman" and "who is to the left of Barun" can be read several ways for two facing rows; no single answer follows.' },
  30: {
    key: 'C',
    confidence: 'high',
    rule: 'With Amit and Vinod together, Chandu and Dixit apart and Vinod not third, only Chandu Vinod Amit Dixit and Dixit Vinod Amit Chandu remain: Amit is third in both.',
    check: computed((() => {
      const sols = rows(['Amit', 'Vinod', 'Chandu', 'Dixit'], (pos) => Math.abs(pos('Chandu') - pos('Dixit')) !== 1 && pos('Vinod') !== 2 && Math.abs(pos('Amit') - pos('Vinod')) === 1);
      const claims: Record<string, (a: readonly string[]) => boolean> = {
        'Dixit is at the first place': (a) => a[0] === 'Dixit',
        'Dixit is not at the first place': (a) => a[0] !== 'Dixit',
        'Amit is at the third place': (a) => a[2] === 'Amit',
        'Chandu is at the first place': (a) => a[0] === 'Chandu',
      };
      const always = Object.entries(claims).filter(([, f]) => sols.every(f)).map(([c]) => c);
      return always.length === 1 ? always[0] : null;
    })()),
  },
  31: { key: 'B', confidence: 'high', rule: 'Facing north, Sandhya sits on the south side. Sanju is two seats on anticlockwise (90°), on the east side, facing west.', check: computed(facingAround(8, 0, 2)) },
  32: { key: 'D', confidence: 'high', rule: 'Facing south, Sandhya sits on the north side. Sunil is five seats on anticlockwise (225°), on the south-east side, facing north-west.', check: computed(facingAround(8, 180, 5)) },
  33: {
    key: 'D',
    confidence: 'medium',
    rule: 'Facing north-east, P sits on the south-west side. S is three seats on clockwise (135°), on the north side, facing south.',
    note: 'The question gives no seating order; read as alphabetical, clockwise. Anticlockwise would put S facing west, which is not an option. Check against the book key.',
    check: computed(facingAround(8, 45, -3)),
  },
  34: { key: 'C', confidence: 'high', rule: 'Facing east, Sandhya sits on the west side. Sahil is one seat back, clockwise (45°), on the north-west side, facing south-east.', check: computed(facingAround(8, 90, -1)) },
  35: r('A', 'B F A sit together; G D B; E C G: the line is E C G D B F A. Fourth right of C is F.'),
  36: { key: 'B', confidence: 'high', rule: 'Facing east, Sandhya sits on the west side. Saurabh is three seats on anticlockwise (135°), on the south-east side, facing north-west.', check: computed(facingAround(8, 90, 3)) },
  37: {
    key: 'C',
    confidence: 'high',
    rule: 'One seating fits (clockwise S V X Z T U Y): T is third to the left of V.',
    check: computed((() => {
      const sols = tables(['S', 'T', 'U', 'V', 'X', 'Y', 'Z'], (t) => t.right('S', 3) === 'T' && t.neighbours('T').includes('U') && t.neighbours('T').includes('Z') && t.right('Y', 3) === 'Z' && t.right('X', 1) === 'V');
      return only(sols, (a) => (table(a).left('V', 3) === 'T' ? 'T is sitting third to the left of V' : 'other'));
    })()),
  },
  38: r('D', 'B, C, F sit in a row west to east; across from them A faces B and E faces F, so D faces C, to its north.'),
  39: {
    key: 'A',
    confidence: 'high',
    rule: 'Men and women alternate; W is right of B, Y faces X and is left of A, C is right of Z. One seating fits, and D sits between W and Y.',
    check: computed((() => {
      const men = new Set(['A', 'B', 'C', 'D']);
      const sols = tables(['A', 'B', 'C', 'D', 'W', 'X', 'Y', 'Z'], (t, a) => {
        for (let i = 0; i < 8; i++) if (men.has(a[i]) === men.has(a[(i + 1) % 8])) return false;
        return t.right('B', 1) === 'W' && t.at(t.seat('Y') + 4) === 'X' && t.left('A', 1) === 'Y' && t.right('Z', 1) === 'C';
      });
      return only(sols, (a) => table(a).neighbours('D').slice().sort().join(' and '));
    })()),
  },
  40: { key: 'A', confidence: 'high', rule: 'The seating (clockwise A H G C B F D E) fits however the outward-facers are chosen; going clockwise from A, H and G sit before C: two.', check: computed(only(P40, ({ t }) => WORDS[((t.seat('C') - t.seat('A') + 8) % 8) - 1])) },
  41: { key: 'B', confidence: 'high', rule: 'In that seating B sits between C and F.', check: computed(only(P40, ({ t }) => { const d = (t.seat('C') - t.seat('F') + 8) % 8; return d === 2 ? t.at(t.seat('F') + 1) : d === 6 ? t.at(t.seat('F') - 1) : '-'; })) },
  42: { key: 'C', confidence: 'high', rule: 'In that seating F is third to the right of A.', check: computed(only(P40, ({ t }) => t.right('A', 3))) },
  43: { key: 'B', confidence: 'high', rule: 'The ladies sit M O P Q N west to east, facing north; third to the right (east) of O is N.', check: computed(only(P43, ({ ladies }) => ladies[ladies.indexOf('O') + 3] ?? '-')) },
  44: { key: 'D', confidence: 'high', rule: 'The men sit C E D B A west to east and the ladies M O P Q N: A (east end) and M (west end) are diagonally opposite.', check: computed(only(P43, ({ men, ladies }) => `${men[4]} and ${ladies[0]}`)) },
  45: { key: 'B', confidence: 'high', rule: 'One seating fits (clockwise A F G B D C E H): A is on F\'s immediate right.', check: computed(only(P45, (a) => table(a).right('F', 1))) },
  46: { key: 'C', confidence: 'high', rule: 'In that seating B is third to the left of A.', check: computed(only(P45, (a) => table(a).left('A', 3))) },
  47: {
    key: 'B',
    confidence: 'high',
    rule: 'In that seating D is on B\'s immediate left.',
    check: computed(only(P45, (a) => { const t = table(a); return ['EH', 'DB', 'CE', 'AF'].filter((p) => t.left(p[1], 1) === p[0]).join(); })),
  },
  48: { key: 'B', confidence: 'high', rule: "E's neighbours in that seating are H and C.", check: computed(only(P45, (a) => { const n = table(a).neighbours('E'); return ['DH', 'HC', 'CA'].find((p) => [...p].sort().join() === [...n].sort().join()) ?? 'None of these'; })) },
  49: { key: 'A', confidence: 'high', rule: 'In that seating E is on H\'s immediate right.', check: computed(only(P45, (a) => table(a).right('H', 1))) },
  50: {
    key: 'B',
    confidence: 'high',
    rule: 'Five in a row: Freya is left of the middle seat and right of Bella, so Bella and Freya take the first two; Austin, two from the middle, is at the right end with Sara beside him. Jamie is in the middle.',
    check: computed(only(rows(['Freya', 'Bella', 'Sara', 'Jamie', 'Austin'], (pos) => pos('Freya') < 2 && pos('Freya') > pos('Bella') && pos('Sara') > pos('Jamie') && pos('Austin') > pos('Sara') && Math.abs(pos('Austin') - 2) === 2), (a) => a[2])),
  },
  51: r('B', 'C, E, B, A, D from the left: E is second.'),
};
