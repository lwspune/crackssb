import { evaluate, holds, substitute, swapIn } from './check.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 13 "Mathematical
 * Oprations" [sic] (pages 49-52). Every answer is worked out below: a coded
 * sum is read through its legend and evaluated (brackets, then × and ÷, then
 * + and −); a "which swap" answer is the one printed option that balances the
 * equation, every other option tried and refused; a number system is first
 * run on the book's own examples, and the file fails to load if they do not
 * come out. Shipped with `key_basis = 'derived'` until the book's key is
 * compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch13-mathematical-operations.source.json
 */

const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;

/** A number as the book prints it: −2, not -2. */
const num = (x: number) => (x < 0 ? `−${-x}` : String(x));

/** A sum with its signs read through a legend. */
const read = (expr: string, legend: Readonly<Record<string, string>> = {}) => evaluate(substitute(expr, legend));

const SWAP_ALL = { '+': '−', '−': '+', '×': '÷', '÷': '×' } as const;

function only<T>(options: readonly T[], fits: (o: T) => boolean, what: string): T {
  const hits = options.filter(fits);
  if (hits.length !== 1) throw new Error(`${what}: ${hits.length} options fit, not one`);
  return hits[0];
}

/**
 * The one printed option ("× and +", or "2 and 7, + and −") whose swap
 * balances the equation. Every option is tried; throws unless exactly one works.
 */
function onlySwap(equation: string, options: readonly string[]): string {
  return only(
    options,
    (o) => {
      const m = o.match(/^(?:(\d+) and (\d+),?\s*)?(\S)\s*and\s*(\S)\.?$/);
      if (!m) throw new Error(`cannot read the swap "${o}"`);
      return holds(swapIn(equation, [m[3], m[4]], m[1] ? [m[1], m[2]] : undefined));
    },
    equation,
  );
}

/** The one printed equation that holds once read through `transform`. */
const onlyTrue = (options: readonly string[], transform: (eq: string) => string) => only(options, (o) => holds(transform(o)), options[0]);

/** The one sign sequence ("−, +, ÷, ×, =") that, put in place of each *, balances the equation. */
function onlyFill(template: string, options: readonly string[]): string {
  return only(
    options,
    (o) => {
      const signs = o.split(/[,\s]+/).filter(Boolean);
      let i = 0;
      return holds(template.replace(/\*/g, () => signs[i++]));
    },
    template,
  );
}

/** A coded legend checked on the book's own examples, then applied to the question. */
function legend(map: Readonly<Record<string, string>>, examples: readonly (readonly [string, number])[], target: string): number {
  for (const [expr, want] of examples) {
    const got = read(expr, map);
    if (got !== want) throw new Error(`legend gives ${got} for "${expr}", the book ${want}`);
  }
  return read(target, map);
}

/** A number rule checked on the book's own examples, then applied to the question. */
function rule(fn: (...xs: number[]) => number, examples: readonly (readonly [readonly number[], number])[], target: readonly number[]): number {
  for (const [xs, want] of examples) {
    const got = fn(...xs);
    if (got !== want) throw new Error(`rule gives ${got} for ${xs.join(', ')}, the book ${want}`);
  }
  return fn(...target);
}

/** The one whole number up to 10,000 that `fn` sends to `want`: a missing term inside the brackets. */
function solveFor(fn: (x: number) => number, want: number): number {
  return only(Array.from({ length: 10001 }, (_, i) => i), (x) => fn(x) === want, `solve for ${want}`);
}

const digits = (...ns: number[]) => ns.flatMap((n) => [...String(n)].map(Number));
const digitSum = (...ns: number[]) => digits(...ns).reduce((s, d) => s + d, 0);
const digitProduct = (...ns: number[]) => digits(...ns).reduce((p, d) => p * d, 1);

/** Both expressions after a swap, as the book's options print the pair. */
const pair = (a: string, b: string, signs: readonly [string, string]) => `${evaluate(swapIn(a, signs))} and ${evaluate(swapIn(b, signs))}`;

const GLYPH =
  'In the photo this ÷ prints like + (its dots too faint to see); only the ÷ reading gives an answer among the options, so it is transcribed that way. Check against the book key.';

export const AGRAWAL_CH13_MATHEMATICAL_OPERATIONS: Readonly<Record<number, KeyEntry>> = {
  1: { key: 'B', confidence: 'high', rule: 'Swapped: 18 × 3 − 4 ÷ 2 + 7 = 59 and 18 ÷ 3 × 6 − 8 + 4 = 32.', check: computed(pair('18 ÷ 3 − 4 × 2 + 7', '18 × 3 ÷ 6 − 8 + 4', ['×', '÷'])) },
  2: {
    key: 'A',
    confidence: 'high',
    rule: 'Swapped, A reads 23 − 20 + 35 × 2 ÷ 10 = 3 + 7 = 10. The others come to 28, 11 and 20.',
    check: computed(onlyTrue(['23 − 20 + 35 ÷ 2 × 10 = 10', '9 × 3 + 8 ÷ 4 − 7 = 30', '32 + 3 − 12 ÷ 18 × 9 = 10', '11 ÷ 12 × 6 + 8 − 10 = 25'], (eq) => swapIn(eq, ['÷', '×']))),
  },
  3: { key: 'D', confidence: 'high', rule: '26 × 2 ÷ 4 − 8 + 25 = 13 − 8 + 25 = 30.', check: computed(onlySwap('26 + 2 ÷ 4 − 8 × 25 = 30', ['× and ÷', '× and −', '+ and ÷', '× and +'])) },
  4: {
    key: 'A',
    confidence: 'high',
    rule: 'Swapped, I is 5 + 6 ÷ 2 − 4 × 1 = 4, not 10, and II is 9 ÷ 3 − 4 × 2 + 5 = 0, not 4. Neither holds.',
    check: computed(
      (() => {
        const [i, ii] = ['5 + 6 × 2 − 4 ÷ 1 = 10', '9 × 3 − 4 ÷ 2 + 5 = 4'].map((eq) => holds(swapIn(eq, ['×', '÷'])));
        return i && ii ? 'Both I and II' : i ? 'Only I' : ii ? 'Only II' : 'Neither I nor II';
      })(),
    ),
  },
  5: { key: 'B', confidence: 'high', rule: '5 − 2 × 4 + 9 ÷ 3 = 5 − 8 + 3 = 0.', check: computed(onlySwap('5 − 2 ÷ 4 + 9 × 3 = 0', ['− and ÷', '× and ÷', '= and ×', '+ and −'])) },
  6: { key: 'D', confidence: 'high', rule: '12 − 6 × 2 + 24 ÷ 8 = 12 − 12 + 3 = 3.', check: computed(onlySwap('12 + 6 × 2 − 24 ÷ 8 = 3', ['× and −', '− and =', '÷ and −', '+ and −'])) },
  7: { key: 'D', confidence: 'high', rule: 'Swapped: 8 + 4 − 6 ÷ 3 × 5 = 2 and 20 + 15 ÷ 30 × 10 = 25.', check: computed(pair('8 + 4 − 6 × 3 ÷ 5', '20 + 15 × 30 ÷ 10', ['×', '÷'])) },
  8: { key: 'D', confidence: 'high', rule: 'Swapped: 7 + 8 × 2 ÷ 4 − 6 = 5 and 16 ÷ 4 + 13 × 2 − 3 = 27.', check: computed(pair('7 + 8 ÷ 2 × 4 − 6', '16 × 4 + 13 ÷ 2 − 3', ['×', '÷'])) },
  9: { key: 'C', confidence: 'high', rule: '(9 × 3 + 169 ÷ 13) × 5 − 10 + 16 = 40 × 5 + 6 = 206.', check: computed(onlySwap('(9 ÷ 3 + 169 × 13) ÷ 5 − 10 + 16 = 206', ['+ and −', '× and −', '÷ and ×', '+ and ×'])) },
  10: { key: 'B', confidence: 'high', rule: '40 × 14 ÷ 35 − 30 + 15 = 16 − 30 + 15 = 1.', check: computed(onlySwap('40 + 14 ÷ 35 − 30 × 15 = 1', ['+ and ÷', '+ and ×', '+ and −', '− and +'])) },
  11: { key: 'D', confidence: 'high', rule: '360 ÷ 9 − 320 + 72 × 5 = 40 − 320 + 360 = 80.', check: computed(onlySwap('360 × 9 − 320 + 72 ÷ 5 = 80', ['+ and ÷', '+ and ×', '− and ÷', '× and ÷'])) },
  12: { key: 'B', confidence: 'high', rule: '25 ÷ 5 × 6 + 20 = 50 = 62 − 12.', check: computed(onlySwap('25 × 5 ÷ 6 + 20 = 62 − 12', ['+ and ÷', '÷ and ×', '+ and −', '+ and ×'])) },
  13: { key: 'A', confidence: 'high', rule: '200 ÷ 5 × 3 − 20 + 5 = 120 − 20 + 5 = 105.', check: computed(read('200 & 5 @ 3 $ 20 # 5', { '#': '+', '@': '×', '&': '÷', $: '−' })) },
  14: { key: 'B', confidence: 'high', rule: '4 × (3 + 1) − 5 + (6 ÷ 2) − 7 = 16 − 5 + 3 − 7 = 7.', check: computed(read('4 D (3 A 1) C 5 A (6 B 2) C 7', { A: '+', B: '÷', C: '−', D: '×' })) },
  15: { key: 'B', confidence: 'medium', rule: '54 × 11 ÷ 99 + 23 − 14 = 6 + 23 − 14 = 15.', note: `P means ÷. ${GLYPH}`, check: computed(read('54 R 11 P 99 Q 23 S 14', { P: '÷', Q: '+', R: '×', S: '−' })) },
  16: {
    key: 'B',
    confidence: 'medium',
    rule: '(15 × 10) + (130 ÷ 10) − 50 = 150 + 13 − 50 = 113.',
    note: `The legend prints "'+' means '÷'" twice; the second is read as ÷ means +, and the sign between the brackets as ÷. ${GLYPH}`,
    check: computed(read('(15 − 10) ÷ (130 + 10) × 50', { '×': '−', '−': '×', '+': '÷', '÷': '+' })),
  },
  17: { key: 'D', confidence: 'medium', rule: '20 + 60 − 40 × 20 ÷ 10 = 80 − 80 = 0.', note: `The legend's first sign is ÷. ${GLYPH}`, check: computed(read('20 × 60 ÷ 40 − 20 + 10', { '÷': '−', '−': '×', '×': '+', '+': '÷' })) },
  18: { key: 'D', confidence: 'high', rule: '(14 × 2) + (16 ÷ 4) − 12 = 28 + 4 − 12 = 20.', check: computed(read('(14 ÷ 2) − (16 × 4) + 12', SWAP_ALL)) },
  19: { key: 'C', confidence: 'high', rule: '7 − 5 + (16 ÷ 8 × 9) = 2 + 18 = 20.', check: computed(onlyFill('7 * 5 * (16 * 8 * 9) * 20', ['÷, −, ×, +, =', '−, +, ×, ÷, =', '−, +, ÷, ×, =', '+, ×, ÷, −, ='])) },
  20: { key: 'D', confidence: 'high', rule: '143 + 42 ÷ 7 × 8 − 21 = 143 + 48 − 21 = 170.', check: computed(read('143 − 42 × 7 ÷ 8 + 21', SWAP_ALL)) },
  21: {
    key: 'A',
    confidence: 'medium',
    rule: '(18 × 10 + 20) ÷ 8 − 6 = 200 ÷ 8 − 6 = 19.',
    note: `The legend reads − means ÷ and ÷ means −. ${GLYPH}`,
    check: computed(read('(18 + 10 × 20) − 8 ÷ 6', { '+': '×', '−': '÷', '×': '+', '÷': '−' })),
  },
  22: { key: 'B', confidence: 'medium', rule: '36 × 17 − 59 + 224 ÷ 7 = 612 − 59 + 32 = 585.', note: `A stands for ÷. ${GLYPH}`, check: computed(read('36 B 17 D 59 C 224 A 7', { A: '÷', B: '×', C: '+', D: '−' })) },
  23: { key: 'A', confidence: 'high', rule: '3 × 6 − 18 + 4 ÷ 2 = 18 − 18 + 2 = 2.', check: computed(onlySwap('3 − 6 × 18 + 4 ÷ 2 = 2', ['× and −', '× and ÷', '− and ÷', '× and +'])) },
  24: { key: 'B', confidence: 'high', rule: '36 − 14 + 63 ÷ 9 × 11 = 22 + 77 = 99.', check: computed(onlySwap('36 − 14 × 63 ÷ 9 + 11 = 99', ['+ and −', '× and +', '× and ÷', '× and −'])) },
  25: { key: 'D', confidence: 'high', rule: '18 × 16 − 246 ÷ 6 + 98 = 288 − 41 + 98 = 345.', check: computed(onlySwap('18 + 16 − 246 ÷ 6 × 98 = 345', ['÷ and −', '× and ÷', '+ and −', '+ and ×'])) },
  26: {
    key: 'B',
    confidence: 'high',
    rule: '176 ÷ 16 + 33 × 6 − 200 = 11 + 198 − 200 = 9.',
    note: 'The book asks which two "numbers" should be interchanged; its options are signs, and the question is answered as signs.',
    check: computed(onlySwap('176 − 16 + 33 × 6 ÷ 200 = 9', ['÷ and ×', '− and ÷', '+ and ×', '+ and ÷'])),
  },
  27: { key: 'B', confidence: 'high', rule: '570 × 8 ÷ 240 + 75 − 15 = 19 + 60 = 79.', check: computed(onlySwap('570 × 8 − 240 + 75 ÷ 15 = 79', ['+ and −', '÷ and −', '× and ÷', '+ and ×'])) },
  28: { key: 'B', confidence: 'high', rule: '42 − 23 + 870 × 3 ÷ 5 = 19 + 522 = 541.', check: computed(onlySwap('42 ÷ 23 + 870 × 3 − 5 = 541', ['+ and −', '÷ and −', '× and ÷', '+ and ×'])) },
  29: { key: 'B', confidence: 'medium', rule: '625 ÷ 5 + 93 − 22 × 8 = 125 + 93 − 176 = 42.', note: `The last sign of the equation is ÷. ${GLYPH}`, check: computed(onlySwap('625 × 5 + 93 − 22 ÷ 8 = 42', ['× and −', '× and ÷', '÷ and +', '+ and −'])) },
  30: { key: 'A', confidence: 'medium', rule: '36 + 4 ÷ 2 × 20 − 54 = 36 + 40 − 54 = 22.', note: `The second sign of the equation is ÷. ${GLYPH}`, check: computed(onlySwap('36 × 4 ÷ 2 + 20 − 54 = 22', ['+ and ×', '− and +', '× and −', '÷ and −'])) },
  31: { key: 'D', confidence: 'high', rule: '(35 − 2) ÷ 3 = 11 and (56 ÷ 8 × 3 + 100) ÷ 11 = 121 ÷ 11 = 11.', check: computed(onlySwap('(35 − 2) × 3 = (56 × 8 ÷ 3 + 100) × 11', ['× and −', '÷ and +', '+ and −', '× and ÷'])) },
  32: { key: 'C', confidence: 'high', rule: '87 ÷ 3 + 39 − 67 × 3 = 29 + 39 − 201 = −133.', check: computed(onlySwap('87 − 3 + 39 ÷ 67 × 3 = −133', ['× and +', '− and +', '÷ and −', '× and −'])) },
  33: {
    key: 'C',
    confidence: 'medium',
    rule: '× means ÷ and − means +: 85 ÷ 5 + 3 = 20 and 18 ÷ 2 + 1 = 10. So 100 ÷ 20 + 5 = 10.',
    note: 'The examples fix × as ÷ and − as +, and + stays +. Unusual for a legend to send two signs to one.',
    check: computed(legend({ '×': '÷', '−': '+' }, [['85 × 5 − 3', 20], ['18 × 2 + 1', 10]], '100 × 20 + 5')),
  },
  34: { key: 'B', confidence: 'high', rule: 'The sum of all four digits: 1 + 4 + 1 + 3 = 9, 2 + 7 + 3 + 6 = 18. So 4 + 6 + 3 + 1 = 14.', check: computed(rule(digitSum, [[[14, 13], 9], [[27, 36], 18]], [46, 31])) },
  35: {
    key: 'C',
    confidence: 'high',
    rule: 'Write the middle number, then the last, then the first: 13|7|11, 14|6|4. So 6|13|12 = 61312.',
    check: computed(rule((a, b, c) => Number(`${b}${c}${a}`), [[[11, 13, 7], 13711], [[4, 14, 6], 1464]], [12, 6, 13])),
  },
  36: { key: 'A', confidence: 'high', rule: 'L means × and A means ÷: 14 × 7 ÷ 2 = 49, 18 × 4 ÷ 2 = 36. So 15 × 5 ÷ 3 = 25.', check: computed(legend({ L: '×', A: '÷' }, [['14 L 7 A 2', 49], ['18 L 4 A 2', 36]], '15 L 5 A 3')) },
  37: { key: 'A', confidence: 'high', rule: '× means +: 53 + 61 + 9 = 123, 34 + 43 + 24 = 101. So 41 + 16 + 71 = 128.', check: computed(legend({ '×': '+' }, [['53 × 61 × 9', 123], ['34 × 43 × 24', 101]], '41 × 16 × 71')) },
  38: { key: 'C', confidence: 'high', rule: '# means × and @ means +: 14 × 3 + 4 = 46, 19 × 4 + 3 = 79. So 21 × 4 + 1 = 85.', check: computed(legend({ '#': '×', '@': '+' }, [['14 # 3 @ 4', 46], ['19 # 4 @ 3', 79]], '21 # 4 @ 1')) },
  39: { key: 'D', confidence: 'high', rule: '# means ×: 19 + 4 × 5 = 39, 21 × 5 + 6 = 111. So 11 + 15 × 5 = 86.', check: computed(legend({ '#': '×' }, [['19 + 4 # 5', 39], ['21 # 5 + 6', 111]], '11 + 15 # 5')) },
  40: { key: 'B', confidence: 'high', rule: 'L means + and A means ×: 13 + 4 × 7 = 41, 14 × 3 + 12 = 54. So 12 + 3 × 9 = 39.', check: computed(legend({ L: '+', A: '×' }, [['13 L 4 A 7', 41], ['14 A 3 L 12', 54]], '12 L 3 A 9')) },
  41: { key: 'B', confidence: 'high', rule: 'The square plus one: 12² + 1 = 145, 15² + 1 = 226. So 24² + 1 = 577.', check: computed(rule((a, b) => a ** b + 1, [[[12, 2], 145], [[15, 2], 226]], [24, 2])) },
  42: { key: 'B', confidence: 'high', rule: 'A means −: 27 − 11 − 8 = 8, 48 − 37 − 2 = 9. So 56 − 5 − 3 = 48.', check: computed(legend({ A: '−' }, [['27 A 11 A 8', 8], ['48 A 37 A 2', 9]], '56 A 5 A 3')) },
  43: { key: 'D', confidence: 'high', rule: '@ means + and # means −: 13 + 2 − 5 = 10, 43 − 9 + 16 = 50. So 8 + 6 − 3 = 11.', check: computed(legend({ '@': '+', '#': '−' }, [['13 @ 2 # 5', 10], ['43 # 9 @ 16', 50]], '8 @ 6 # 3')) },
  44: {
    held: true,
    reason: 'The examples fit a $ b = −(a ÷ b) (−10, −10, −5), which makes 10 $ 22 = −5/11, not an option; no other rule found fits all three examples and lands on an option.',
  },
  45: { key: 'D', confidence: 'high', rule: 'The product, sign flipped: −(5 × 5) = −25, −(−4 × −3) = −12, −(3 × −3) = 9. So −(4 × 5) = −20.', check: computed(num(rule((a, b) => -(a * b), [[[5, 5], -25], [[-4, -3], -12], [[3, -3], 9]], [4, 5]))) },
  46: { key: 'D', confidence: 'high', rule: 'Twice the difference: 2 × (11 − 8) = 6, 2 × 12 = 24, 2 × 8 = 16. So 2 × (12 − 9) = 6.', check: computed(rule((a, b) => 2 * (a - b), [[[11, 8], 6], [[19, 7], 24], [[14, 6], 16]], [12, 9])) },
  47: { key: 'C', confidence: 'high', rule: 'Twice the sum: 2 × (7 + 8) = 30, 2 × 7 = 14, 2 × 13 = 26. So 2 × (1 + 8) = 18.', check: computed(rule((a, b) => 2 * (a + b), [[[7, 8], 30], [[4, 3], 14], [[4, 9], 26]], [1, 8])) },
  48: { key: 'D', confidence: 'high', rule: 'The product, sign flipped: −(−2 × −4) = −8, −(−1 × −8) = −8, −(−1 × 6) = 6. So −(−1 × 7) = 7.', check: computed(rule((a, b) => -(a * b), [[[-2, -4], -8], [[-1, -8], -8], [[-1, 6], 6]], [-1, 7])) },
  49: { key: 'A', confidence: 'high', rule: 'The square of the difference: (21 − 14)² = 49, (159 − 146)² = 169. So (56 − 44)² = 144.', check: computed(rule((a, b) => (a - b) ** 2, [[[21, 14], 49], [[159, 146], 169]], [56, 44])) },
  50: { key: 'B', confidence: 'high', rule: '# means + and @ means −: 8 + 64 − 27 = 45, 27 + 125 − 64 = 88. So 64 + 8 − 1 = 71.', check: computed(rule((a, b, c) => a ** 3 + b ** 3 - c ** 3, [[[2, 4, 3], 45], [[3, 5, 4], 88]], [4, 2, 1])) },
  51: { key: 'A', confidence: 'high', rule: '(11 + 2) × 6 = 78, (15 + 4) × 8 = 152. So (17 + 6) × 7 = 161.', check: computed(rule((a, b, c) => (a + b) * c, [[[11, 2, 6], 78], [[15, 4, 8], 152]], [17, 6, 7])) },
  52: {
    key: 'B',
    confidence: 'medium',
    rule: '2, 5, 8, 11 are the 1st to 4th terms; they give the squares 0, 1, 4, so 11 gives 9.',
    note: 'Three examples with no arithmetic between each number and its value other than its place in the run. Check against the book key.',
    check: computed(rule((n) => ((n - 2) / 3) ** 2, [[[2], 0], [[5], 1], [[8], 4]], [11])),
  },
  53: { key: 'A', confidence: 'high', rule: 'One less than the first, times the second: 33 × 15 = 495, 42 × 12 = 504. So 97 × 17 = 1649.', check: computed(rule((a, b) => (a - 1) * b, [[[34, 15], 495], [[43, 12], 504]], [98, 17])) },
  54: {
    key: 'A',
    confidence: 'high',
    rule: 'A quarter of the product: 26 × 8 ÷ 4 = 52, 48 × 16 ÷ 4 = 192. A × 14 ÷ 4 = 175 gives A = 50.',
    check: computed(solveFor((a) => rule((x, y) => (x * y) / 4, [[[26, 8], 52], [[48, 16], 192]], [a, 14]), 175)),
  },
  55: { key: 'B', confidence: 'high', rule: 'a² + b² + ab: 64 + 81 + 72 = 217, 36 + 100 + 60 = 196. So 121 + 49 + 77 = 247.', check: computed(rule((a, b) => a * a + b * b + a * b, [[[8, 9], 217], [[6, 10], 196]], [11, 7])) },
  56: { key: 'C', confidence: 'high', rule: 'The hypotenuse: √(36 + 64) = 10, √(25 + 144) = 13. So √(81 + 1600) = 41.', check: computed(rule((a, b) => Math.sqrt(a * a + b * b), [[[6, 8], 10], [[5, 12], 13]], [9, 40])) },
  57: { key: 'B', confidence: 'high', rule: 'The sum times one less: 11 × 10 = 110, 31 × 30 = 930. So 25 × 24 = 600.', check: computed(rule((a, b) => (a + b) * (a + b - 1), [[[7, 4], 110], [[19, 12], 930]], [16, 9])) },
  58: { key: 'D', confidence: 'high', rule: 'The square of the difference: 14² = 196, 10² = 100. So 17² = 289.', check: computed(rule((a, b) => (a - b) ** 2, [[[15, 29], 196], [[16, 6], 100]], [31, 48])) },
  59: { key: 'D', confidence: 'high', rule: 'A means ÷ and B means +: 49 ÷ 7 + 9 = 16, 25 ÷ 5 + 7 = 12. So 81 ÷ 3 + 8 = 35.', check: computed(rule((a, b, c) => (a * a) / b + c, [[[7, 7, 9], 16], [[5, 5, 7], 12]], [9, 3, 8])) },
  60: { key: 'B', confidence: 'high', rule: 'The first times the sum of the others: 6 × (7 + 3) = 60, 11 × (9 + 6) = 165. So 10 × (11 + 5) = 160.', check: computed(rule((a, b, c) => a * (b + c), [[[6, 7, 3], 60], [[11, 9, 6], 165]], [10, 11, 5])) },
  61: { key: 'B', confidence: 'high', rule: 'The middle digit: 436 → 3, 783 → 8, 654 → 5. So 896 → 9.', check: computed(rule((n) => Math.floor(n / 10) % 10, [[[436], 3], [[783], 8], [[654], 5]], [896])) },
  62: { key: 'C', confidence: 'high', rule: 'The square of the sum: 53² = 2809, 42² = 1764. So 44² = 1936.', check: computed(rule((a, b) => (a + b) ** 2, [[[32, 21], 2809], [[27, 15], 1764]], [31, 13])) },
  63: { key: 'C', confidence: 'high', rule: 'The sum of all four digits: 1 + 7 + 3 + 6 = 17, 4 + 1 + 5 + 6 = 16. So 4 + 1 + 3 + 2 = 10.', check: computed(rule(digitSum, [[[17, 36], 17], [[41, 56], 16]], [41, 32])) },
  64: { key: 'A', confidence: 'high', rule: 'One less of each, multiplied: 13 × 7 = 91, 17 × 3 = 51. So 20 × 8 = 160.', check: computed(rule((a, b) => (a - 1) * (b - 1), [[[14, 8], 91], [[18, 4], 51]], [21, 9])) },
  65: { key: 'B', confidence: 'high', rule: 'P means − and M means +: 43 − 16 + 19 = 46, 11 + 13 − 12 = 12. So 16 − 18 + 24 = 22.', check: computed(legend({ P: '−', M: '+' }, [['43 P 16 M 19', 46], ['11 M 13 P 12', 12]], '16 P 18 M 24')) },
  66: { key: 'A', confidence: 'high', rule: 'N means − and A means +: 24 − 16 + 4 = 12, 14 + 18 − 12 = 20. So 48 − 16 + 15 = 47.', check: computed(legend({ N: '−', A: '+' }, [['24 N 16 A 4', 12], ['14 A 18 N 12', 20]], '48 N 16 A 15')) },
  67: {
    key: 'C',
    confidence: 'high',
    rule: 'C reads 13 ÷ 182 × 42 + 16 − 4 = 3 + 12 = 15. The others come to 28, about 75 and 9.',
    check: computed(onlyTrue(['16S8Q4P19R23 = 27', '11P16Q23S112R14 = 71', '13Q182S42P16R4 = 15', '16P19Q57S12R11 = 7'], (eq) => substitute(eq, { P: '+', Q: '÷', R: '−', S: '×' }))),
  },
  68: { held: true, reason: 'The question prints the legend and "then ?" but no equation to work out, so no option can be chosen.' },
  69: {
    key: 'B',
    confidence: 'high',
    rule: 'B reads 36 ÷ 12 × 14 − 10 + 4 = 42 − 6 = 36. The others do not hold.',
    check: computed(
      onlyTrue(['36 × 12 + 14 ÷ 10 − 4 = 32', '36 + 12 ÷ 14 × 10 − 4 = 36', '36 ÷ 12 − 14 + 10 × 4 = 400', '36 ÷ 12 × 14 + 10 − 4 = 440'], (eq) =>
        substitute(eq, { '+': '÷', '÷': '×', '×': '−', '−': '+' }),
      ),
    ),
  },
  70: { key: 'A', confidence: 'high', rule: '12 ÷ 4 × 16 − 7 + 2 = 48 − 5 = 43.', check: computed(onlySwap('12 ÷ 4 × 16 + 2 − 7 = 43', ['2 and 7, + and −', '7 and 16, − and ×', '4 and 7, × and ÷', '7 and 12, + and −'])) },
  71: { key: 'D', confidence: 'high', rule: '25 × 5 − 210 ÷ 15 + 5 = 125 − 14 + 5 = 116.', check: computed(onlySwap('25 + 5 − 210 ÷ 15 × 5 = 116', ['+ and −', '÷ and +', '÷ and ×', '+ and ×'])) },
  72: { key: 'C', confidence: 'high', rule: '36 × 4 ÷ 12 + 7 − 14 = 12 − 7 = 5.', check: computed(onlySwap('36 ÷ 4 × 12 + 14 − 7 = 5', ['7 and 36, − and ×', '12 and 7, + and −', '14 and 7, × and ÷', '36 and 12, + and −'])) },
  73: { key: 'A', confidence: 'high', rule: '20 × 5 − 25 ÷ 5 + 5 = 100 − 5 + 5 = 100.', check: computed(onlySwap('20 + 5 − 25 ÷ 5 × 5 = 100', ['+ and ×', '÷ and ×', '+ and −', '÷ and +'])) },
  74: { key: 'A', confidence: 'high', rule: '228 ÷ 38 × 14 − 12 + 57 = 84 + 45 = 129.', check: computed(onlySwap('228 ÷ 12 × 14 + 38 − 57 = 129', ['12 and 38, + and −', '12 and 38, × and ÷', '57 and 38, + and ÷', '14 and 38, × and ÷'])) },
  75: { key: 'D', confidence: 'high', rule: '15 × 5 − 80 ÷ 20 + 5 = 75 − 4 + 5 = 76.', check: computed(onlySwap('15 + 5 − 80 ÷ 20 × 5 = 76', ['÷ and ×', '÷ and +', '+ and −', '+ and ×'])) },
  76: {
    key: 'D',
    confidence: 'medium',
    rule: '20 ÷ 10 × 4 − 28 + 14 = 8 − 14 = −6.',
    note: `The first sign of the equation is ÷. ${GLYPH}`,
    check: computed(onlySwap('20 ÷ 4 × 10 + 28 − 14 = −6', ['14 and 20, − and ×.', '20 and 10, + and −', '14 and 28, × and +', '4 and 10, + and −'])),
  },
  77: {
    key: 'B',
    confidence: 'medium',
    rule: '15 + 10 − 25 × 6 ÷ 5 = 25 − 30 = −5.',
    note: `The fourth sign of the equation is ÷, and options C and D print alike. ${GLYPH}`,
    check: computed(onlySwap('15 + 10 − 25 ÷ 6 × 5 = −5', ['+ and ×', '÷ and ×', '+ and −', '+ and −'])),
  },
  78: { key: 'B', confidence: 'high', rule: '469 ÷ 67 × 12 + 238 − 192 = 84 + 46 = 130.', check: computed(onlySwap('469 ÷ 67 × 192 − 238 + 12 = 130', ['192 and 238, + and ÷', '12 and 192, + and −', '12 and 192, + and ÷', '12 and 238 × and ÷'])) },
  79: {
    key: 'C',
    confidence: 'medium',
    rule: '28 ÷ 4 × 9 − 11 + 2 = 63 − 9 = 54.',
    note: `The legend's first sign is ÷ ("'÷' means 'addition'"). ${GLYPH}`,
    check: computed(read('28 × 4 − 9 + 11 ÷ 2', { '÷': '+', '+': '−', '−': '×', '×': '÷' })),
  },
  80: { key: 'C', confidence: 'high', rule: '515 + 832 ÷ 32 × 48 − 8 = 515 + 1248 − 8 = 1755.', check: computed(onlySwap('515 + 832 − 48 × 32 ÷ 8 = 1755', ['32 and 48, + and −', '832 and 48, − and ×', '32 and 48, −and ÷', '515 and 48, + and ÷'])) },
  81: { key: 'C', confidence: 'high', rule: '274 − 548 ÷ 137 × 18 + 228 = 274 − 72 + 228 = 430.', check: computed(onlySwap('137 + 548 ÷ 274 × 18 − 228 = 430', ['548 and 137, + and ÷', '137 and 274, + and ÷', '137 and 274, + and −', '18 and 548, × and ÷'])) },
  82: { key: 'C', confidence: 'high', rule: '448 ÷ 28 − 151 + 14 × 15 = 16 − 151 + 210 = 75.', check: computed(onlySwap('448 + 151 − 28 ÷ 14 × 15 = 75', ['28 and 15, × and +', '28 and 448, × and ÷', '151 and 28, + and ÷', '448 and 151, + and ÷'])) },
  83: { key: 'C', confidence: 'high', rule: '26 × 18 + 64 − 418 ÷ 38 = 468 + 64 − 11 = 521.', check: computed(onlySwap('38 × 18 ÷ 64 − 418 + 26 = 521', ['26 and 18, + and ÷', '26 and 38, + and −', '26 and 38, + and ÷', '418 and 64, × and ÷'])) },
  84: {
    key: 'C',
    confidence: 'medium',
    rule: '20 + 696 ÷ 58 × 144 − 864 = 20 + 1728 − 864 = 884.',
    note: `The third sign of the equation is ÷. ${GLYPH}`,
    check: computed(onlySwap('20 + 696 × 144 ÷ 58 − 864 = 884', ['58 and 864, × and ÷', '58 and 696, + and ÷', '144 and 58, × and ÷', '696 and 20, + and −'])),
  },
  85: { key: 'D', confidence: 'high', rule: '27 + 64 + 125 = 216 = 6³.', check: computed(((l, r) => (l < r ? '<' : l > r ? '>' : '='))(3 ** 3 + 4 ** 3 + 5 ** 3, 6 ** 3)) },
  86: {
    key: 'B',
    confidence: 'high',
    rule: 'A * B = A² − B²: 12 * 7 = 95, 11 * 8 = 57, and 95 * 57 = 9025 − 3249 = 5776.',
    check: computed(((star) => star(star(12, 7), star(11, 8)))((a: number, b: number) => (a + b) * (a - b))),
  },
  87: { key: 'B', confidence: 'high', rule: 'The right side is (A + B + C)², so (3 + 4 + 7)² = 196.', check: computed(((a: number, b: number, c: number) => a * a + b * b + c * c + 2 * (a * b + b * c + c * a))(3, 4, 7)) },
  88: {
    key: 'A',
    confidence: 'high',
    rule: 'Swapping the signs and the digits 5 and 8, A reads 52 + 38 − 88 = 2. The others come to 2, 35 and 32 against 102, 132 and 72.',
    check: computed(onlyTrue(['82 − 35 + 55 = 2', '82 − 35 + 55 = 102', '85 − 38 + 85 = 132', '52 − 35 + 55 = 72'], (eq) => swapIn(eq, ['+', '−']).replace(/[58]/g, (d) => (d === '5' ? '8' : '5')))),
  },
  89: { key: 'D', confidence: 'high', rule: '3 ÷ 6 − 2 + 4 × 7 = 0.5 − 2 + 28 = 26.5.', check: computed(onlySwap('6 ÷ 3 × 2 + 4 − 7 = 26.5', ['6 and 2, + and −', '4 and 7, × and ÷', '3 and 7, + and −', '3 and 6, − and ×'])) },
  90: { key: 'B', confidence: 'high', rule: 'a² − b²: 25 − 9 = 16, 49 − 9 = 40. So 81 − 9 = 72.', check: computed(rule((a, b) => a * a - b * b, [[[5, 3], 16], [[7, 3], 40]], [9, 3])) },
  91: { key: 'B', confidence: 'medium', rule: '24 × 4 ÷ 8 + 4 = 12 + 4 = 16.', note: `The second sign is ÷. ${GLYPH}`, check: computed(read('M × J ÷ L + J', { M: '24', J: '4', L: '8' })) },
  92: {
    key: 'A',
    confidence: 'medium',
    rule: 'The digit sum plus 8: 17 + 8 = 25, 14 + 8 = 22. So 16 + 8 = 24.',
    note: 'A constant added to the digit sum fits both examples but is an unusual rule. Check against the book key.',
    check: computed(rule((n) => digitSum(n) + 8, [[[782], 25], [[671], 22]], [484])),
  },
  93: {
    key: 'B',
    confidence: 'medium',
    rule: 'The digit sum plus 3: 17 + 3 = 20, 15 + 3 = 18. So 21 + 3 = 24.',
    note: 'A constant added to the digit sum fits both examples but is an unusual rule. Check against the book key.',
    check: computed(rule((n) => digitSum(n) + 3, [[[782], 20], [[474], 18]], [885])),
  },
  94: { key: 'D', confidence: 'high', rule: 'The digit sum: 22, 16, 15. So 7 + 2 + 5 + 4 = 18.', check: computed(rule(digitSum, [[[5566], 22], [[1753], 16], [[3624], 15]], [7254])) },
  95: {
    key: 'B',
    confidence: 'medium',
    rule: '(18 × 10 + 20) ÷ 8 − 6 = 25 − 6 = 19.',
    note: `The legend reads − means ÷ and ÷ means −, as in Q21. ${GLYPH}`,
    check: computed(read('(18 + 10 × 20) − 8 ÷ 6', { '+': '×', '−': '÷', '×': '+', '÷': '−' })),
  },
  96: { key: 'B', confidence: 'high', rule: 'The sum of all six digits: 26 and 27. So 7 + 9 + 6 + 3 + 5 + 4 = 34.', check: computed(rule(digitSum, [[[532, 781], 26], [[862, 920], 27]], [796, 354])) },
  97: {
    key: 'C',
    confidence: 'high',
    rule: 'The product written backwards: 40 → 04, 16 → 61. So 80 → 08.',
    check: computed(((rev) => (rev(8, 5) === '04' && rev(8, 2) === '61' ? rev(8, 10) : null))((a: number, b: number) => [...String(a * b)].reverse().join(''))),
  },
  98: {
    key: 'A',
    confidence: 'medium',
    rule: 'The product of all four digits: 3 × 5 × 1 × 6 = 90, 4 × 6 × 2 × 2 = 96. So 1 × 7 × 2 × 4 = 56.',
    note: 'The third example prints 578; the rule gives 2 × 9 × 4 × 8 = 576, read as a misprint. Check against the book key.',
    check: computed(rule(digitProduct, [[[35, 16], 90], [[46, 22], 96]], [17, 24])),
  },
  99: { key: 'B', confidence: 'high', rule: '7 + 7 − 2 × 1 = 12.', check: computed(onlyFill('7 * 7 * 2 * 1 = 12', ['× ÷ −', '+ − ×', '÷ + −', '× − ×'])) },
  100: { key: 'A', confidence: 'medium', rule: '16 + 64 ÷ 4 − 4 × 3 = 16 + 16 − 12 = 20.', note: `A means ÷. ${GLYPH}`, check: computed(read('16 D 64 A 4 B 4 C 3', { A: '÷', B: '−', C: '×', D: '+' })) },
  101: { key: 'C', confidence: 'high', rule: '10 + 5 − 3 × 2 = 9.', check: computed(read('10 × 5 + 3 − 2', { '+': '−', '−': '×', '×': '+' })) },
  102: { key: 'D', confidence: 'high', rule: '15 ÷ 5 × 2 + 3 = 9, printed 09.', check: computed(String(read('15 D 5 C 2 A 3', { A: '+', B: '−', C: '×', D: '÷' })).padStart(2, '0')) },
  103: {
    key: 'C',
    confidence: 'medium',
    rule: '12 ÷ 6 − 3 × 2 + 8 = 2 − 6 + 8 = 4.',
    note: `The legend prints "'+' means '+', '+' means '–'"; read as + means ÷ and ÷ means −, with ÷ in the equation. ${GLYPH}`,
    check: computed(read('12 + 6 ÷ 3 − 2 × 8', { '+': '÷', '÷': '−', '−': '×', '×': '+' })),
  },
  104: {
    key: 'D',
    confidence: 'medium',
    rule: '16 + 3 × 5 + 2 − 4 = 29, not among the numbers: None of these.',
    note: `The last sign of the equation is ÷. ${GLYPH}`,
    check: computed(read('16 × 3 + 5 − 2 ÷ 4', { '+': '×', '×': '+', '÷': '−', '−': '+' })),
  },
  105: {
    key: 'C',
    confidence: 'medium',
    rule: '16 + 8 − 6 × 2 ÷ 12 = 24 − 1 = 23.',
    note: `The legend reads + means ÷ and ÷ means +, and the equation's first sign is ÷. ${GLYPH}`,
    check: computed(read('16 ÷ 8 × 6 − 2 + 12', { '+': '÷', '×': '−', '÷': '+', '−': '×' })),
  },
  106: {
    key: 'C',
    confidence: 'medium',
    rule: '15 ÷ 5 + 10 − 5 × 3 = 3 + 10 − 15 = −2.',
    note: `The legend reads × means ÷ and ÷ means +, and the equation's second sign is ÷. ${GLYPH}`,
    check: computed(num(read('15 × 5 ÷ 10 + 5 − 3', { '+': '−', '−': '×', '×': '÷', '÷': '+' }))),
  },
  107: {
    key: 'B',
    confidence: 'medium',
    rule: '12 ÷ 6 − 3 × 2 + 8 = 2 − 6 + 8 = 4.',
    note: `The legend prints "+ means +, + means −"; read as + means ÷ and ÷ means −, as in Q103. ${GLYPH}`,
    check: computed(read('12 + 6 ÷ 3 − 2 × 8', { '+': '÷', '÷': '−', '−': '×', '×': '+' })),
  },
  108: {
    key: 'C',
    confidence: 'medium',
    rule: '38 ÷ 19 × 16 − 17 + 3 = 32 − 14 = 18.',
    note: `The legend reads + means ÷ and ÷ means +, and the equation's last sign is ÷. ${GLYPH}`,
    check: computed(read('38 + 19 − 16 × 17 ÷ 3', { '+': '÷', '×': '−', '−': '×', '÷': '+' })),
  },
  109: {
    key: 'D',
    confidence: 'medium',
    rule: '56 ÷ 7 + 13 × 11 − 15 × 8 + 2 × 7 = 8 + 143 − 120 + 14 = 45.',
    note: `The legend reads × stands for ÷ and ÷ stands for +, and the equation has two ÷. ${GLYPH}`,
    check: computed(read('56 × 7 ÷ 13 − 11 + 15 − 8 ÷ 2 − 7', { '+': '−', '−': '×', '×': '÷', '÷': '+' })),
  },
  110: { key: 'B', confidence: 'high', rule: '8 × 3 + 24 ÷ 12 − 19 = 24 + 2 − 19 = 7.', check: computed(read('8 a 3 c 24 b 12 d 19', { a: '×', b: '÷', c: '+', d: '−' })) },
  111: { key: 'B', confidence: 'medium', rule: '15 × 24 ÷ 1 − 5 + 8 = 363.', note: `R denotes ÷. ${GLYPH}`, check: computed(read('15S24R1Q5P8', { P: '+', Q: '−', R: '÷', S: '×' })) },
  112: { key: 'B', confidence: 'high', rule: '+ means ×, − means ÷, ÷ means +: 6 × 3 = 18, 12 ÷ 2 = 6, 8 + 2 = 10. So 8 ÷ 2 + 3 = 7.', check: computed(legend({ '+': '×', '-': '÷', '÷': '+' }, [['6+3', 18], ['12-2', 6], ['8 ÷ 2', 10]], '8-2 ÷ 3')) },
  113: {
    key: 'B',
    confidence: 'medium',
    rule: '12 ÷ 6 − 3 × 2 + 8 = 2 − 6 + 8 = 4.',
    note: `The legend reads + means ÷ and ÷ means −, and the book writes 6/3 for 6 ÷ 3. ${GLYPH}`,
    check: computed(read('12 + 6/3 − 2 × 8', { '+': '÷', '÷': '−', '/': '−', '−': '×', '×': '+' })),
  },
  114: {
    key: 'B',
    confidence: 'medium',
    rule: '7 × 21 + 81 − 9 − 3 + 14 = 147 + 81 − 9 − 3 + 14 = 230.',
    note: `The legend's third sign is ÷ ("'÷' stands for '−'"), and the equation's third sign is ÷. ${GLYPH}`,
    check: computed(read('7 + 21 × 81 ÷ 9 − 3 × 14', { '+': '×', '×': '+', '÷': '−' })),
  },
};
