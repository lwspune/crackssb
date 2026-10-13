import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 15 "Arithmetic
 * Reasoning" (pages 55-58): ages, ratios, speeds, percentages, sets and
 * shares. Each answer is worked out below; an unknown is found by trying
 * every whole number (or every printed option) against the conditions as
 * stated, and refused unless exactly one fits. Shipped with
 * `key_basis = 'derived'` until the book's key is compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch15-arithmetic-reasoning.source.json
 */

const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;

/** The one whole number from 0 to 100,000 that meets every condition. */
function solve(...conditions: ((x: number) => boolean)[]): number {
  const hits = Array.from({ length: 100_001 }, (_, i) => i).filter((x) => conditions.every((c) => c(x)));
  if (hits.length !== 1) throw new Error(`${hits.length} values fit, not one`);
  return hits[0];
}

const rupees = (n: number) => `₹ ${n.toLocaleString('en-IN')}`;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (...xs: number[]) => xs.reduce((a, b) => (a * b) / gcd(a, b));

export const AGRAWAL_CH15_ARITHMETIC_REASONING: Readonly<Record<number, KeyEntry>> = {
  1: {
    key: 'B',
    confidence: 'high',
    rule: "At the son's birth the father was three times the son's present age: 48 − s = 3s, so s = 12, and 4 years ago he was 8.",
    check: computed(`${solve((s) => 48 - s === 3 * s) - 4} years`),
  },
  2: { key: 'C', confidence: 'high', rule: 'Father + Reena = 60 and father − Reena = 36, so the father is (60 + 36) ÷ 2 = 48.', check: computed(`${(60 + 36) / 2} Years`) },
  3: {
    key: 'B',
    confidence: 'high',
    rule: 'C is 10 + 4 = 14, so 21 in 7 years; B will then be 42, so B is 35 now and A is 3/5 of it: 21.',
    check: computed(((b) => (3 * b) / 5)(2 * (10 + 4 + 7) - 7)),
  },
  4: { key: 'A', confidence: 'high', rule: 'B is 35 − 5 = 30, so A is 4/5 of it: 24.', check: computed(((35 - 5) * 4) / 5) },
  5: {
    key: 'C',
    confidence: 'high',
    rule: 'Richa is 21, so her husband is 28 and will be 33 in five years; the son will then be 11, so he is 6 now.',
    check: computed(((21 / 3) * 4 + 5) / 3 - 5),
  },
  6: { key: 'C', confidence: 'high', rule: 'C is 7 + 4 = 11; B + 5 = 44, so B is 39 and A is 78.', check: computed(2 * (4 * (7 + 4) - 5)) },
  7: { key: 'A', confidence: 'high', rule: 'A will be 60 in 8 years; 60 : B = 4 : 5 makes B 75 then, 67 now.', check: computed(((52 + 8) / 4) * 5 - 8) },
  8: {
    key: 'C',
    confidence: 'high',
    rule: 'A − 4 = 2(B − 4) and A = B + 10 give B = 14, A = 24. C + 6 = 2(24 + 6) = 60, so C is 54.',
    check: computed(((b) => `${2 * (b + 10 + 6) - 6} years`)(solve((b) => b + 10 - 4 === 2 * (b - 4)))),
  },
  9: { key: 'D', confidence: 'high', rule: '5k × 2k = 160 gives k = 4: the father is 20.', check: computed(5 * solve((k) => 10 * k * k === 160)) },
  10: { key: 'C', confidence: 'high', rule: '7k − 5k = 6 gives k = 3: Amit is 15.', check: computed(5 * solve((k) => 2 * k === 6)) },
  11: { key: 'A', confidence: 'high', rule: 'Karthik is 9 + 3 = 12; Kishan + 7 = 48, so Kishan is 41 and Ashok 82.', check: computed(2 * (4 * (9 + 3) - 7)) },
  12: {
    key: 'D',
    confidence: 'high',
    rule: 'd/4 at 10 km/h and 3d/4 at 12 km/h take d/40 + d/16 = 7d/80 hours = 7, so d = 80 km.',
    check: computed(`${solve((d) => d > 0 && (d / 4) * 16 + ((3 * d) / 4) * (40 / 3) === 7 * 160)} km`),
  },
  13: { key: 'B', confidence: 'high', rule: '210 km in 3.5 hours is 60 km/h.', check: computed(210 / 3.5) },
  14: { key: 'B', confidence: 'high', rule: 'By 8.40 Train A has run 40 minutes at 90 km/h and Train B 30 minutes at 120 km/h: 60 km each.', check: computed(((a, b) => (a === b ? `${a} km` : null))((90 * 40) / 60, (120 * 30) / 60)) },
  15: { key: 'D', confidence: 'high', rule: 'Spending the same at 1.25 times the price buys 1 ÷ 1.25 = 0.8 as much: a 20% cut.', check: computed(`${Math.round((1 - 1 / 1.25) * 100)}%`) },
  16: { key: 'D', confidence: 'high', rule: 'Everyone plays at least one: 45 − 17 who play only chess = 28 play badminton.', check: computed(45 - 17) },
  17: { key: 'C', confidence: 'high', rule: 'The pass mark is 80 + 20 = 100 = 40% of the maximum: 250.', check: computed((80 + 20) / 0.4) },
  18: { key: 'A', confidence: 'high', rule: '0.65 × 1.2 = 0.78: the price falls by 22%.', check: computed(`${Math.round((1 - 0.65 * 1.2) * 100)}%`) },
  19: { key: 'A', confidence: 'high', rule: '60% of 260 is 156; she has 40% of 130 = 52, so needs 104 of the last 130: 80%.', check: computed(`${((0.6 * 260 - 0.4 * 130) / 130) * 100}%`) },
  20: { key: 'C', confidence: 'high', rule: '625 − x = 124x gives x = 5.', check: computed(solve((x) => 625 - x === 124 * x)) },
  21: { key: 'A', confidence: 'high', rule: '5(2x + 3) + x = 158 gives x = 13; 13² = 169.', check: computed(solve((x) => 5 * (2 * x + 3) + x === 158) ** 2) },
  22: { key: 'B', confidence: 'medium', rule: '300 pages × 20 lines × 10 words = 60,000.', note: '"10-10 words" is read as 10 words to a line.', check: computed((300 * 20 * 10).toLocaleString('en-US')) },
  23: { key: 'D', confidence: 'high', rule: 'The last three binary digits are the remainder by 8: 578 leaves 2, which is 010.', check: computed((85432578).toString(2).slice(-3)) },
  24: { key: 'C', confidence: 'high', rule: 'Six incomes total 39,000; A + C = 14,000 and C = A + 4,000, so C is ₹ 9,000.', check: computed(rupees((6 * 6500 - 25000 + 4000) / 2)) },
  25: { key: 'D', confidence: 'high', rule: 'The eight weigh 456 kg; the six named weigh 344 kg, so X + Y = 112 kg.', check: computed(`${8 * 57 - (55 + 49 + 57 + 63 + 68 + 52)} kg`) },
  26: { key: 'D', confidence: 'high', rule: 'Oranges and mangoes make 3m + m = 4m: the total divides by 4, and only 42 does not.', check: computed(['40', '48', '44', '42'].filter((n) => +n % 4 !== 0).join() || null) },
  27: {
    key: 'C',
    confidence: 'high',
    rule: 'The largest is 6/7 and the smallest 3/8: 48/56 − 21/56 = 27/56.',
    check: computed(((fs) => ((hi, lo) => `${hi[0] * lo[1] - lo[0] * hi[1]}/${hi[1] * lo[1]}`)(fs[fs.length - 1], fs[0]))([[4, 5], [5, 6], [3, 8], [5, 7], [6, 7]].sort((a, b) => a[0] / a[1] - b[0] / b[1]))),
  },
  28: { key: 'D', confidence: 'high', rule: '1,189 ÷ 41 parts = 29 a part; Sanjay gets 17 − 11 = 6 parts more: ₹174.', check: computed(`₹${(1189 / (11 + 13 + 17)) * (17 - 11)}`) },
  29: { key: 'D', confidence: 'high', rule: '7 parts are ₹ 539, so a part is 77 and the 18 parts total ₹ 1,386.', check: computed(rupees((539 / 7) * 18)) },
  30: { key: 'A', confidence: 'high', rule: '6,764 ÷ 19 parts = 356 a part; P and R have 8 + 3 = 11 parts: ₹ 3,916.', check: computed(rupees((6764 / 19) * 11)) },
  31: { key: 'B', confidence: 'high', rule: 'a² − b² = (a − b)(a + b) = 8 with a − b = 2, so a + b = 4: 3 and 1.', check: computed(((s) => `${(s + 2) / 2}, ${(s - 2) / 2}`)(8 / 2)) },
  32: {
    key: 'C',
    confidence: 'high',
    rule: 'Taking out a quarter leaves 30 l of milk; taking out half leaves 15 l. The drum is topped up to 40 l: 15 l milk, 25 l water.',
    check: computed(((m) => `${m} litres and ${40 - m} litres`)(40 * (3 / 4) * (1 / 2))),
  },
  33: { key: 'B', confidence: 'high', rule: '2,871 ÷ 33 parts = 87 a part; C gets 13 − 9 = 4 parts more: ₹ 348.', check: computed(rupees((2871 / 33) * 4)) },
  34: {
    held: true,
    reason: "Two unknowns (Amit's and his sister's ages) and one equation: options A and B both give whole ages whichever age of Amit the father's is compared with.",
  },
  35: { key: 'A', confidence: 'high', rule: 'Raman is 3 + 2 = 5; the son will be 25 in 10 years, so is 15, and the father 45.', check: computed(3 * (5 * (3 + 2) - 10)) },
  36: { key: 'B', confidence: 'high', rule: 'The grandfather is 85, 80 five years ago; the father was 40 then, 45 now, and Saksham is 15.', check: computed(((88 - 3 - 5) / 2 + 5) / 3) },
  37: { key: 'A', confidence: 'high', rule: 'Sumit is 62 − 20 = 42 = 3 parts, so Amit is 4 parts: 56.', check: computed(((62 - 20) / 3) * 4) },
  38: {
    key: 'C',
    confidence: 'high',
    rule: 'Gwala = K + 6 = 2K − 6 gives Krishna 12, Govind 24, Gwala 18 and Nandu 6: Nandu is the youngest.',
    check: computed(((k) => Object.entries({ Govind: 2 * k, Krishna: k, Nandu: k / 2, Gwala: k + 6 }).sort((a, b) => a[1] - b[1])[0][0])(solve((k) => k + 6 === 2 * k - 6))),
  },
  39: {
    held: true,
    reason: 'The sentence drops a name: read as printed, Mohan is 3 years younger than Suresh (3, option A); read as the usual question, Aman is 3 older than Mohan and 3 younger than Suresh (6, option C). Both options are printed.',
  },
  40: { key: 'B', confidence: 'high', rule: 'Reena is 8, her father 40, and Mona 6 years younger: 34.', check: computed(5 * (5 + 3) - 6) },
  41: { key: 'A', confidence: 'high', rule: 'Profit 1,930 on 7,520 is 25.7%: about 26%.', check: computed(`${Math.round(((9450 - 7520) / 7520) * 100)}%`) },
  42: { key: 'A', confidence: 'high', rule: 'A 200% profit adds twice the cost: the price is 3 times the cost.', check: computed(`${1 + 200 / 100} times`) },
  43: { key: 'A', confidence: 'high', rule: 'Over two years the gap is P × 10% × 10% = P/100 = 732, so P = ₹ 73,200.', check: computed(rupees(Math.round(732 / (0.1 * 0.1)))) },
  44: {
    key: 'A',
    confidence: 'high',
    rule: 'G = F = 7.5, E = 15, K = 30, H = 90: K is second heaviest.',
    check: computed(Object.entries({ E: 15, F: 7.5, G: 7.5, H: 3 * 4 * 7.5, K: 4 * 7.5 }).sort((a, b) => b[1] - a[1])[1][0]),
  },
  45: { key: 'D', confidence: 'high', rule: 'K = M = 60, so O = 120, L = 40 and N = 20 kg.', check: computed(`${(60 * 2) / 3 / 2} kg`) },
  46: { key: 'D', confidence: 'high', rule: 'A is a third of 84, ₹ 28, and B half of A, ₹ 14.', check: computed(`₹ ${84 / 3} and ₹ ${84 / 3 / 2}`) },
  47: { key: 'C', confidence: 'high', rule: '14 dozen = 168, less 10 spoiled = 158, split in two: 79.', check: computed(((12 + 2) * 12 - 10) / 2) },
  48: {
    key: 'D',
    confidence: 'high',
    rule: 'Animals have 100 heads and 96 + 168 + 40 = 304 legs; each attendant adds 1 head and 2 legs. 304 + 2a = 100 + a + 216 gives a = 12.',
    check: computed(solve((a) => 48 * 2 + 42 * 4 + 10 * 4 + 2 * a === 48 + 42 + 10 + a + 216)),
  },
  49: { key: 'B', confidence: 'high', rule: '390625 = 5⁸: the 8th term.', check: computed(`${solve((n) => n > 0 && n < 30 && 5 ** n === 390625)}th`) },
  50: { key: 'B', confidence: 'high', rule: 'As Q1: 48 − s = 3s gives s = 12, so 4 years ago he was 8.', check: computed(`${solve((s) => 48 - s === 3 * s) - 4} years`) },
  51: { key: 'A', confidence: 'high', rule: '150 m in 12 s is 12.5 m/s = 45 km/h.', check: computed((150 / 12) * 3.6) },
  52: { key: 'B', confidence: 'high', rule: '50 is 10 less than 60, and half of 60 is 30. x − 10 = 30 − x gives 20.', check: computed(solve((x) => x - 10 === (50 + 10) / 2 - x)) },
  53: { key: 'B', confidence: 'high', rule: 'Six years ago Raju was 20 ÷ 2 − 2 = 8; now he is 14.', check: computed(`${20 / 2 - 2 + 6} years`) },
  54: { key: 'C', confidence: 'high', rule: 'M − 5 = 3(D − 5) and M + 5 = 2(D + 5) give D = 15.', check: computed(`${solve((d) => 3 * (d - 5) + 5 === 2 * (d + 5) - 5)} years`) },
  55: { key: 'C', confidence: 'high', rule: 'Son + 3 × son = 48: the son is 12, the father 36.', check: computed(`${3 * (48 / 4)} years`) },
  56: { key: 'D', confidence: 'high', rule: 'The largest two-digit prime is 97: 81 + 49 = 130.', check: computed(((p) => [...String(p)].reduce((s, d) => s + Number(d) ** 2, 0))(Math.max(...Array.from({ length: 90 }, (_, i) => i + 10).filter((n) => Array.from({ length: n - 2 }, (_, i) => i + 2).every((d) => n % d !== 0))))) },
  57: {
    key: 'A',
    confidence: 'high',
    rule: 'The LCM of 38 and 57 is 114; 114 × 8 + 23 = 935 is the one between 900 and 1000.',
    check: computed(solve((n) => n > 900 && n < 1000 && n % 38 === 23 && n % 57 === 23)),
  },
  58: { key: 'C', confidence: 'high', rule: 'Together they do 1/20 + 1/30 = 1/12 a day: 12 days.', check: computed(`${(20 * 30) / (20 + 30)} days`) },
  59: { key: 'D', confidence: 'high', rule: '10% go by car and 40% by bus; the other 50% walk: 1000.', check: computed(2000 * (1 - 0.1 - 0.4)) },
  60: { key: 'C', confidence: 'high', rule: '4k × 1 + 3k × 2 + 2k × 5 = 20k = 500, so k = 25: 75 two-rupee coins make ₹150.', check: computed(`₹${3 * solve((k) => 20 * k === 500) * 2}`) },
  61: { key: 'A', confidence: 'high', rule: 'Five consecutive odd numbers averaging 9: 5, 7, 9, 11, 13.', check: computed(9 - 2 * 2) },
  62: {
    key: 'B',
    confidence: 'high',
    rule: 'At least one skill: 24 + 11 + 25 − 7 − 4 − 12 + 3 = 40, so 50 − 40 = 10 know none.',
    check: computed(50 - (24 + 11 + 25 - 7 - 4 - 12 + 3)),
  },
  63: {
    key: 'A',
    confidence: 'medium',
    rule: 'Only tea = 66 − 27 (tea and coffee) − 23 (juice and tea) + 5 (all three) = 21.',
    note: '"either tea or coffee" and "coffee or juice" are read as both, as the counts only make sense that way.',
    check: computed(66 - 27 - 23 + 5),
  },
  64: { key: 'B', confidence: 'high', rule: 'Tom took 210 ÷ 42 = 5 h; Joel took 5 − 1¼ − ¼ = 3½ h: 60 km/h.', check: computed(`${210 / (210 / 42 - 1.25 - 0.25)} km/h`) },
  65: { key: 'B', confidence: 'high', rule: '200 ÷ 40 = 5 hours of driving and 1 hour of rest: 9:00 am + 6 h = 3 : 00 pm.', check: computed(`${9 + 200 / 40 + (15 + 30 + 15) / 60 - 12} : 00 pm`) },
  66: { key: 'A', confidence: 'high', rule: 'Together they close 600 km in 5 h, 120 km/h; Menon makes 120 − 65 = 55.', check: computed(`${600 / 5 - 65} km/h`) },
  67: { key: 'A', confidence: 'high', rule: '2/3 − 1/6 = 1/2 of the tank is 6 litres: 12 litres.', check: computed(`${(3 + 3) / (2 / 3 - 1 / 6)} litres`) },
  68: { key: 'B', confidence: 'high', rule: '5s + 7 = 3(s + 7) gives s = 7.', check: computed(solve((s) => 5 * s + 7 === 3 * (s + 7))) },
  69: { key: 'B', confidence: 'high', rule: 'Prabhu is 30, Ramona half that: 15.', check: computed(60 / 2 / 2) },
  70: { key: 'D', confidence: 'high', rule: 'The father is 6 × 6 = 36, the mother 4 younger: 32.', check: computed(`${6 * 6 - 4} years`) },
  71: { key: 'D', confidence: 'high', rule: 'Six hours at 30° an hour: 180°.', check: computed(`${(14 - 8) * 30}°`) },
  72: { key: 'D', confidence: 'high', rule: 'Three people each 8 years older: 87 + 24 = 111.', check: computed(87 + 3 * 8) },
  73: { key: 'B', confidence: 'high', rule: '4s + 8 = 3(s + 8) gives s = 16.', check: computed(`${solve((s) => 4 * s + 8 === 3 * (s + 8))} years`) },
  74: { key: 'A', confidence: 'high', rule: 'Raw + 3 × raw = 68: 17 raw.', check: computed(68 / 4) },
  75: { key: 'B', confidence: 'high', rule: '40 heads and 100 legs: z = (100 − 80) ÷ 2 = 10 zebras, so 30 ostriches.', check: computed(solve((o) => o <= 40 && 2 * o + 4 * (40 - o) === 100)) },
  76: { key: 'D', confidence: 'high', rule: '54 × 28 × 10 × 4 = 60,480 shirts; 250 boxes fewer is 1,000 shirts fewer: 59,480.', check: computed(54 * 28 * 10 * 4 - (500 - 250) * 4) },
  77: { key: 'B', confidence: 'high', rule: '24 gaps make 30 m, 1.25 m each; 3rd to 15th is 12 gaps: 15 m.', check: computed(`${(30 / 24) * (15 - 3)}m`) },
  78: { key: 'C', confidence: 'high', rule: 'Girls over the whole class: x/(x + y).', check: computed('x/(x + y)') },
  79: { key: 'D', confidence: 'high', rule: 'Between 5 and 9 and between 7 and 11 leaves only 8.', check: computed(['5', '6', '7', '8'].filter((n) => +n > 5 && +n < 9 && +n > 7 && +n < 11).join() || null) },
  80: { key: 'C', confidence: 'high', rule: 'Ram is 55, Raju 51, Babu 45: 60 − 45 = 15.', check: computed(60 - (60 - 5 - 4 - 6)) },
  81: { key: 'B', confidence: 'high', rule: '120 less 20% is 96; half of those died: 48.', check: computed(120 * 0.8 * 0.5) },
  82: { key: 'D', confidence: 'high', rule: 'Volumes 1 : 27 mean sides 1 : 3 and faces 1 : 9.', check: computed(`1 : ${Math.round(Math.cbrt(27)) ** 2}`) },
  83: { key: 'A', confidence: 'high', rule: 'They close at 75 km/h: 300 km in 4 hours.', check: computed(`${300 / (38 + 37)}hr.`) },
  84: { key: 'C', confidence: 'high', rule: '1/4 + 1/5 + 1/3 = 47/60, so 13 years is 13/60 of his life: 60 years.', check: computed(`${solve((x) => x > 0 && x * 15 + x * 12 + x * 20 + 13 * 60 === x * 60)} yr.`) },
  85: { key: 'B', confidence: 'high', rule: '15/20 ÷ 4/5 = 15/16; × 2/3 = 5/8; × 8/5 = 1.', check: computed((15 / 20 / (4 / 5)) * (2 / 3) * (8 / 5)) },
  86: { key: 'D', confidence: 'high', rule: 'Husband and wife, five sons, their five wives and twenty children: 32.', check: computed(2 + 5 + 5 + 5 * 4) },
  87: { key: 'D', confidence: 'high', rule: '26 × 31 − 25 × 30 = 806 − 750 = 56.', check: computed(26 * 31 - 25 * 30) },
  88: { key: 'C', confidence: 'high', rule: 'The LCM of 8, 12, 15 and 20 is 120: 120 + 2 = 122.', check: computed(lcm(8, 12, 15, 20) + 2) },
  89: { key: 'C', confidence: 'high', rule: 'One captain in every 20 people: 1500 ÷ 20 = 75.', check: computed(1500 / (19 + 1)) },
  90: {
    key: 'B',
    confidence: 'high',
    rule: 'Red = yellow = 2 × green, so red is double the green.',
    check: computed(((g) => ((y, r) => (r === y + g ? 'is equal to the sum of yellow and green balls.' : r === 2 * g ? 'is double the number of green balls.' : r === y - g ? 'is equal to yellow balls minus green balls.' : 'cannot be determined'))(2 * g, 2 * g))(3)),
  },
};
