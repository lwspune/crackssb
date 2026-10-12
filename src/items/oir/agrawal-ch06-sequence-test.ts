import { ALPHABETS, between, fromLeft, fromRight, leftOf, middleOf, posFromLeft, posFromRight, rightOf } from './check.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 6 "Sequence Test"
 * (pages 22-23). Every answer is computed below from letter positions in the
 * order the question's direction sets: the alphabet as is (Q1-20), first half
 * reversed (Q21-31), second half reversed (Q32-40), or all of it reversed
 * (Q41-51). Shipped with `key_basis = 'derived'` until the book's key is
 * compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch06-sequence-test.source.json
 */

const N = ALPHABETS.normal;
const H1 = ALPHABETS.firstHalfReversed;
const H2 = ALPHABETS.secondHalfReversed;
const R = ALPHABETS.reversed;
/** A position the question guarantees exists. */
const at = (seq: string, n: number) => fromLeft(seq, n)!;
const atRight = (seq: string, n: number) => fromRight(seq, n)!;
const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;

export const AGRAWAL_CH06_SEQUENCE_TEST: Readonly<Record<number, KeyEntry>> = {
  // ---------------------------------------------------------------- Q1-20: the alphabet as printed
  1: { key: 'B', confidence: 'high', rule: 'The 13th letter from the left is M; the 7th to its right is T.', check: computed(rightOf(N, at(N, 13), 7)) },
  2: {
    key: 'D',
    confidence: 'medium',
    rule: 'The 19th letter from the right end is H; the 6th to its left is B, which is not among the options.',
    note: 'If the print meant the 19th from the left (S), the answer would be M (A). Check against the book key.',
    check: computed(leftOf(N, atRight(N, 19), 6)),
  },
  3: { key: 'B', confidence: 'high', rule: '15th from the right is 26 − 15 + 1 = 12th from the left: L.', check: computed(atRight(N, 15)) },
  4: { key: 'C', confidence: 'high', rule: 'The 23rd letter is W.', check: computed(at(N, 23)) },
  5: { key: 'B', confidence: 'high', rule: 'S is the 19th letter.', check: computed(posFromLeft(N, 'S')) },
  6: { key: 'B', confidence: 'high', rule: 'K is 11th from the left, so 26 − 11 + 1 = 16th from the right.', check: computed(posFromRight(N, 'K')) },
  7: {
    held: true,
    reason: 'The 6th letter from the left is F, and nothing lies 16 places to its left. No option fits as printed; "16th to the right" would give V (C).',
    lean: 'C',
  },
  8: {
    held: true,
    reason: 'The 8th letter from the right is S, and nothing lies 17 places to its right. No option fits as printed; counting on round the alphabet past Z would give J (A).',
    lean: 'A',
  },
  9: { key: 'B', confidence: 'high', rule: 'M is the 13th letter; 13 + 6 = 19th: S.', check: computed(rightOf(N, 'M', 6)) },
  10: { key: 'B', confidence: 'high', rule: 'W is the 23rd letter; 23 − 12 = 11th: K.', check: computed(leftOf(N, 'W', 12)) },
  11: { key: 'B', confidence: 'high', rule: 'E is 5th and O is 15th; the middle is the 10th, J.', check: computed(middleOf(N, 'E', 'O')) },
  12: { key: 'C', confidence: 'high', rule: 'The 15th from the right is L (12th from the left) and the 24th from the left is X; the middle of 12 and 24 is the 18th, R.', check: computed(middleOf(N, atRight(N, 15), at(N, 24))) },
  13: { key: 'B', confidence: 'high', rule: 'The 8th letter is H and the 22nd is V; the middle is the 15th, O.', check: computed(middleOf(N, at(N, 8), at(N, 22))) },
  14: { key: 'C', confidence: 'high', rule: 'The 7th from the left is G; 19 to its right is Z (26th); 10 to the left of Z is P.', check: computed(leftOf(N, rightOf(N, at(N, 7), 19)!, 10)) },
  15: { key: 'B', confidence: 'high', rule: 'The 21st from the right is F (6th); 11 to its right is Q (17th); 7 to the left of Q is J.', check: computed(leftOf(N, rightOf(N, atRight(N, 21), 11)!, 7)) },
  16: { key: 'C', confidence: 'high', rule: 'Between the 3rd and the 18th lie 18 − 3 − 1 = 14 letters.', check: computed(between(N, at(N, 18), at(N, 3))) },
  17: { key: 'B', confidence: 'high', rule: 'Between the 10th and the 21st lie 21 − 10 − 1 = 10 letters.', check: computed(between(N, at(N, 21), at(N, 10))) },
  18: { key: 'B', confidence: 'high', rule: 'Between the 8th and the 20th lie 20 − 8 − 1 = 11 letters.', check: computed(between(N, at(N, 8), at(N, 20))) },
  19: { key: 'B', confidence: 'high', rule: 'Between the 11th and the 19th from the right lie 19 − 11 − 1 = 7 letters.', check: computed(between(N, atRight(N, 19), atRight(N, 11))) },
  20: { key: 'B', confidence: 'high', rule: 'Between the 5th and the 16th lie 16 − 5 − 1 = 10 letters.', check: computed(between(N, at(N, 5), at(N, 16))) },

  // ---------------------------------------------------------------- Q21-31: M L K J I H G F E D C B A N O P ... Z
  21: { key: 'C', confidence: 'high', rule: 'With the first half reversed (M L K … A N O … Z), the 15th from the left is O; 3 to its left is B.', check: computed(leftOf(H1, at(H1, 15), 3)) },
  22: { key: 'C', confidence: 'high', rule: 'With the first half reversed, the 7th from the left is G; 11 to its right is the 18th, R.', check: computed(rightOf(H1, at(H1, 7), 11)) },
  23: { key: 'B', confidence: 'high', rule: 'With the first half reversed, the 5th from the left is I; 6 to its right is the 11th, C.', check: computed(rightOf(H1, at(H1, 5), 6)) },
  24: { key: 'C', confidence: 'high', rule: 'With the first half reversed, the 17th from the right is the 10th from the left, D; 6 to its right is the 16th, P.', check: computed(rightOf(H1, atRight(H1, 17), 6)) },
  25: { key: 'B', confidence: 'high', rule: 'With the first half reversed, the 20th from the right is the 7th from the left, G; 7 to its right is the 14th, N.', check: computed(rightOf(H1, atRight(H1, 20), 7)) },
  26: { key: 'C', confidence: 'high', rule: 'With the first half reversed, the 6th from the right is U (21st); 17 to its left is the 4th, J.', check: computed(leftOf(H1, atRight(H1, 6), 17)) },
  27: { key: 'C', confidence: 'high', rule: 'With the first half reversed, the 21st from the right is the 6th from the left, H.', check: computed(atRight(H1, 21)) },
  28: { key: 'B', confidence: 'high', rule: 'With the first half reversed, the 9th from the left is E and the 19th is S; the middle is the 14th, N.', check: computed(middleOf(H1, at(H1, 9), at(H1, 19))) },
  29: {
    key: 'D',
    confidence: 'high',
    rule: 'With the first half reversed, the 8th from the right is S (19th) and the 19th from the right is F (8th). Ten letters lie between them, an even number, so no single letter is in the middle.',
    check: computed(middleOf(H1, atRight(H1, 8), atRight(H1, 19))),
  },
  30: { key: 'B', confidence: 'high', rule: 'With the first half reversed, the 10th from the right is Q (17th) and the 18th from the right is E (9th); the middle is the 13th, A.', check: computed(middleOf(H1, atRight(H1, 10), atRight(H1, 18))) },
  31: { key: 'C', confidence: 'high', rule: 'With the first half reversed, the 18th from the right is the 9th from the left, E.', check: computed(atRight(H1, 18)) },

  // ---------------------------------------------------------------- Q32-40: A B C ... M Z Y X ... N
  32: { key: 'D', confidence: 'high', rule: 'With the second half reversed (A … M Z Y … N), the 17th from the left is W; 5 to its right is the 22nd, R.', check: computed(rightOf(H2, at(H2, 17), 5)) },
  33: { key: 'C', confidence: 'high', rule: 'With the second half reversed, the 11th from the right is the 16th from the left, X; 10 to its left is the 6th, F.', check: computed(leftOf(H2, atRight(H2, 11), 10)) },
  34: { key: 'C', confidence: 'high', rule: 'With the second half reversed, the 18th from the right is the 9th from the left, I; 11 to its right is the 20th, T.', check: computed(rightOf(H2, atRight(H2, 18), 11)) },
  35: { key: 'D', confidence: 'high', rule: 'With the second half reversed, the 25th from the left is O; 10 to its left is the 15th, Y.', check: computed(leftOf(H2, at(H2, 25), 10)) },
  36: { key: 'C', confidence: 'high', rule: 'With the second half reversed, the 7th from the right is the 20th from the left, T.', check: computed(atRight(H2, 7)) },
  37: { key: 'B', confidence: 'high', rule: 'With the second half reversed, the 18th from the left is V.', check: computed(at(H2, 18)) },
  38: { key: 'C', confidence: 'high', rule: 'With the second half reversed, the 5th from the left is E; 11 to its right is X (16th); 6 to the right of X is the 22nd, R.', check: computed(rightOf(H2, rightOf(H2, at(H2, 5), 11)!, 6)) },
  39: { key: 'A', confidence: 'high', rule: 'With the second half reversed, the 10th from the left is J and the 18th is V; the middle is the 14th, Z.', check: computed(middleOf(H2, at(H2, 10), at(H2, 18))) },
  40: { key: 'D', confidence: 'high', rule: 'With the second half reversed, the 15th from the right is L (12th from the left) and the 20th from the left is T; the middle of 12 and 20 is the 16th, X.', check: computed(middleOf(H2, atRight(H2, 15), at(H2, 20))) },

  // ---------------------------------------------------------------- Q41-51: Z Y X ... A
  41: { key: 'C', confidence: 'high', rule: 'Reversed (Z Y X … A), the 25th from the left is B; 12 to its left is the 13th, N.', check: computed(leftOf(R, at(R, 25), 12)) },
  42: { key: 'B', confidence: 'high', rule: 'Reversed, the 11th from the left is P; 7 to its right is the 18th, I.', check: computed(rightOf(R, at(R, 11), 7)) },
  43: { key: 'C', confidence: 'high', rule: 'Reversed, the 7th from the right is the 20th from the left, G; 17 to its left is the 3rd, X.', check: computed(leftOf(R, atRight(R, 7), 17)) },
  44: { key: 'A', confidence: 'high', rule: 'Reversed, the 22nd from the right is the 5th from the left, V; 18 to its right is the 23rd, D.', check: computed(rightOf(R, atRight(R, 22), 18)) },
  45: { key: 'D', confidence: 'high', rule: 'Reversed, the 16th from the left is K.', check: computed(at(R, 16)) },
  46: { key: 'C', confidence: 'high', rule: 'Reversed, the 17th from the right is the 10th from the left, Q.', check: computed(atRight(R, 17)) },
  47: { key: 'C', confidence: 'high', rule: 'Reversed, the 24th from the left is C.', check: computed(at(R, 24)) },
  48: { key: 'C', confidence: 'high', rule: 'Reversed (Z Y X W V U T S …), S is 8th from the left.', check: computed(posFromLeft(R, 'S')) },
  49: { key: 'D', confidence: 'high', rule: 'Reversed, the 8th from the left is S and the 24th is C; the middle is the 16th, K.', check: computed(middleOf(R, at(R, 8), at(R, 24))) },
  50: {
    held: true,
    reason: 'Reversed, the 10th from the right is J (17th) and the 18th from the right is R (9th); the middle is the 13th, N, which is not an option. In the normal order the answer is M (C), so the print may have dropped the reversal.',
    lean: 'C',
  },
  51: {
    key: 'B',
    confidence: 'high',
    rule: 'T is 7 letters from M. The letter 7 from G is N; 7 the other way runs off the start. Reversing the alphabet keeps the distance, so the answer is N either way.',
    check: computed(rightOf(R, 'G', 7) ?? leftOf(R, 'G', 7)),
  },
};
