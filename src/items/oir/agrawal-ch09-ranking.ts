import { ordinal } from './check.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 9 "Ranking Test"
 * (pages 35-37). Every answer is computed below from the row arithmetic:
 * a place counted from one end is (total − place + 1) from the other, and
 * places counted from both ends make a total of (a + b − 1). Shipped with
 * `key_basis = 'derived'` until the book's key is compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch09-ranking.source.json
 */

/** A place counted from one end, counted from the other. */
const other = (total: number, place: number) => total - place + 1;
/** The row's size, from one person's place counted from each end. */
const total = (fromOne: number, fromOther: number) => fromOne + fromOther - 1;
const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;

export const AGRAWAL_CH09_RANKING: Readonly<Record<number, KeyEntry>> = {
  1: { key: 'B', confidence: 'high', rule: 'Palak is 27 + 7 = 34th from the left, so 74 − 34 + 1 = 41st from the right.', check: computed(other(74, 27 + 7)) },
  2: { key: 'C', confidence: 'high', rule: 'Reeta is 16 − 11 + 1 = 6th from the left and Madhuri 14th; the middle of 6 and 14 is the 10th.', check: computed(ordinal((other(16, 11) + 14) / 2)) },
  3: {
    key: 'A',
    confidence: 'medium',
    rule: 'Neha is 42 − 16 + 1 = 27th from the left; 7 places to her right is the 34th. Vinita does not matter.',
    note: '"Facing east" could make "to the right of Neha" mean her own right (south), off the row. Read as along the row, toward the right end, as the rest of the question counts. Check against the book key.',
    check: computed(ordinal(other(42, 16) + 7)),
  },
  4: { key: 'B', confidence: 'high', rule: 'Shikha is 64 − 59 + 1 = 6th from the top; Komal, 6 below her, is 12th.', check: computed(ordinal(other(64, 59) + 6)) },
  5: { key: 'B', confidence: 'high', rule: 'Bilal is 52 − 11 + 1 = 42nd from the top; Salman, 9 above him, is 33rd.', check: computed(ordinal(other(52, 11) - 9)) },
  6: { key: 'A', confidence: 'high', rule: 'Saumya is 10 − 9 + 1 = 2nd from the beginning and Rohan 6th; 3 sit between them.', check: computed(6 - other(10, 9) - 1) },
  7: { key: 'A', confidence: 'high', rule: '10 + 12 − 1 = 21 persons.', check: computed(total(10, 12)) },
  8: {
    key: 'A',
    confidence: 'high',
    rule: 'For the fewest, Raman is above Rohan: 13 − 6 = 7th from the top and 36th from the bottom, so 7 + 36 − 1 = 42 passed. With 9 failed, at least 51.',
    check: computed(total(13 - 6, 36) + 9),
  },
  9: { key: 'B', confidence: 'high', rule: '11 + 13 − 1 = 23 persons.', check: computed(total(11, 13)) },
  10: { key: 'A', confidence: 'high', rule: '13 + 17 − 1 = 29 passed, so 40 − 29 = 11 failed.', check: computed(40 - total(13, 17)) },
  11: { key: 'B', confidence: 'high', rule: 'Aarti has 29 students above her and 26 below: 29 + 26 + 1 = 56.', check: computed(29 + 26 + 1) },
  12: {
    key: 'C',
    confidence: 'high',
    rule: 'For the fewest, Vinod is above Rakesh: 31 − 23 = 8th from the top and 53rd from the bottom, so 8 + 53 − 1 = 60 boys. With 15 girls, 75.',
    check: computed(total(31 - 23, 53) + 15),
  },
  13: { key: 'B', confidence: 'high', rule: 'Ramesh is 23 − 11 = 12th from the left and 16th from the right: 12 + 16 − 1 = 27.', check: computed(total(23 - 11, 16)) },
  14: {
    key: 'D',
    confidence: 'high',
    rule: 'Aakash is 1st, so Bhumi is 14th. For the fewest, Charu is before Bhumi: 14 − 7 = 7th. With 15 after Charu, 7 + 15 = 22.',
    check: computed(14 - 7 + 15),
  },
  15: { key: 'B', confidence: 'high', rule: 'For the most, Aman is above Boman with no overlap: 12 + 6 + 18 = 36.', check: computed(12 + 6 + 18) },
  16: {
    key: 'B',
    confidence: 'high',
    rule: 'Blue is at the bottom and 18 cars lie between it and yellow, so yellow is 20th from the bottom. With 6 above yellow, 26 cars. The red car sits within that span.',
    check: computed(1 + 18 + 1 + 6),
  },
  17: { key: 'A', confidence: 'high', rule: '14 + 23 − 1 = 36 cars.', check: computed(total(14, 23)) },
  18: {
    key: 'A',
    confidence: 'high',
    rule: 'Q is 13th. S cannot be 16 places before Q, so S is 29th. R (9 places from S) and P (5 from Q) both fit before S, so the fewest is 29.',
    check: computed(13 + 15 + 1),
  },
  19: { key: 'B', confidence: 'high', rule: 'Honda is 20 + 10 = 30th and in the middle, so 29 stand on each side: 59.', check: computed(2 * (20 + 10) - 1) },
  20: { key: 'D', confidence: 'high', rule: '7 + 26 − 1 = 32 students.', check: computed(total(7, 26)) },
  21: {
    key: 'C',
    confidence: 'high',
    rule: 'Amit is 10 places left of Prince (15th vs 5th from the right), so Aditya is 10 further: 25th from the right. Aditya is 6th from the left, so 25 + 6 − 1 = 30.',
    check: computed(total(15 + (15 - 5), 6)),
  },
  22: { key: 'A', confidence: 'high', rule: 'Akash is 32 − 12 + 1 = 21st from the left and Priya 18th; 2 stand between them.', check: computed(['Zero', 'One', 'Two', 'Three', 'Four', 'Five'][other(32, 12) - 18 - 1]) },
  23: {
    key: 'C',
    confidence: 'high',
    rule: 'A is 1st and B is 8th. For the most, C is after B: 12th. With 12 after C, 24.',
    check: computed(8 + 4 + 12),
  },
  24: {
    key: 'D',
    confidence: 'medium',
    rule: "Manish moves to Kavita's place, which is 20th from the left and 35th from the right: 20 + 35 − 1 = 54 in the row.",
    note: 'If Kavita is a woman, the row holds 53 men; 53 is not an option, so the book counts everyone in the row. Check against the book key.',
    check: computed(total(20, 35)),
  },
  25: {
    key: 'A',
    confidence: 'high',
    rule: "Rajesh moves to Suman's place, 12th from the left and 17th from the right: 28 in all. Suman moves to Rajesh's place, 8th from the right, so 28 − 8 + 1 = 21st from the left.",
    check: computed(`${other(total(12, 17), 8)}, ${total(12, 17)}`),
  },
  26: {
    key: 'A',
    confidence: 'high',
    rule: 'After the swap Harish is 10th from the left and Shovan 36 − 13 + 1 = 24th; Jatin, midway, is 17th from the left, so 36 − 17 + 1 = 20th from the right.',
    check: computed(ordinal(other(36, (10 + other(36, 13)) / 2))),
  },
  27: { key: 'A', confidence: 'high', rule: "X moves to Y's place, 17th from the back: 47 − 17 + 1 = 31st from the front.", check: computed(other(47, 17)) },
  28: { key: 'B', confidence: 'high', rule: "Karan's place is 43rd from the left and 29th from the right: 43 + 29 − 1 = 71.", check: computed(total(43, 29)) },
  29: { key: 'B', confidence: 'high', rule: "Paresh's place is 14th from the left and 21st from the right: 14 + 21 − 1 = 34.", check: computed(total(14, 21)) },
  30: {
    key: 'D',
    confidence: 'high',
    rule: "Y's place is 21st from the top and 16th from the bottom, so 36 in the class. Y moves to X's place, 7th from the top: 36 − 7 + 1 = 30th from the bottom.",
    check: computed(ordinal(other(total(21, 16), 7))),
  },
  31: { key: 'C', confidence: 'high', rule: '11 + 27 − 1 = 37 students.', check: computed(total(11, 27)) },
  32: { key: 'B', confidence: 'high', rule: '31 − 17 + 1 = 15th from the last.', check: computed(ordinal(other(31, 17))) },
  33: { key: 'D', confidence: 'high', rule: 'Kamla: 45 − 19 + 1 = 27th from the top. Arun: 45 − 23 + 1 = 23rd.', check: computed(`${ordinal(other(45, 19))} and ${ordinal(other(45, 23))}`) },
  34: { key: 'D', confidence: 'high', rule: '40 − 25 + 1 = 16th from the bottom.', check: computed(other(40, 25)) },
  35: { key: 'A', confidence: 'high', rule: '16 + 10 − 1 = 25 persons.', check: computed(total(16, 10)) },
  36: { key: 'B', confidence: 'high', rule: '6 + 6 − 1 = 11 persons.', check: computed(total(6, 6)) },
  37: { key: 'C', confidence: 'high', rule: '8 + 28 − 1 = 35 students.', check: computed(total(8, 28)) },
  38: { key: 'B', confidence: 'high', rule: '15 + 50 − 1 = 64 students.', check: computed(total(15, 50)) },
  39: { key: 'B', confidence: 'high', rule: 'The row has 16 + 15 − 1 = 30, so 20 more make 50.', check: computed(50 - total(16, 15)) },
  40: { key: 'C', confidence: 'high', rule: 'Sujeet is 8 + 5 = 13th from the top, so 40 − 13 + 1 = 28th from the bottom.', check: computed(ordinal(other(40, 8 + 5))) },
  41: { key: 'A', confidence: 'high', rule: 'Manav is 15 − 4 = 11th from the top, so 20 − 11 + 1 = 10th from the bottom.', check: computed(ordinal(other(20, 15 - 4))) },
  42: { key: 'A', confidence: 'high', rule: 'Mamta is 8 + 7 = 15th from the top, so 41 − 15 + 1 = 27th from the bottom.', check: computed(ordinal(other(41, 8 + 7))) },
  43: { key: 'A', confidence: 'high', rule: '15 + 11 − 1 = 25 persons.', check: computed(total(15, 11)) },
  44: { key: 'A', confidence: 'high', rule: '83 − 54 + 1 = 30th from the bottom.', check: computed(other(83, 54)) },
  45: { key: 'C', confidence: 'high', rule: 'Shikha is 21 − 9 + 1 = 13th from the left; Nitin, 3 to her right, is 16th.', check: computed(ordinal(other(21, 9) + 3)) },
  46: { key: 'A', confidence: 'high', rule: 'B gives the queue: 15 + 21 − 1 = 35. A is then 35 − 7 + 1 = 29th from the bottom.', check: computed(ordinal(other(total(15, 21), 7))) },
  47: { key: 'A', confidence: 'high', rule: 'Ashok is 39 − 17 + 1 = 23rd from the beginning; Suresh, 7 ahead, is 16th.', check: computed(ordinal(other(39, 17) - 7)) },
  48: {
    key: 'A',
    confidence: 'high',
    rule: 'Suman is just below Amit, so the 2 girls above Suman are above Amit too, with the 4 boys above him: 2 + 4 + 1 = 7th.',
    check: computed(ordinal(2 + 4 + 1)),
  },
  49: { key: 'B', confidence: 'high', rule: 'Monika was 12 − 4 = 8th from the left, so 21 − 8 + 1 = 14th from the right.', check: computed(ordinal(other(21, 12 - 4))) },
  50: {
    key: 'D',
    confidence: 'high',
    rule: 'Prabhu is 9th and Ram 12th from the left, so 2 stand between them, which is not among the numbers given. Padma and Radha do not matter.',
    check: computed(12 - 9 - 1),
  },
};
