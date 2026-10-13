import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 12 "Find the Missing
 * Term" (pages 45-48). Each rule is run first on the complete rows (or
 * columns, or figures) the question prints, and the file fails to load if it
 * does not reproduce them; only then is it applied to the row with the gap.
 * Shipped with `key_basis = 'derived'` until the book's key is compared
 * against it.
 *
 * Source: content/oir/agrawal-examcart/ch12-missing-term.source.json
 */

const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;

/** A rule checked on the figure's complete rows, then applied to the one with the gap. */
function rule(fn: (...xs: number[]) => number, examples: readonly (readonly [readonly number[], number])[], target: readonly number[]): number {
  for (const [xs, want] of examples) {
    const got = fn(...xs);
    if (got !== want) throw new Error(`rule gives ${got} for ${xs.join(', ')}, the book ${want}`);
  }
  return fn(...target);
}

/** The one whole number from −1,000 to 10,000 that makes `holds` true: the gap inside a row. */
function solveFor(holds: (x: number) => boolean): number {
  const hits = Array.from({ length: 11001 }, (_, i) => i - 1000).filter(holds);
  if (hits.length !== 1) throw new Error(`${hits.length} values fill the gap, not one`);
  return hits[0];
}

/** Letters by alphabet position: A = 1. */
const pos = (letter: string) => letter.charCodeAt(0) - 64;
const letter = (n: number) => String.fromCharCode(64 + n);

const sumSq = (...xs: number[]) => xs.reduce((s, x) => s + x * x, 0);
const sum = (...xs: number[]) => xs.reduce((s, x) => s + x, 0);

export const AGRAWAL_CH12_MISSING_TERM: Readonly<Record<number, KeyEntry>> = {
  1: {
    key: 'B',
    confidence: 'high',
    rule: 'Each column adds up to 24 more than the one before: 60, 84, so 108. 108 − 39 − 15 = 54.',
    check: computed(((c1, c2) => (c2 - c1 === 24 ? c2 + 24 - 39 - 15 : null))(sum(13, 30, 17), sum(26, 42, 16))),
  },
  2: { key: 'B', confidence: 'high', rule: 'Bottom = 2 × top ÷ middle: 2 × 81 ÷ 3 = 54, 2 × 33 ÷ 6 = 11, so 2 × 56 ÷ 4 = 28.', check: computed(rule((a, b) => (2 * a) / b, [[[81, 3], 54], [[33, 6], 11]], [56, 4])) },
  3: { key: 'A', confidence: 'high', rule: 'Middle = left to the power of right: 7³ = 343, 2⁸ = 256, so 5⁴ = 625.', check: computed(rule((a, b) => a ** b, [[[7, 3], 343], [[2, 8], 256]], [5, 4])) },
  4: { key: 'D', confidence: 'high', rule: 'Middle = left × right − 9: 304 − 9 = 295, 153 − 9 = 144, so 416 − 9 = 407.', check: computed(rule((a, b) => a * b - 9, [[[16, 19], 295], [[9, 17], 144]], [26, 16])) },
  5: { key: 'D', confidence: 'high', rule: 'Right = 3 × left + 2 × middle: 18 + 30 = 48, 21 + 34 = 55, so 39 + 58 = 97.', check: computed(rule((a, b) => 3 * a + 2 * b, [[[6, 15], 48], [[7, 17], 55]], [13, 29])) },
  6: { key: 'A', confidence: 'high', rule: 'Bottom = top² − middle: 676 − 50 = 626, 169 − 46 = 123, so 324 − 21 = 303.', check: computed(rule((a, b) => a * a - b, [[[26, 50], 626], [[13, 46], 123]], [18, 21])) },
  7: { held: true, reason: 'No rule found that fits the complete rows and columns of the grid and lands on one option; waiting for the book key.' },
  8: { key: 'D', confidence: 'high', rule: 'Bottom = 5 × top × middle: 5 × 11 × 8 = 440, 5 × 9 × 12 = 540, so 5 × 7 × 14 = 490.', check: computed(rule((a, b) => 5 * a * b, [[[11, 8], 440], [[9, 12], 540]], [7, 14])) },
  9: {
    key: 'D',
    confidence: 'high',
    rule: 'Right = left + 3 × middle: 49 + 24 = 73, 11 + 18 = 29, so ? + 36 = 58 gives 22.',
    check: computed(((f) => (f(49, 8) === 73 && f(11, 6) === 29 ? solveFor((x) => f(x, 12) === 58) : null))((a: number, b: number) => a + 3 * b)),
  },
  10: { key: 'B', confidence: 'high', rule: 'Middle = left² + right: 9 + 4 = 13, 16 + 11 = 27, so 36 + 31 = 67.', check: computed(rule((a, b) => a * a + b, [[[3, 4], 13], [[4, 11], 27]], [6, 31])) },
  11: { key: 'D', confidence: 'high', rule: 'Bottom = (top + 1) × (middle + 1): 15 × 12 = 180, 13 × 18 = 234, so 16 × 17 = 272.', check: computed(rule((a, b) => (a + 1) * (b + 1), [[[14, 11], 180], [[12, 17], 234]], [15, 16])) },
  12: { key: 'A', confidence: 'high', rule: 'The middle of each row is the average of its ends: 19, 20, so (32 + 16) ÷ 2 = 24.', check: computed(rule((a, b) => (a + b) / 2, [[[26, 12], 19], [[23, 17], 20]], [32, 16])) },
  13: {
    key: 'C',
    confidence: 'high',
    rule: 'Top = right² − left²: 36 − 9 = 27, 36 − 25 = 11, so ?² − 16 = 20 gives 6.',
    check: computed(((f) => (f(3, 6) === 27 && f(5, 6) === 11 ? solveFor((x) => x > 0 && f(4, x) === 20) : null))((l: number, r: number) => r * r - l * l)),
  },
  14: { key: 'D', confidence: 'high', rule: 'Each number cubed, less 10: 125 − 10 = 115, 216 − 10 = 206, so 343 − 10 = 333.', check: computed(rule((n) => n ** 3 - 10, [[[5], 115], [[6], 206], [[8], 502], [[9], 719]], [7])) },
  15: {
    key: 'A',
    confidence: 'high',
    rule: 'Bottom = (top + middle)²: 18² = 324, 17² = 289, so (11 + ?)² = 441 gives 10.',
    check: computed(((f) => (f(11, 7) === 324 && f(9, 8) === 289 ? solveFor((x) => x > 0 && f(11, x) === 441) : null))((a: number, b: number) => (a + b) ** 2)),
  },
  16: {
    key: 'D',
    confidence: 'medium',
    rule: 'Right = 10 × left + 5 × middle: 150 + 70 = 220, 200 + 90 = 290, so 110 + 200 = 310.',
    note: 'The first row prints 14 and 220 apart from 15, on the same line; read as one row.',
    check: computed(rule((a, b) => 10 * a + 5 * b, [[[15, 14], 220], [[20, 18], 290]], [11, 40])),
  },
  17: {
    key: 'D',
    confidence: 'medium',
    rule: 'The bottom row adds up each column: 3 + 15 + 2 = 20, 7 + 12 + 3 = 22, so 5 + 6 + 9 = 20.',
    note: 'The first row prints 3 and 7 apart from 5, on the same line; read as one row.',
    check: computed(rule(sum, [[[3, 15, 2], 20], [[7, 12, 3], 22]], [5, 6, 9])),
  },
  18: { key: 'C', confidence: 'high', rule: 'Top left ÷ top right − middle = foot: 3 − 2 = 1, 5 − 3 = 2, so 9 − 4 = 5.', check: computed(rule((a, b, m) => a / b - m, [[[27, 9, 2], 1], [[35, 7, 3], 2]], [36, 4, 4])) },
  19: { key: 'D', confidence: 'high', rule: 'Cube root of the first + square root of the second: 5 + 5 = 10, 6 + 7 = 13, so 3 + 11 = 14.', check: computed(rule((a, b) => Math.cbrt(a) + Math.sqrt(b), [[[125, 25], 10], [[216, 49], 13]], [27, 121])) },
  20: { key: 'C', confidence: 'high', rule: 'Bottom = (top + middle) × middle: 25 × 7 = 175, 36 × 15 = 540, so 23 × 11 = 253.', check: computed(rule((a, b) => (a + b) * b, [[[18, 7], 175], [[21, 15], 540]], [12, 11])) },
  21: {
    key: 'A',
    confidence: 'medium',
    rule: 'Last = first + third + 10 × second: 15 + 7 + 10 = 32, 20 + 7 + 20 = 47, 13 + 7 + 30 = 50, so ? + 7 + 40 = 48 gives 1.',
    note: 'The photo prints 7 and ? alike. Read with the 7 that every bracket shares; read the other way round, (7, 4, ?, 48), the gap is 1 too.',
    check: computed(
      ((f) => (f(15, 1, 7) === 32 && f(20, 2, 7) === 47 && f(13, 3, 7) === 50 ? solveFor((x) => f(x, 4, 7) === 48) : null))((a: number, b: number, c: number) => a + c + 10 * b),
    ),
  },
  22: { key: 'A', confidence: 'high', rule: 'The bottom row adds up each column: 6 + 5 + 8 = 19, 3 + 2 + 7 = 12, so 4 + 9 + 6 = 19.', check: computed(rule(sum, [[[6, 5, 8], 19], [[3, 2, 7], 12]], [4, 9, 6])) },
  23: { key: 'C', confidence: 'high', rule: 'Last = first × third + second: 12 + 6 = 18, 16 + 5 = 21, so 21 + 1 = 22.', check: computed(rule((a, b, c) => a * c + b, [[[3, 6, 4], 18], [[2, 5, 8], 21]], [3, 1, 7])) },
  24: {
    key: 'A',
    confidence: 'high',
    rule: 'Right = left × middle ÷ 6: 7 × 18 ÷ 6 = 21, 20 × 15 ÷ 6 = 50, so ? × 42 ÷ 6 = 98 gives 14.',
    check: computed(((f) => (f(7, 18) === 21 && f(20, 15) === 50 ? solveFor((x) => f(x, 42) === 98) : null))((a: number, b: number) => (a * b) / 6)),
  },
  25: { key: 'C', confidence: 'high', rule: 'Right = left² + middle: 64 + 9 = 73, 49 + 14 = 63, so 121 + 25 = 146.', check: computed(rule((a, b) => a * a + b, [[[8, 9], 73], [[7, 14], 63]], [11, 25])) },
  26: { key: 'A', confidence: 'high', rule: 'Right = (left + 1) × (middle + 1): 12 × 15 = 180, 18 × 19 = 342, so 24 × 21 = 504.', check: computed(rule((a, b) => (a + 1) * (b + 1), [[[11, 14], 180], [[17, 18], 342]], [23, 20])) },
  27: {
    key: 'D',
    confidence: 'high',
    rule: 'Right = left × middle ÷ 8: 40 × 57 ÷ 8 = 285, 35 × 32 ÷ 8 = 140, so ? × 40 ÷ 8 = 175 gives 35.',
    check: computed(((f) => (f(40, 57) === 285 && f(35, 32) === 140 ? solveFor((x) => f(x, 40) === 175) : null))((a: number, b: number) => (a * b) / 8)),
  },
  28: {
    key: 'C',
    confidence: 'high',
    rule: 'Square root of the left + cube root of the middle: 4 + 3 = 7, 5 + 2 = 7, so 11 + ∛? = 12 gives 1.',
    check: computed(((f) => (f(16, 27) === 7 && f(25, 8) === 7 ? solveFor((x) => x > 0 && f(121, x) === 12) : null))((a: number, b: number) => Math.sqrt(a) + Math.cbrt(b))),
  },
  29: { key: 'B', confidence: 'high', rule: 'Third = −3 × (first + second): −3 × 30 = −90, −3 × 4 = −12, so −3 × −15 = 45.', check: computed(rule((a, b) => -3 * (a + b), [[[58, -28], -90], [[-17, 21], -12]], [-8, -7])) },
  30: {
    key: 'A',
    confidence: 'medium',
    rule: 'The digits of the first two numbers add up to 4 more than the third: 9 − 4 = 5, 15 − 4 = 11, so 12 − 4 = 8.',
    note: 'An unusual rule, but the only one found that fits both complete rows. Check against the book key.',
    check: computed(rule((a, b) => [...`${a}${b}`].reduce((s, d) => s + Number(d), 0) - 4, [[[14, 22], 5], [[18, 42], 11]], [22, 35])),
  },
  31: { held: true, reason: 'No rule found that fits the complete rows and columns of the grid and lands on one option; waiting for the book key.' },
  32: { key: 'C', confidence: 'high', rule: 'The bottom row is 3 × the sum of each column: 3 × 54 = 162, 3 × 35 = 105, so 3 × 55 = 165.', check: computed(rule((...xs) => 3 * sum(...xs), [[[16, 17, 21], 162], [[8, 12, 15], 105]], [13, 23, 19])) },
  33: {
    key: 'D',
    confidence: 'high',
    rule: 'The bottom row is 3 × the sum of each column: 3 × 33 = 99, 3 × 50 = 150, so 3 × (10 + 24 + ?) = 168 gives 22.',
    check: computed(((f) => (f(8, 11, 14) === 99 && f(12, 16, 22) === 150 ? solveFor((x) => f(10, 24, x) === 168) : null))((...xs: number[]) => 3 * sum(...xs))),
  },
  34: {
    key: 'B',
    confidence: 'high',
    rule: '(Top + lower right)² = lower left: (3 + 2)² = 25, (9 + 2)² = 121, so (4 + ?)² = 81 gives 5.',
    check: computed(((f) => (f(3, 2) === 25 && f(9, 2) === 121 ? solveFor((x) => x > 0 && f(4, x) === 81) : null))((t: number, r: number) => (t + r) ** 2)),
  },
  35: {
    key: 'C',
    confidence: 'high',
    rule: 'Each upper number cubed, plus 1, sits diagonally below it: 4³ + 1 = 65, 7³ + 1 = 344, 9³ + 1 = 730, 2³ + 1 = 9, 5³ + 1 = 126. So 8³ + 1 = 513.',
    check: computed(rule((n) => n ** 3 + 1, [[[4], 65], [[7], 344], [[9], 730], [[2], 9], [[5], 126]], [8])),
  },
  36: { key: 'A', confidence: 'high', rule: 'Right = (left + middle)² ÷ 4: 144 ÷ 4 = 36, 100 ÷ 4 = 25, so 256 ÷ 4 = 64.', check: computed(rule((a, b) => (a + b) ** 2 / 4, [[[7, 5], 36], [[9, 1], 25]], [12, 4])) },
  37: {
    key: 'C',
    confidence: 'high',
    rule: 'The bottom row is the sum of the squares above: 81 + 49 + 144 = 274, 500, 1278, so 196 + 225 + ?² = 1321 gives 30.',
    check: computed(
      ((f) => (f(9, 7, 12) === 274 && f(10, 16, 12) === 500 && f(13, 25, 22) === 1278 ? solveFor((x) => x > 0 && f(14, 15, x) === 1321) : null))(sumSq),
    ),
  },
  38: {
    key: 'B',
    confidence: 'high',
    rule: 'In each row the first two differ as much as the last two: 84 − 73 = 65 − 54, 129 − 105 = 96 − 72, so 145 − ? = 79 − 28 gives 94.',
    check: computed(((f) => (f(84, 73, 65, 54) && f(129, 105, 96, 72) ? solveFor((x) => f(145, x, 79, 28)) : null))((a: number, b: number, c: number, d: number) => a - b === c - d)),
  },
  39: { held: true, reason: 'The second column is cubes (8, 27, 1), but no rule found ties it to the rest of the grid, and the options hold three other cubes; waiting for the book key.' },
  40: { key: 'A', confidence: 'high', rule: 'The product of the other three: 12 × 16 × 13 = 2496, 21 × 26 × 18 = 9828, so 15 × 11 × 20 = 3300.', check: computed(rule((a, b, c) => a * b * c, [[[12, 16, 13], 2496], [[21, 26, 18], 9828]], [15, 11, 20])) },
  41: { key: 'C', confidence: 'high', rule: 'Top left × (top right + bottom left): 10 × 12 = 120, 6 × 41 = 246, so 15 × 52 = 780.', check: computed(rule((a, b, c) => a * (b + c), [[[10, 4, 8], 120], [[6, 25, 16], 246]], [15, 40, 12])) },
  42: {
    key: 'B',
    confidence: 'high',
    rule: 'Centre = top² + bottom² − left² − right²: 144 + 196 − 121 − 64 = 155, 169 + 289 − 81 − 144 = 233, so 256 + 400 − 144 − 225 = 287.',
    check: computed(rule((t, b, l, r) => t * t + b * b - l * l - r * r, [[[12, 14, 11, 8], 155], [[13, 17, 9, 12], 233]], [16, 20, 12, 15])),
  },
  43: { key: 'B', confidence: 'high', rule: 'Centre = the sum of the four squares: 49 + 9 + 25 + 64 = 147, 247, so 16 + 144 + 4 + 25 = 189.', check: computed(rule(sumSq, [[[7, 3, 5, 8], 147], [[6, 9, 11, 3], 247]], [4, 12, 2, 5])) },
  44: {
    key: 'D',
    confidence: 'medium',
    rule: 'The pair\'s difference, less the middle number, gives the foot: 66 − 63 = 3, 41 − 37 = 4, so 51 − 42 = 9.',
    note: 'Fits both complete trees, but an unusual rule. Check against the book key.',
    check: computed(rule((a, b, m) => a - b - m, [[[93, 27, 63], 3], [[79, 38, 37], 4]], [67, 16, 42])),
  },
  45: { key: 'A', confidence: 'high', rule: 'Last = first² − second − third: 121 − 21 = 100, 64 − 8 = 56, so 49 − 21 = 28.', check: computed(rule((a, b, c) => a * a - b - c, [[[11, 20, 1], 100], [[8, 3, 5], 56]], [7, 5, 16])) },
  46: { key: 'B', confidence: 'high', rule: 'The bottom row is the sum of the squares above: 16 + 4 + 1 = 21, 25 + 9 + 64 = 98, so 36 + 49 + 9 = 94.', check: computed(rule(sumSq, [[[4, 2, 1], 21], [[5, 3, 8], 98]], [6, 7, 3])) },
  47: { key: 'C', confidence: 'high', rule: 'Bottom = first × second − third, down each column: 18 − 4 = 14, 63 − 2 = 61, so 24 − 7 = 17.', check: computed(rule((a, b, c) => a * b - c, [[[3, 6, 4], 14], [[9, 7, 2], 61]], [8, 3, 7])) },
  48: { key: 'B', confidence: 'high', rule: 'Half the product of the two at the top: 6, 15, so 7 × 2 ÷ 2 = 7.', check: computed(rule((a, b) => (a * b) / 2, [[[3, 4], 6], [[6, 5], 15]], [7, 2])) },
  49: { key: 'D', confidence: 'high', rule: 'Opposite numbers add up to the centre, 7: 2 + 5, 3 + 4, so 1 + 6.', check: computed(rule((a) => 7 - a, [[[2], 5], [[3], 4]], [1])) },
  50: {
    key: 'A',
    confidence: 'high',
    rule: 'Each pair is a letter and its mirror from the other end of the alphabet: AZ, BY, CX, so DW.',
    check: computed(((pair) => (['AZ', 'BY', 'CX'].every((p, i) => p === pair(i + 1)) ? pair(4) : null))((n: number) => letter(n) + letter(27 - n))),
  },
  51: {
    key: 'C',
    confidence: 'medium',
    rule: 'Twice the difference of the two at the top, less 3: 2 × 5 − 3 = 7, 2 × 6 − 3 = 9, so 2 × 7 − 3 = 11.',
    note: 'Two figures fix little; this is the simplest rule found that fits both. Check against the book key.',
    check: computed(rule((a, b) => 2 * (b - a) - 3, [[[10, 15], 7], [[39, 45], 9]], [49, 56])),
  },
  52: {
    key: 'D',
    confidence: 'high',
    rule: 'By alphabet position, the middle of each row is the sum of its ends: E5 + H8 = M13, N14 + A1 = O15, so I9 + D4 = M13.',
    check: computed(((f) => (f('E', 'H') === 'M' && f('N', 'A') === 'O' ? f('I', 'D') : null))((a: string, b: string) => letter(pos(a) + pos(b)))),
  },
  53: {
    key: 'B',
    confidence: 'medium',
    rule: 'Two series alternate along the chain: 16, 15, 13, 10, 6 (less 1, 2, 3, 4) and 2, 4, 7, 11, 16 (more 2, 3, 4, 5).',
    note: 'The chain prints its numbers turned along the curve; the link read as 6 shows as an upside-down 9.',
    check: computed(
      ((odd, even) => (odd.join() === '16,15,13,10,6' && even.slice(0, 4).join() === '2,4,7,11' ? even[4] : null))(
        Array.from({ length: 5 }, (_, i) => 16 - (i * (i + 1)) / 2),
        Array.from({ length: 5 }, (_, i) => 2 + (i * (i + 3)) / 2),
      ),
    ),
  },
  54: { held: true, reason: 'The three circles print their numbers and letters too small for the photo to show; the question cannot be read.' },
  55: {
    key: 'D',
    confidence: 'high',
    rule: 'Each lower number is the one above times one less: 2 × 1, 5 × 4, 7 × 6, 8 × 7, 1 × 0. So ? × (? − 1) = 72 gives 9.',
    check: computed(((f) => ([[2, 2], [5, 20], [7, 42], [8, 56], [1, 0]].every(([n, v]) => f(n) === v) ? solveFor((x) => x > 0 && f(x) === 72) : null))((n: number) => n * (n - 1))),
  },
  56: { key: 'C', confidence: 'high', rule: 'Each row adds up to 30: 15 + 10 + 5, 10 + 8 + 12, so 7 + 3 + 20.', check: computed(rule((a, b) => 30 - a - b, [[[15, 10], 5], [[10, 8], 12]], [7, 3])) },
  57: { key: 'A', confidence: 'high', rule: 'Inside = one side × the other + base: 24 + 5 = 29, 48 + 7 = 55, so 15 + 4 = 19.', check: computed(rule((a, b, c) => a * b + c, [[[6, 4, 5], 29], [[8, 6, 7], 55]], [5, 3, 4])) },
  58: {
    key: 'A',
    confidence: 'high',
    rule: 'Down each column, first + second − third = bottom: 8 + 7 − 2 = 13, 3 + 6 − 4 = 5, so 4 + 1 − ? = 4 gives 1.',
    check: computed(((f) => (f(8, 7, 2) === 13 && f(3, 6, 4) === 5 ? solveFor((x) => f(4, 1, x) === 4) : null))((a: number, b: number, c: number) => a + b - c)),
  },
  59: { key: 'A', confidence: 'high', rule: 'Each row adds up to 17: 3 + 6 + 8, 5 + 8 + 4, so 4 + 7 + 6.', check: computed(rule((a, b) => 17 - a - b, [[[3, 6], 8], [[5, 8], 4]], [4, 7])) },
  60: {
    key: 'B',
    confidence: 'high',
    rule: 'Opposite letters add up to 15 by alphabet position: F6 + I9, C3 + L12, so A1 + N14.',
    check: computed(((f) => (f('F') === 'I' && f('C') === 'L' ? f('A') : null))((a: string) => letter(15 - pos(a)))),
  },
  61: {
    key: 'B',
    confidence: 'high',
    rule: 'Clockwise round each square the multipliers are k, k², k³: 4 × 2 = 8, × 4 = 32, × 8 = 256. In the second k is 3: 5 × 3 = 15, × 9 = 135, so × 27 = 3645.',
    check: computed(
      ((walk) => (walk(4, 2).join() === '4,8,32,256' && walk(5, 3).slice(0, 3).join() === '5,15,135' ? walk(5, 3)[3] : null))((start: number, k: number) => [start, start * k, start * k ** 3, start * k ** 6]),
    ),
  },
  62: { key: 'C', confidence: 'high', rule: 'Inside = top + bottom − 1: 3 + 4 − 1 = 6, 5 + 1 − 1 = 5, so 0 + 5 − 1 = 4.', check: computed(rule((t, b) => t + b - 1, [[[3, 4], 6], [[5, 1], 5]], [0, 5])) },
  63: { key: 'D', confidence: 'high', rule: 'Middle = left × (right + 1): 5 × 8 = 40, 11 × 7 = 77, so 3 × 10 = 30.', check: computed(rule((a, b) => a * (b + 1), [[[5, 7], 40], [[11, 6], 77]], [3, 9])) },
  64: { key: 'C', confidence: 'high', rule: 'The product of the two at the top, plus 2: 14, 32, so 72 + 2 = 74.', check: computed(rule((a, b) => a * b + 2, [[[3, 4], 14], [[5, 6], 32]], [8, 9])) },
  65: { key: 'B', confidence: 'high', rule: 'Middle = the two at the foot multiplied, divided by the top: 12 ÷ 2 = 6, 42 ÷ 3 = 14, 72 ÷ 6 = 12, so 40 ÷ 4 = 10.', check: computed(rule((t, a, b) => (a * b) / t, [[[2, 4, 3], 6], [[3, 7, 6], 14], [[6, 9, 8], 12]], [4, 5, 8])) },
  66: {
    key: 'C',
    confidence: 'high',
    rule: 'The row below squares the row with the gap: 3² = 9, 4² = 16, so ?² = 25 gives 5.',
    check: computed(((f) => (f(3) === 9 && f(4) === 16 ? solveFor((x) => x > 0 && f(x) === 25) : null))((n: number) => n * n)),
  },
  67: {
    key: 'C',
    confidence: 'high',
    rule: 'Clockwise from 3, products of odd numbers in turn: 1 × 3, 3 × 5, 5 × 7, 7 × 9 = 63, 9 × 11, 11 × 13.',
    check: computed(((seq) => (seq[0] === 3 && seq[1] === 15 && seq[2] === 35 && seq[4] === 99 && seq[5] === 143 ? seq[3] : null))([1, 3, 5, 7, 9, 11].map((n) => n * (n + 2)))),
  },
  68: {
    key: 'B',
    confidence: 'medium',
    rule: 'Top = the larger lower number − the smaller + 4: 34 − 8 + 4 = 30, 13 − 5 + 4 = 12, so 30 − 7 + 4 = 27.',
    note: 'Two figures fix little; this is the simplest rule found that fits both. Check against the book key.',
    check: computed(rule((a, b) => b - a + 4, [[[8, 34], 30], [[5, 13], 12]], [7, 30])),
  },
  69: { key: 'A', confidence: 'high', rule: 'Right = √left × √middle: 5 × 12 = 60, 9 × 15 = 135, so 7 × 17 = 119.', check: computed(rule((a, b) => Math.sqrt(a) * Math.sqrt(b), [[[25, 144], 60], [[81, 225], 135]], [49, 289])) },
  70: {
    key: 'B',
    confidence: 'medium',
    rule: 'The letters skip one (A C E G I K M O Q); in each row the third number is the sum of the first two: 2 + 4 = 6, 5 + 9 = 14, so 3 + 5 = 8. K8.',
    note: 'The middle cell reads I5 or 15 in the photo; I5 fits the run of letters.',
    check: computed(((n) => letter(1 + 2 * 5) + n)(rule((a, b) => a + b, [[[2, 4], 6], [[5, 9], 14]], [3, 5]))),
  },
  71: { key: 'B', confidence: 'high', rule: 'One less than the squares 1 to 9: 0, 3, 8, 15, 24, 35, 48, 63, 80.', check: computed(rule((n) => n * n - 1, [[[1], 0], [[2], 3], [[3], 8], [[4], 15], [[5], 24], [[6], 35], [[7], 48], [[9], 80]], [8])) },
  72: {
    key: 'A',
    confidence: 'high',
    rule: 'Down, CAR?; across, BA?CH. T makes CART and BATCH; K, V and L make no word across.',
    check: { kind: 'reasoned' },
  },
  73: {
    key: 'C',
    confidence: 'high',
    rule: 'Read clockwise from the bottom gap, the circle spells SRI LANKA: S at the bottom, A at the top, K on the right.',
    check: { kind: 'reasoned' },
  },
  74: {
    key: 'C',
    confidence: 'high',
    rule: 'Centre = √(top × bottom + left × right): √(64 + 36) = 10, √(25 + 144) = 13, so √(9 + 16) = 5.',
    check: computed(rule((t, b, l, r) => Math.sqrt(t * b + l * r), [[[4, 16, 4, 9], 10], [[5, 5, 16, 9], 13]], [1, 9, 2, 8])),
  },
  75: { key: 'B', confidence: 'high', rule: 'Top² = the sum of the squares below: 25² = 7² + 24², 5² = 3² + 4², so √(81 + 1600) = 41.', check: computed(rule((a, b) => Math.sqrt(a * a + b * b), [[[7, 24], 25], [[3, 4], 5]], [9, 40])) },
  76: { key: 'B', confidence: 'high', rule: 'Right = middle × (left − 1): 3 × 7 = 21, 5 × 5 = 25, so 2 × 11 = 22.', check: computed(rule((a, b) => b * (a - 1), [[[8, 3], 21], [[6, 5], 25]], [12, 2])) },
  77: {
    key: 'A',
    confidence: 'medium',
    rule: 'Each number cubed, plus 1, sits diagonally below it: 5³ + 1 = 126, so 6³ + 1 = 217.',
    note: 'One example fixes little; the same diagonal cube rule runs Q35. Check against the book key.',
    check: computed(rule((n) => n ** 3 + 1, [[[5], 126]], [6])),
  },
  78: { key: 'C', confidence: 'high', rule: 'Centre = top + bottom + left − right: 18 + 17 + 9 − 6 = 38, 12 + 12 + 8 − 3 = 29, so 13 + 8 + 11 − 9 = 23.', check: computed(rule((t, b, l, r) => t + b + l - r, [[[18, 17, 9, 6], 38], [[12, 12, 8, 3], 29]], [13, 8, 11, 9])) },
  79: {
    key: 'A',
    confidence: 'high',
    rule: 'Right = left² − middle: 169 − 4 = 165, 9 − 2 = 7, so ?² − 11 = 14 gives 5.',
    check: computed(((f) => (f(13, 4) === 165 && f(3, 2) === 7 ? solveFor((x) => x > 0 && f(x, 11) === 14) : null))((a: number, b: number) => a * a - b)),
  },
};
