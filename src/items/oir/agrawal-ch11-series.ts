import { fromDiffs, iterate } from './check.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 11 "Series Test"
 * (pages 41-44). The book's own key has not been seen yet; every answer here
 * was worked out from the printed question and is shipped with
 * `key_basis = 'derived'` until the book's key is compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch11-series.source.json
 */

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
/** Each term is the sum of the two before it. */
const sumOfTwo = (a: number, b: number, count: number) => {
  const out = [a, b];
  while (out.length < count) out.push(out[out.length - 2] + out[out.length - 1]);
  return out;
};
/** Each term is the product of the two before it. */
const productOfTwo = (a: number, b: number, count: number) => {
  const out = [a, b];
  while (out.length < count) out.push(out[out.length - 2] * out[out.length - 1]);
  return out;
};
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59];
/** Insert `ch` into `base` at each position in turn. */
const moving = (base: string, ch: string, positions: readonly number[]) =>
  positions.map((p) => base.slice(0, p) + ch + base.slice(p));
/** Lower-case `width` letters of `base` starting at each position in turn. */
const lowered = (base: string, width: number, positions: readonly number[]) =>
  positions.map((p) => base.slice(0, p) + base.slice(p, p + width).toLowerCase() + base.slice(p + width));
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Shift a capital letter, wrapping round the alphabet. */
const shift = (letter: string, by: number) => ALPHABET[(((ALPHABET.indexOf(letter) + by) % 26) + 26) % 26];

export const AGRAWAL_CH11_SERIES: Readonly<Record<number, KeyEntry>> = {
  // ---------------------------------------------------------------- Type-1: find the missing number
  1: { key: 'D', confidence: 'high', rule: 'Differences are consecutive primes: +11, +13, +17, +19, +23, +29.', check: { kind: 'missing', terms: fromDiffs(9, [11, 13, 17, 19, 23, 29]), blanks: [1] } },
  2: { key: 'B', confidence: 'high', rule: 'Differences are odd numbers: +3, +5, +7, +9, +11, +13, +15.', check: { kind: 'missing', terms: fromDiffs(44, [3, 5, 7, 9, 11, 13, 15]), blanks: [5, 6] } },
  3: {
    key: 'A',
    confidence: 'medium',
    rule: 'Differences are every other prime: 2, 5, 11, 17, 23, then 31.',
    note: 'The differences 2, 5, 11, 17, 23 could also be read as +3 then +6, +6, +6, giving 101 (option D). Every-other-prime fits all five differences; the +6 reading does not fit the first. Check against the book key.',
    check: { kind: 'missing', terms: fromDiffs(14, [2, 5, 11, 17, 23, 31]), blanks: [6] },
  },
  4: { key: 'D', confidence: 'high', rule: 'Each term is twice the previous plus 3.', check: { kind: 'missing', terms: iterate(3, 5, (p) => 2 * p + 3), blanks: [4] } },
  5: { key: 'C', confidence: 'high', rule: 'Double, then add 1 and subtract 1 alternately: ×2+1, ×2−1, ×2+1, ...', check: { kind: 'missing', terms: iterate(5, 6, (p, i) => (i % 2 ? 2 * p + 1 : 2 * p - 1)), blanks: [3] } },
  6: { key: 'A', confidence: 'high', rule: 'n × (n+1) for n = 6 to 11.', check: { kind: 'missing', terms: range(6, 11).map((n) => n * (n + 1)), blanks: [3] } },
  7: { key: 'B', confidence: 'high', rule: 'Differences are multiples of 7: +7, +14, +21, +28, +35.', check: { kind: 'missing', terms: fromDiffs(81, [7, 14, 21, 28, 35]), blanks: [3] } },
  8: { key: 'C', confidence: 'high', rule: 'Add 23 each time.', check: { kind: 'missing', terms: fromDiffs(133, [23, 23, 23, 23, 23]), blanks: [2] } },
  9: { key: 'C', confidence: 'high', rule: 'Differences are multiples of 4: +4, +8, +12, +16, +20.', check: { kind: 'missing', terms: fromDiffs(1, [4, 8, 12, 16, 20]), blanks: [2] } },
  10: { key: 'A', confidence: 'high', rule: 'Differences 4, 11, 25, 46, 74 grow by 7, 14, 21, 28, so the next difference is 74 + 35 = 109.', check: { kind: 'missing', terms: fromDiffs(1, fromDiffs(4, [7, 14, 21, 28, 35])), blanks: [6] } },
  11: { key: 'B', confidence: 'high', rule: 'Add 17 each time.', check: { kind: 'missing', terms: fromDiffs(13, [17, 17, 17, 17, 17, 17, 17]), blanks: [3] } },
  12: { key: 'B', confidence: 'high', rule: 'Differences 2, 5, 9, 14, 20 grow by 3, 4, 5, 6, so the next difference is 27.', check: { kind: 'missing', terms: fromDiffs(5, fromDiffs(2, [3, 4, 5, 6, 7])), blanks: [6] } },
  13: { key: 'B', confidence: 'high', rule: 'Differences are multiples of 3: +3, +6, +9, +12, +15, +18.', check: { kind: 'missing', terms: fromDiffs(5, [3, 6, 9, 12, 15, 18]), blanks: [2] } },
  14: { key: 'A', confidence: 'high', rule: 'Differences are even numbers from 18: +18, +20, +22, +24.', check: { kind: 'missing', terms: fromDiffs(240, [18, 20, 22, 24]), blanks: [4] } },
  15: { key: 'D', confidence: 'high', rule: 'Differences 12, 17, 27 grow by 5, 10, so the next grows by 15: difference 42.', check: { kind: 'missing', terms: fromDiffs(9, fromDiffs(12, [5, 10, 15])), blanks: [4] } },
  16: { key: 'D', confidence: 'high', rule: 'Differences are multiples of 15: +15, +30, +45, +60, +75.', check: { kind: 'missing', terms: fromDiffs(35, [15, 30, 45, 60, 75]), blanks: [5] } },
  17: { key: 'B', confidence: 'high', rule: 'Each term is three times the previous plus 5.', check: { kind: 'missing', terms: iterate(5, 5, (p) => 3 * p + 5), blanks: [4] } },
  18: { key: 'C', confidence: 'high', rule: 'n × (n+1) for n = 5 to 10.', check: { kind: 'missing', terms: range(5, 10).map((n) => n * (n + 1)), blanks: [4] } },
  19: { key: 'B', confidence: 'high', rule: 'Each term is the sum of the two before it.', check: { kind: 'missing', terms: sumOfTwo(6, 7, 7), blanks: [6] } },
  20: { key: 'B', confidence: 'high', rule: 'n² + 1 for n = 5 to 10.', check: { kind: 'missing', terms: range(5, 10).map((n) => n * n + 1), blanks: [4] } },
  21: { key: 'C', confidence: 'high', rule: 'Differences 3, 7, 13, 21, 31 grow by 4, 6, 8, 10; next differences 43 and 57.', check: { kind: 'missing', terms: fromDiffs(13, fromDiffs(3, [4, 6, 8, 10, 12, 14])), blanks: [6] } },
  22: { key: 'D', confidence: 'high', rule: 'Differences come in pairs: +12, +12, +10, +10, +8, +8.', check: { kind: 'missing', terms: fromDiffs(12, [12, 12, 10, 10, 8, 8]), blanks: [5] } },
  23: { key: 'A', confidence: 'high', rule: 'Differences double: +9, +18, +36, +72, +144.', check: { kind: 'missing', terms: fromDiffs(25, [9, 18, 36, 72, 144]), blanks: [3] } },
  24: { key: 'C', confidence: 'high', rule: 'n³ − (n+1) for n = 1 to 7.', check: { kind: 'missing', terms: range(1, 7).map((n) => n ** 3 - (n + 1)), blanks: [6] } },
  25: { key: 'D', confidence: 'high', rule: 'n × (2n − 1) for n = 1 to 7.', check: { kind: 'missing', terms: range(1, 7).map((n) => n * (2 * n - 1)), blanks: [3] } },
  26: {
    key: 'B',
    confidence: 'high',
    rule: 'Differences 7, 7, 14, 40, 103, 227 grow by n³ − 1: 0, 7, 26, 63, 124, so the next grows by 215 to 442.',
    check: { kind: 'missing', terms: fromDiffs(1, fromDiffs(7, range(1, 6).map((n) => n ** 3 - 1))), blanks: [7] },
  },
  27: { key: 'C', confidence: 'high', rule: 'Differences grow by 8: +32, +40, +48, ..., +96.', check: { kind: 'missing', terms: fromDiffs(44, [32, 40, 48, 56, 64, 72, 80, 88, 96]), blanks: [2] } },
  28: { key: 'B', confidence: 'high', rule: 'Differences are multiples of 9: +36, +45, +54, +63, +72, +81, +90.', check: { kind: 'missing', terms: fromDiffs(157, [36, 45, 54, 63, 72, 81, 90]), blanks: [4] } },
  29: {
    key: 'C',
    confidence: 'medium',
    rule: 'Differences 12, 23, 40, 63, 94, 135, 182 grow by every other prime from 11: 11, 17, 23, 31, 41, 47, then 59.',
    note: 'An unusual rule, but it fits all seven second differences exactly and separates 793 from 792.',
    check: { kind: 'missing', terms: fromDiffs(3, fromDiffs(12, [PRIMES[4], PRIMES[6], PRIMES[8], PRIMES[10], PRIMES[12], PRIMES[14], PRIMES[16]])), blanks: [8] },
  },
  30: { key: 'B', confidence: 'high', rule: 'Alternately subtract and add odd numbers: −7, +5, −3, +1.', check: { kind: 'missing', terms: fromDiffs(57, [-7, 5, -3, 1]), blanks: [4] } },
  31: { key: 'B', confidence: 'high', rule: 'n × (n+1) for odd n: 1×2, 3×4, 5×6, 7×8, 9×10, 11×12.', check: { kind: 'missing', terms: [1, 3, 5, 7, 9, 11].map((n) => n * (n + 1)), blanks: [3] } },
  32: { key: 'B', confidence: 'high', rule: 'Differences are multiples of 7: +7, +14, +21, +28, +35.', check: { kind: 'missing', terms: fromDiffs(3, [7, 14, 21, 28, 35]), blanks: [3] } },
  33: { key: 'B', confidence: 'high', rule: 'Differences are even numbers: +2, +4, +6, +8, +10.', check: { kind: 'missing', terms: fromDiffs(20, [2, 4, 6, 8, 10]), blanks: [5] } },
  34: { key: 'D', confidence: 'high', rule: 'Prime numbers.', check: { kind: 'missing', terms: PRIMES.slice(0, 6), blanks: [5] } },
  35: { key: 'A', confidence: 'high', rule: 'Differences are odd numbers: +3, +5, +7, +9, +11, +13.', check: { kind: 'missing', terms: fromDiffs(-4, [3, 5, 7, 9, 11, 13]), blanks: [3] } },
  36: { key: 'B', confidence: 'high', rule: 'Differences alternate between multiples of 12 and of 13: +12, +13, +24, +26, +36, +39, +48, +52.', check: { kind: 'missing', terms: fromDiffs(13, [12, 13, 24, 26, 36, 39, 48, 52]), blanks: [8] } },
  37: { key: 'C', confidence: 'high', rule: 'Differences 23, 34, 67, 122, 199 grow by 11, 33, 55, 77, so the next grows by 99 to 298.', check: { kind: 'missing', terms: fromDiffs(1, fromDiffs(23, [11, 33, 55, 77, 99])), blanks: [6] } },
  38: { key: 'A', confidence: 'high', rule: 'Differences grow by 9: +14, +23, +32, +41, +50.', check: { kind: 'missing', terms: fromDiffs(39, [14, 23, 32, 41, 50]), blanks: [2] } },
  39: { key: 'A', confidence: 'high', rule: 'Differences are n × (n+1): +2, +6, +12, +20.', check: { kind: 'missing', terms: fromDiffs(8, [2, 6, 12, 20]), blanks: [4] } },
  40: { key: 'A', confidence: 'high', rule: 'Add 27 and 23 alternately.', check: { kind: 'missing', terms: fromDiffs(23, [27, 23, 27, 23]), blanks: [4] } },
  41: {
    key: 'B',
    confidence: 'high',
    rule: 'Two series interleaved: 16, 15, 13, 10, 6 (−1, −2, −3, −4) and 2, 4, 7, 11, 16 (+2, +3, +4, +5). The next term belongs to the second.',
    check: { kind: 'missing', terms: [16, 2, 15, 4, 13, 7, 10, 11, 6, 16], blanks: [9] },
  },
  42: { key: 'B', confidence: 'high', rule: 'Differences are even numbers from 6: +6, +8, +10, +12, +14.', check: { kind: 'missing', terms: fromDiffs(5, [6, 8, 10, 12, 14]), blanks: [4] } },
  43: { key: 'D', confidence: 'high', rule: 'Differences are even numbers from 4: +4, +6, +8, +10, +12.', check: { kind: 'missing', terms: fromDiffs(3, [4, 6, 8, 10, 12]), blanks: [5] } },
  44: { key: 'C', confidence: 'high', rule: 'Subtract 111 each time.', check: { kind: 'missing', terms: fromDiffs(975, [-111, -111, -111, -111]), blanks: [4] } },
  45: { key: 'B', confidence: 'high', rule: 'Each term is the sum of the two before it.', check: { kind: 'missing', terms: sumOfTwo(5, 8, 5), blanks: [4] } },
  46: { key: 'D', confidence: 'high', rule: 'Halve, then treble, alternately.', check: { kind: 'missing', terms: iterate(48, 6, (p, i) => (i % 2 ? p / 2 : p * 3)), blanks: [5] } },
  47: { key: 'A', confidence: 'high', rule: 'Differences are odd numbers from 3: +3, +5, +7, +9, +11.', check: { kind: 'missing', terms: fromDiffs(4, [3, 5, 7, 9, 11]), blanks: [4] } },
  48: { key: 'A', confidence: 'high', rule: 'Add 2 each time.', check: { kind: 'missing', terms: [4, 6, 8, 10, 12, 14], blanks: [5] } },
  49: { key: 'D', confidence: 'high', rule: 'Add 5 each time.', check: { kind: 'missing', terms: [17, 22, 27, 32, 37], blanks: [4] } },
  50: { key: 'A', confidence: 'high', rule: 'Subtract 13 each time.', check: { kind: 'missing', terms: [87, 74, 61, 48, 35], blanks: [4] } },
  51: {
    key: 'C',
    confidence: 'high',
    rule: 'The series is the factorials 0! to 8!: 1, 1, 2, 6, 24, 120, 720, 5040, 40320. The first bracket (121) should be 120; the second (5040) is right.',
    direction: 'Study the series and choose the correct option.',
    check: { kind: 'reasoned' },
  },

  // ---------------------------------------------------------------- Type-2: find the wrong number
  52: { key: 'B', confidence: 'high', rule: 'Multiply by 1, 3, 5, 7, 9: the fifth term should be 735.', check: { kind: 'wrong', terms: iterate(7, 6, (p, i) => p * (2 * i - 1)) } },
  53: { key: 'D', confidence: 'high', rule: 'Prime numbers: the last should be 17.', check: { kind: 'wrong', terms: PRIMES.slice(0, 7) } },
  54: { key: 'C', confidence: 'high', rule: '×1+1, ×2+2, ×3+3, ×4+4, ×5+5, ×6+6: the sixth term should be 445.', check: { kind: 'wrong', terms: iterate(1, 7, (p, i) => p * i + i) } },
  55: { key: 'D', confidence: 'high', rule: 'Multiply by 1, 1.5, 2, 2.5, 3, 3.5, 4: the last should be 315.', check: { kind: 'wrong', terms: iterate(1, 8, (p, i) => p * (0.5 + 0.5 * i)) } },
  56: { key: 'C', confidence: 'high', rule: '×2+1, ×2+2, ×2+3, ×2+4, ×2+5: the fifth term should be 762.', check: { kind: 'wrong', terms: iterate(46, 6, (p, i) => 2 * p + i) } },
  57: { key: 'A', confidence: 'high', rule: 'Double each time: the fourth term should be 392.', check: { kind: 'wrong', terms: iterate(49, 6, (p) => 2 * p) } },
  58: { key: 'A', confidence: 'high', rule: 'Multiply by 0.5, 1, 1.5, 2, 2.5: the fifth term should be 45.', check: { kind: 'wrong', terms: iterate(30, 6, (p, i) => p * 0.5 * i) } },
  59: { key: 'B', confidence: 'high', rule: 'Differences double: +16, +32, +64, +128, +256. The fifth term should be 654.', check: { kind: 'wrong', terms: fromDiffs(414, [16, 32, 64, 128, 256]) } },
  60: { key: 'B', confidence: 'high', rule: 'Each term is the product of the two before it: the last should be 18 × 108 = 1944.', check: { kind: 'wrong', terms: productOfTwo(1.5, 2, 7) } },
  61: {
    key: 'B',
    confidence: 'high',
    rule: 'Groups of three, each double the last: (3, 5, 7), (6, 10, 14), (12, 20, 28), (24, 40, 56). The 24 in the third group should be 20.',
    note: '24 is printed twice; the wrong one is the eighth term, not the tenth.',
    check: { kind: 'wrong', terms: [3, 5, 7, 6, 10, 14, 12, 20, 28, 24, 40, 56] },
  },
  62: { key: 'B', confidence: 'high', rule: 'Add 4 and halve alternately: the last should be 33.', check: { kind: 'wrong', terms: iterate(104, 6, (p, i) => (i % 2 ? p + 4 : p / 2)) } },
  63: { key: 'C', confidence: 'high', rule: 'Cubes of 1 to 9: the seventh should be 343.', check: { kind: 'wrong', terms: range(1, 9).map((n) => n ** 3) } },
  64: { key: 'A', confidence: 'high', rule: 'Each term is the product of the two before it: the last should be 18 × 108 = 1944.', check: { kind: 'wrong', terms: productOfTwo(2, 3, 6) } },
  65: {
    key: 'D',
    confidence: 'medium',
    rule: '×0.5+1, ×1+1, ×1.5+1, ×2+1, ×2.5+1: the last should be 518.5.',
    note: 'The rule fits the first five terms exactly and puts the last at 518.5, so 518 is wrong by half. A book might intend a different rule; check against its key.',
    check: { kind: 'wrong', terms: iterate(132, 6, (p, i) => p * 0.5 * i + 1) },
  },
  66: { key: 'B', confidence: 'high', rule: 'Multiply by 0.5, 1.5, 2.5, 3.5: the fourth term should be 82.5.', check: { kind: 'wrong', terms: iterate(44, 5, (p, i) => p * (i - 0.5)) } },
  67: { key: 'B', confidence: 'high', rule: 'Each term is the sum of the two before it: the second should be 34.', check: { kind: 'wrong', terms: sumOfTwo(68, 34, 6) } },
  68: { held: true, lean: 'C', reason: 'Printed 306 breaks the series. Read as 36 it is 6⁴, 6³, 6², 6¹ and the answer is 6 (C); as printed no option fits.' },
  69: { held: true, lean: 'A', reason: '×5+1, ×4+1, ×3+1 gives 3676 (A), but the printed 7553 is not 3676 × 2 + 1 = 7353, and 69 → 61 fits no step. Too many printed numbers disagree to key it.' },
  70: { key: 'B', confidence: 'high', rule: 'Add and subtract squares in turn: +11², −12², +13², −14², +15².', note: 'Printed under "find the wrong number" but asks for the next term.', direction: 'Find the missing number in the given series.', check: { kind: 'missing', terms: fromDiffs(100, [121, -144, 169, -196, 225]), blanks: [5] } },
  71: { held: true, reason: '28, 51, 100, 151: no rule found that fits the four printed terms and any option. Waiting for the book key.' },
  72: { key: 'B', confidence: 'high', rule: 'Multiply by 2, 3, 4, 5: the third term should be 108.', check: { kind: 'wrong', terms: iterate(18, 5, (p, i) => p * (i + 1)) } },
  73: {
    key: 'D',
    confidence: 'high',
    rule: 'Add 4 and double alternately: 15, 19, 38, 42, 84, 88.',
    note: 'Printed under "find the wrong number" with no "?", but no printed term is wrong and the options are candidates for the next term. Presented with ", ?" added.',
    stemFix: '15, 19, 38, 42, 84, ?',
    direction: 'Find the missing number in the given series.',
    check: { kind: 'missing', terms: iterate(15, 6, (p, i) => (i % 2 ? p + 4 : p * 2)), blanks: [5] },
  },
  74: {
    key: 'A',
    confidence: 'medium',
    rule: 'Differences come in pairs: −2, −2, −3, −3, so the series is 28, 26, 24, 21, 18 and 10 is wrong.',
    note: 'The only option whose correction gives a clean pattern.',
    check: { kind: 'wrong', terms: fromDiffs(28, [-2, -2, -3, -3]) },
  },

  // ---------------------------------------------------------------- Type-3: complete the letter series
  75: { key: 'D', confidence: 'high', rule: '"abbc" repeated.', check: { kind: 'fill', template: 'abb_abbcabbcabbca_bcabbca_bc_bbc', period: 4 } },
  76: { key: 'B', confidence: 'high', rule: '"ppqqrrss" repeated.', check: { kind: 'fill', template: 'p_qqrrssppq_rrssppqqrrssppqqr_s_', period: 8 } },
  77: { key: 'B', confidence: 'high', rule: '"ddeeffgg" repeated.', check: { kind: 'fill', template: 'd_eeffggddeeffggdde_ffggddeeffggddeef_g_', period: 8 } },
  78: { held: true, lean: 'D', reason: 'The print has a "×" in the series, and no option completes a repeating pattern whether it is read as X or dropped. D gives "C2XX2C" twice and then "X2C".' },
  79: { key: 'B', confidence: 'high', rule: '"PSRQ" repeated.', check: { kind: 'fill', template: 'P_RQPS__P__Q_SR_P_RQ', period: 4 } },
  80: { key: 'B', confidence: 'high', rule: '"PEOPLE" repeated.', check: { kind: 'fill', template: 'PE__LEP__PLE__OP__', period: 6 } },
  81: { key: 'C', confidence: 'high', rule: '"SONATA" repeated.', check: { kind: 'fill', template: 'SO__TAS__ATA__NAT__ONA__', period: 6 } },
  82: { key: 'C', confidence: 'high', rule: '"surck" repeated.', check: { kind: 'fill', template: 's_r_ks__ck_urc_su_c_', period: 5 } },
  83: { key: 'A', confidence: 'high', rule: '"xzxxyz" repeated.', check: { kind: 'fill', template: 'xzx_yzx__xyzxz__yz', period: 6 } },
  84: { key: 'A', confidence: 'high', rule: '"WXATQ" repeated.', check: { kind: 'fill', template: 'W_AT_WX__Q__ATQ', period: 5 } },
  85: { key: 'C', confidence: 'high', rule: '"PRODUCT" repeated.', check: { kind: 'fill', template: 'PR__UC__RODU__PROD__T', period: 7 } },
  86: { key: 'B', confidence: 'high', rule: '"bbyt" repeated.', check: { kind: 'fill', template: 'b_y__by_b_yt', period: 4 } },
  87: {
    key: 'A',
    confidence: 'high',
    rule: 'Groups of 1, 2, 3, 4, 5, 6 consecutive letters, skipping one letter between groups.',
    check: {
      kind: 'next',
      sequence: (() => {
        const abc = 'abcdefghijklmnopqrstuvwxyz';
        const out: string[] = [];
        let at = 0;
        for (let size = 1; size <= 6; size++) {
          out.push(abc.slice(at, at + size));
          at += size + 1;
        }
        return out;
      })(),
    },
  },
  88: {
    key: 'D',
    confidence: 'high',
    rule: 'Groups of four: odd letter, Z, even letter, Y. AZBY, CZDY, EZFY, GZHY, IZJY.',
    check: { kind: 'fill', template: 'A_BYCZ_Y_ZFYGZH_IZ_Y', expected: [0, 1, 2, 3, 4].map((k) => `${shift('A', 2 * k)}Z${shift('B', 2 * k)}Y`).join('') },
  },
  89: {
    key: 'C',
    confidence: 'high',
    rule: 'Groups of four: a letter pair, S, a letter; each group moves 5 letters on. EFSH, JKSM, OPSR, TUSW, YZSB.',
    check: { kind: 'fill', template: 'EFS_JK_MOPSR_US_YZ_B', expected: [0, 1, 2, 3, 4].map((k) => `${shift('E', 5 * k)}${shift('F', 5 * k)}S${shift('H', 5 * k)}`).join('') },
  },
  90: { key: 'B', confidence: 'high', rule: '"KKL" repeated.', check: { kind: 'fill', template: '_KL_K_KK__KL', period: 3 } },
  91: {
    key: 'A',
    confidence: 'high',
    rule: 'Groups of four with K second; the other three letters each move 5 back per group. BKZY, WKUT, RKPO, MKKJ, HKFE.',
    check: { kind: 'fill', template: 'BK_Y_KUTR_POMKK_HK_E', expected: [0, 1, 2, 3, 4].map((k) => `${shift('B', -5 * k)}K${shift('Z', -5 * k)}${shift('Y', -5 * k)}`).join('') },
  },
  92: {
    key: 'B',
    confidence: 'high',
    rule: 'FGHI rotated left one place each time: FGHI, GHIF, HIFG, IFGH, then F.',
    check: { kind: 'fill', template: 'FGHIG_IF_IF_I_GHF', expected: 'FGHIGHIFHIFGIFGHF' },
  },
  93: { held: true, reason: 'No option completes a pattern found in DEFD_F_DEFD_DE_DEFD. Waiting for the book key.' },
  94: {
    key: 'B',
    confidence: 'high',
    rule: 'WXYZ rotated right one place each time: WXYZ, ZWXY, YZWX, XYZW, then W.',
    check: { kind: 'fill', template: 'WXYZ_WXY_Z_XX_ZWW', expected: 'WXYZZWXYYZWXXYZWW' },
  },
  95: {
    key: 'A',
    confidence: 'high',
    rule: 'Groups YRG + a letter stepping back: YRGT, YRGS, YRGR, YRGQ.',
    check: { kind: 'fill', template: 'YR_TYRG_YRGR_RG_', expected: ['T', 'S', 'R', 'Q'].map((l) => `YRG${l}`).join('') },
  },
  96: { key: 'B', confidence: 'high', rule: '"CRICKET" repeated.', check: { kind: 'fill', template: 'C_I_KE__RI__ET__IC_ETCR_CK__', period: 7 } },
  97: { key: 'C', confidence: 'high', rule: '"TSOPM" repeated.', check: { kind: 'fill', template: 'TS__MTS_P_T_OP__SO_M', period: 5 } },
  98: {
    key: 'C',
    confidence: 'high',
    rule: 'Letters repeated 1, 2, 3, 4 times, twice over: A BB CCC DDDD, E FF GGG HHHH.',
    check: { kind: 'fill', template: 'AB_CCC_DDDEF_GGGH_HH', expected: 'ABBCCCDDDDEFFGGGHHHH' },
  },
  99: { key: 'A', confidence: 'high', rule: '"BAJMQ" repeated (the series starts mid-block).', check: { kind: 'fill', template: '_M_BAJMQ_A_MQB_J__B_', period: 5 } },
  100: { key: 'D', confidence: 'high', rule: '"BLEESSED" repeated.', check: { kind: 'fill', template: 'B_EES_ED_LE__SEDB_EESSE_', period: 8 } },
  101: { key: 'C', confidence: 'high', rule: '"1221" repeated.', check: { kind: 'fill', template: '12_1_221_2_1', period: 4 } },
  102: { held: true, reason: 'No option completes a pattern found in P_RPRQR_QPRP__Q. Waiting for the book key.' },
  103: { key: 'C', confidence: 'high', rule: '"cabbac" repeated (the dashes are the blanks).', check: { kind: 'fill', template: 'c_bba_cab_ac_ab_ac', period: 6 } },
  104: {
    key: 'B',
    confidence: 'medium',
    rule: 'Blocks of four in which the doubled letter moves right: ccdb, cddb, cdbb, then ccd(b) again.',
    note: 'Not a plain repeat; B is the only option that gives this structure.',
    check: { kind: 'fill', template: '_cdb_ddb_db_c_d', expected: 'ccdbcddbcdbbccd' },
  },
  105: {
    key: 'C',
    confidence: 'high',
    rule: 'Groups of four: a pair from the start of the alphabet (AB, CD, EF, GH, IJ) and a pair from the end (YZ, WX, UV, ST, QR).',
    check: { kind: 'fill', template: 'AB_ZC_WX_FUVGH_TI_QR', expected: [0, 1, 2, 3, 4].map((k) => `${shift('A', 2 * k)}${shift('B', 2 * k)}${shift('Y', -2 * k)}${shift('Z', -2 * k)}`).join('') },
  },
  106: { key: 'A', confidence: 'high', rule: '"thnsor" repeated.', check: { kind: 'fill', template: 't_ns_rth_so_th_s_r', period: 6 } },
  107: { key: 'B', confidence: 'high', rule: '"rmsktp" repeated.', check: { kind: 'fill', template: '_msk_prm_kt_r_s_tpr_skt_', period: 6 } },
  108: {
    key: 'D',
    confidence: 'medium',
    rule: '"prnjlc" repeated.',
    note: 'The photo shows "jicp" where the pattern needs "jlcp"; read as l. Only D fits either way.',
    check: { kind: 'fill', template: 'p_nj_c_r_jlcp_njl_pr__lc', period: 6, misread: 1 },
  },
  109: {
    key: 'C',
    confidence: 'high',
    rule: 'Blocks growing by one of each letter: cc d p, ccc dd pp, cccc ddd ppp.',
    check: { kind: 'fill', template: 'ccd_cc_d_ppccccddd__p', expected: [2, 3, 4].map((n) => 'c'.repeat(n) + 'd'.repeat(n - 1) + 'p'.repeat(n - 1)).join('') },
  },
  110: { key: 'D', confidence: 'high', rule: '"jtmprs" repeated.', check: { kind: 'fill', template: 'jtm_r_jt_prs_tmpr_j_mprs', period: 6 } },
  111: { key: 'C', confidence: 'high', rule: '"xyxz" repeated.', check: { kind: 'fill', template: 'xy_zx_xzxy__', period: 4 } },
  112: {
    key: 'C',
    confidence: 'high',
    rule: 'A, AB, ABC, ABCD, ABCDE.',
    check: { kind: 'fill', template: 'AA_AB_ABC_A_C_E', expected: [1, 2, 3, 4, 5].map((n) => ALPHABET.slice(0, n)).join('') },
  },
  113: { key: 'C', confidence: 'high', rule: '"aabbcdee" repeated.', check: { kind: 'fill', template: 'a__bcde__abbcd__aabb__ee', period: 8 } },
  114: { key: 'A', confidence: 'high', rule: '"gpctdawpmz" repeated.', check: { kind: 'fill', template: 'g_ctd_wpmz_pctdawp_zgpct_a_pmz', period: 10 } },
  115: { key: 'B', confidence: 'high', rule: '"klmpnb" repeated.', check: { kind: 'fill', template: 'kl_pn_klmp_b_lm_nbk_mpnb', period: 6 } },
  116: { key: 'A', confidence: 'high', rule: '"aabccdee" repeated.', check: { kind: 'fill', template: '__bc___eaa__cde__abc___ea___cdee', period: 8 } },
  117: { key: 'C', confidence: 'high', rule: '"aabccdee" repeated.', check: { kind: 'fill', template: 'a__ccde___bc___eaabc____aabc__ee', period: 8 } },
  118: { key: 'D', confidence: 'high', rule: '"abccdde" repeated.', check: { kind: 'fill', template: 'abcc___ab___de__ccd_eab___de', period: 7 } },
  119: { key: 'D', confidence: 'high', rule: 'C moves through BABABAB two places at a time, wrapping: positions 0, 2, 4, 6, 1, then 3.', check: { kind: 'next', sequence: moving('BABABAB', 'C', [0, 2, 4, 6, 1, 3]) } },
  120: { key: 'D', confidence: 'high', rule: 'The second Y moves one place left each time.', check: { kind: 'next', sequence: moving('YXXXXXX', 'Y', [7, 6, 5, 4, 3, 2]) } },
  121: { key: 'B', confidence: 'high', rule: 'A lower-case pair moves one place left through ABCABCABC each time.', check: { kind: 'next', sequence: lowered('ABCABCABC', 2, [5, 4, 3, 2, 1, 0]) } },
  122: { key: 'B', confidence: 'high', rule: 'A lower-case letter moves one place left through ABCABCABC each time.', check: { kind: 'next', sequence: lowered('ABCABCABC', 1, [5, 4, 3, 2, 1, 0]) } },
  123: { held: true, reason: 'The print shows four blanks but every option has five letters, and no option completes a pattern either way.' },
  124: { key: 'B', confidence: 'high', rule: '"PSJA" repeated.', check: { kind: 'fill', template: '_SJ_PS__P_JA_S_A', period: 4 } },
  125: { key: 'B', confidence: 'high', rule: '"LML" repeated.', check: { kind: 'fill', template: 'L__LM_L_L_ML', period: 3 } },
};
