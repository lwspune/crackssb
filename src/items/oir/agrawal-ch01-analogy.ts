import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 1 "Analogy" (pages 1-3).
 * Word analogies are reasoned. Number and letter analogies are rules written as
 * code and run on the question's own pair first (`rule` throws, failing the
 * test file, if the pair does not fit), then on the asked term. Shipped with
 * `key_basis = 'derived'` until the book's key is compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch01-analogy.source.json
 */

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const p = (c: string) => ABC.indexOf(c) + 1;
const L = (n: number) => ABC[(((n - 1) % 26) + 26) % 26];
const shifts = (w: string, ds: readonly number[]) => [...w].map((c, i) => L(p(c) + ds[i % ds.length])).join('');
const rev = (w: string) => [...w].reverse().join('');
const sorted = (w: string) => [...w].sort().join('');
const perm = (w: string, order: readonly number[]) => order.map((i) => w[i - 1]).join('');
const digits = (n: number) => [...String(n)].map(Number);

/** Run a rule on the question's own pair; a rule that does not fit stops the file loading. */
function rule<T extends string | number>(fn: (x: T) => string | number, pairs: readonly (readonly [T, string | number])[], target: T): string {
  for (const [input, output] of pairs) {
    if (String(fn(input)) !== String(output)) throw new Error(`rule turns ${input} into ${fn(input)}, not ${output}`);
  }
  return String(fn(target));
}

const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;
const reasoned = { kind: 'reasoned' } as const;
const r = (key: 'A' | 'B' | 'C' | 'D', ruleText: string) => ({ key, confidence: 'high', rule: ruleText, check: reasoned }) as const;
const c = (key: 'A' | 'B' | 'C' | 'D', ruleText: string, answer: string | number | null) => ({ key, confidence: 'high', rule: ruleText, check: computed(answer) }) as const;

export const AGRAWAL_CH01_ANALOGY: Readonly<Record<number, KeyEntry>> = {
  // ---------------------------------------------------------------- Type-1: words
  1: r('D', 'Near and close mean the same; distant means away.'),
  2: r('A', 'Flow is the opposite of stagnant; the opposite of fall is rise.'),
  3: r('B', 'A dictionary gives meanings; an encyclopedia gives knowledge.'),
  4: r('C', "Cataract affects the eye; Meniere's disease affects the ear."),
  5: r('D', 'Suva is the capital of Fiji; Helsinki is the capital of Finland.'),
  6: r('C', 'Numismatics studies coins; orography studies mountains.'),
  7: r('B', 'A monarch is a kind of butterfly; a mamba is a kind of snake.'),
  8: r('A', 'LBW ends an innings in cricket; checkmate ends a game of chess.'),
  9: r('D', 'Majority is the opposite of minority; natural is the opposite of artificial.'),
  10: r('A', 'Too high a body temperature is fever; too much body fat is obesity.'),
  11: r('D', 'A dog lives in a kennel; a chicken lives in a coop ("Coupe" in the print).'),
  12: r('A', 'A thermometer measures temperature; a protractor measures angles.'),
  13: r('C', 'Abundant is the opposite of scarce; artificial is the opposite of natural.'),
  14: r('C', 'Fluorine is a halogen; argentum (silver) is a metal.'),
  15: r('B', 'Hydrophobia is fear of water; hemophobia is fear of blood.'),
  16: r('A', 'Windows runs computers; Android runs mobiles.'),
  17: r('A', 'Bromine is a halogen; krypton is an inert gas.'),
  18: r('A', 'Greedy is the opposite of generous; the opposite of vindictive is forgiving, which "kind" comes closest to.'),
  19: r('B', 'Cardiology studies the heart; pathology studies disease.'),
  20: r('B', 'Taxonomy, selenography and pedology are each a field of study; so is eccrinology (the study of secretions).'),
  21: r('D', 'Grain is stored in a warehouse; water is stored behind a dam.'),
  22: r('A', 'A group of cattle is a herd; a group of sheep is a flock.'),
  23: {
    key: 'C',
    confidence: 'medium',
    rule: 'A school gives education; a bank gives loans.',
    note: 'A bank\'s purpose could also be read as money or deposits; "loan" is the service among the options. Check against the book key.',
    check: reasoned,
  },
  24: r('A', 'Water flows in a river; it stands stagnant in a pool.'),
  25: r('C', 'Dogs carry rabies; mosquitoes carry malaria.'),
  26: r('B', 'A poem is recited; a passage is read.'),
  27: r('B', 'Water is drawn from a well; coal is dug from a mine.'),
  28: r('D', 'A car runs on petrol; a television runs on electricity.'),
  29: r('A', 'A house gives shelter; a school gives education.'),
  30: r('A', 'Stone is hard; a feather is soft.'),
  31: r('B', 'A thermometer reads in degrees; a clock reads in hours.'),
  32: { held: true, reason: 'A furnace makes things hot; a refrigerator and an air conditioner both make things cool, and both are offered (C, D).', lean: 'C' },

  // ---------------------------------------------------------------- Type-2: numbers
  33: c('B', 'Half the number, plus 1: 58 → 30, 116 → 59.', rule((n: number) => n / 2 + 1, [[58, 30]], 116)),
  34: c('D', 'n² + (n + 1)²: 81 + 100 = 181; 196 + 225 = 421.', rule((n: number) => n * n + (n + 1) ** 2, [[9, 181]], 14)),
  35: { held: true, reason: 'No rule found that takes 6294 to 32 and 4381 to any option: digit sums, products, pair sums and squares of the digits all miss.' },
  36: c('C', 'Add the two halves (47 + 51 = 98) and write the sum reversed, then as is: 8998. 52 + 36 = 88 → 8888.', rule((n: number) => { const s = Math.floor(n / 100) + (n % 100); return `${rev(String(s))}${s}`; }, [[4751, '8998']], 5236)),
  37: c('C', '(n − 3)³: 12 → 9³ = 729; 9 → 6³ = 216.', rule((n: number) => (n - 3) ** 3, [[12, 729]], 9)),
  38: c('D', 'n³ + n: 5 → 130, 9 → 738, so 6 → 216 + 6 = 222.', rule((n: number) => n ** 3 + n, [[5, 130], [9, 738]], 6)),
  39: c('C', '8n²: 4 → 128, 18 → 2592, so 11 → 968.', rule((n: number) => 8 * n * n, [[4, 128], [18, 2592]], 11)),
  40: c('C', 'n(n − 3) + 4: 8 → 44, 11 → 92, so 5 → 14.', rule((n: number) => n * (n - 3) + 4, [[8, 44], [11, 92]], 5)),
  41: c('A', '(n + 1)²: 15 → 256, 14 → 225.', rule((n: number) => (n + 1) ** 2, [[15, 256]], 14)),
  42: c('A', 'n²: 108² = 11664, 107² = 11449.', rule((n: number) => n * n, [[108, 11664]], 107)),
  43: c('A', 'n²: 105² = 11025, 109² = 11881.', rule((n: number) => n * n, [[105, 11025]], 109)),
  44: c('A', 'n² + 1: 10 → 101, 12 → 145.', rule((n: number) => n * n + 1, [[10, 101]], 12)),
  45: c('A', 'The sum of the digits: 3 + 4 + 7 + 6 = 20; 4 + 2 + 3 + 5 = 14.', rule((n: number) => digits(n).reduce((s, d) => s + d, 0), [[3476, 20]], 4235)),
  46: c('A', 'n²: 107² = 11449, 109² = 11881.', rule((n: number) => n * n, [[107, 11449]], 109)),
  47: c('A', '(n + 2)²: 7 → 81; of the pairs only 10 → 144 fits.', ([[10, 144], [12, 169], [9, 131], [11, 225]] as const).filter(([a, b]) => (a + 2) ** 2 === b && (7 + 2) ** 2 === 81).map(([a, b]) => `${a} : ${b}`)[0] ?? null),
  48: c('A', 'n²: 102² = 10404, 107² = 11449.', rule((n: number) => n * n, [[102, 10404]], 107)),
  49: c('A', 'n³: 12³ = 1728, 17³ = 4913.', rule((n: number) => n ** 3, [[12, 1728]], 17)),
  50: c('A', 'n(n + 2): 7 → 63, 11 → 143.', rule((n: number) => n * (n + 2), [[7, 63]], 11)),
  51: { held: true, reason: '121 → 1331 (11² → 11³, or ×11, or adding neighbouring digits) gives 1551 or similar for 141, none of the options.' },
  52: c('B', 'The product of the digits: 3 × 6 × 5 = 90; 6 × 2 × 3 = 36.', rule((n: number) => digits(n).reduce((s, d) => s * d, 1), [[365, 90]], 623)),
  53: c('C', 'n² − 4: 12 → 140, 29 → 837.', rule((n: number) => n * n - 4, [[12, 140]], 29)),
  54: c('A', '(n / 2)²: 24 → 144, 52 → 676.', rule((n: number) => (n / 2) ** 2, [[24, 144]], 52)),
  55: c('D', '385, 473 and 143 are all multiples of 11; of the options only 253 (11 × 23) is.', ['180', '221', '270', '253'].filter((x) => Number(x) % 11 === 0 && [385, 473, 143].every((g) => g % 11 === 0))[0] ?? null),
  56: c('D', 'The sum of the squares of the digits: 4 + 4 + 1 + 1 = 10; 1 + 16 + 4 + 9 = 30.', rule((n: number) => digits(n).reduce((s, d) => s + d * d, 0), [[2211, 10]], 1423)),
  57: c('A', 'n(n + 5): 17 × 22 = 374; 29 × 34 = 986.', rule((n: number) => n * (n + 5), [[17, 374]], 29)),
  58: {
    key: 'B',
    confidence: 'medium',
    rule: 'n²: 1 → 1, 25 → 625.',
    note: '1 : 1 fits any power; squaring is the plain reading and the only one with an option (25³ = 15625 is not offered). Check against the book key.',
    check: computed(rule((n: number) => n * n, [[1, 1]], 25)),
  },
  59: c('D', 'A cube to the next cube plus 1: 8 = 2³ → 3³ + 1 = 28; 27 = 3³ → 4³ + 1 = 65.', rule((n: number) => (Math.round(Math.cbrt(n)) + 1) ** 3 + 1, [[8, 28]], 27)),
  60: c('B', '(n − 1) / 2: 85 → 42, 139 → 69.', rule((n: number) => (n - 1) / 2, [[85, 42]], 139)),
  61: c('C', '× 1.5: 18 → 27, 60 → 90.', rule((n: number) => n * 1.5, [[18, 27]], 60)),
  62: c('C', 'n² + 2: 3 → 11, 7 → 51.', rule((n: number) => n * n + 2, [[3, 11]], 7)),
  63: c('B', '÷ 9: 27 → 3, 873 → 97.', rule((n: number) => n / 9, [[27, 3]], 873)),
  64: { held: true, reason: '8 = 2³ and 64 = 4³: doubling the root gives 27 → 6³ = 216 (not offered; B prints 212), adding 2 gives 5³ = 125 (C). Two rules, two answers.', lean: 'C' },
  65: c('D', 'A cube to the next number to the fourth power: 8 = 2³ → 3⁴ = 81; 64 = 4³ → 5⁴ = 625.', rule((n: number) => (Math.round(Math.cbrt(n)) + 1) ** 4, [[8, 81]], 64)),

  // ---------------------------------------------------------------- Type-3: letters
  66: c('A', 'Each letter 5 back: SUS → NPN.', rule((w: string) => shifts(w, [-5]), [['AZC', 'VUX']], 'SUS')),
  67: c('C', 'Each letter 4 on: MNO → QRS.', rule((w: string) => shifts(w, [4]), [['EFG', 'IJK']], 'MNO')),
  68: c('B', '+2, −2, −2, +2: FUSH → HSQJ.', rule((w: string) => shifts(w, [2, -2, -2, 2]), [['BYWD', 'DWUF']], 'FUSH')),
  69: c('C', '−4, +4 alternately: ICESHOW → EGAWDSS.', rule((w: string) => shifts(w, [-4, 4]), [['RAILCAR', 'NEEPYEN']], 'ICESHOW')),
  70: c('A', '−4, −4, +4, +4 repeating: COMMERCIAL → YKQQANGMWH.', rule((w: string) => shifts(w, [-4, -4, 4, 4]), [['CUSTOMER', 'YQWXKIIV']], 'COMMERCIAL')),
  71: c('B', 'Each half reversed and moved 3 on, second half first: SHEE PDOG → JRGS HHKV.', rule((w: string) => { const h = w.length / 2; return shifts(rev(w.slice(h)), [3]) + shifts(rev(w.slice(0, h)), [3]); }, [['PHONETIC', 'FLWHQRKS']], 'SHEEPDOG')),
  72: c('C', '+1, +2, +3, +4, +5, +6: LOANER → MQDRJX.', rule((w: string) => shifts(w, [1, 2, 3, 4, 5, 6]), [['CANVAS', 'DCQZFY']], 'LOANER')),
  73: c('B', 'Each letter 1 on, then in alphabetical order: NARROWS → OBSSPXT → BOPSSTX.', rule((w: string) => sorted(shifts(w, [1])), [['CONCEPT', 'DDFOPQU']], 'NARROWS')),
  74: { held: true, reason: 'The question gives one pair and nothing to complete ("CEGI : IKMO :: ?"); no option can be chosen from it.' },
  75: { held: true, reason: 'LATYE has five letters and NETAEO six, so the rearrangement read off the pair (4, 3, 1, 5, 2) cannot be applied.' },
  76: c('B', 'Letters 5, 1, 3, 4, 2, 6: PARENF → NPREAF.', rule((w: string) => perm(w, [5, 1, 3, 4, 2, 6]), [['LARTBZ', 'BLRTAZ']], 'PARENF')),
  77: c('C', 'In alphabetical order, then +0, +1, +2, +3, +4, +5: ZWURST → RSTUWZ → RTVXAE.', rule((w: string) => shifts(sorted(w), [0, 1, 2, 3, 4, 5]), [['NEUTSE', 'EFPVXZ']], 'ZWURST')),
  78: c('B', 'In alphabetical order, then +1, +2, +3…: JGFSGR → FGGJRS → GIJNWY.', rule((w: string) => shifts(sorted(w), [1, 2, 3, 4, 5, 6]), [['DURDG', 'EFJVZ']], 'JGFSGR')),
  79: c('B', '+6, −4, +3, +4, +5: UISRY → AEVVD.', rule((w: string) => shifts(w, [6, -4, 3, 4, 5]), [['OESTD', 'UAVXI']], 'UISRY')),
  80: c('D', 'Each letter and its code add to 26 by position (G 7 + S 19): MNGB → MLSX.', rule((w: string) => [...w].map((ch) => L(26 - p(ch))).join(''), [['GKNR', 'SOLH']], 'MNGB')),
  81: c('A', 'Each letter 1 back: MORE → LNQD.', rule((w: string) => shifts(w, [-1]), [['ROME', 'QNLD']], 'MORE')),
  82: c('B', '+4, −4, +6: NOS → RKY.', rule((w: string) => shifts(w, [4, -4, 6]), [['ABC', 'EXI']], 'NOS')),
  83: c('A', 'Each letter 1 back: RENT → QDMS.', rule((w: string) => shifts(w, [-1]), [['ROOM', 'QNNL']], 'RENT')),
  84: c('A', 'Each letter becomes its opposite (A↔Z): CHEMISTRY → XSVNRHGIB.', rule((w: string) => [...w].map((ch) => L(27 - p(ch))).join(''), [['PHYSICS', 'KSBHRXH']], 'CHEMISTRY')),
  85: c('A', 'Each letter 1 back: LESS → KDRR.', rule((w: string) => shifts(w, [-1]), [['CORD', 'BNQC']], 'LESS')),
  86: c('A', '−1, +1 alternately: GARDEN → FBQEDO.', rule((w: string) => shifts(w, [-1, 1]), [['HANGER', 'GBMHDS']], 'GARDEN')),
  87: c('A', 'Each letter 1 on: WHERE → XIFSF.', rule((w: string) => shifts(w, [1]), [['GOING', 'HPJOH']], 'WHERE')),
  88: { held: true, reason: 'FASTER → GZTUDS is +1, −1, +1, +1, −1, +1, which turns BOXING into CNYJMH; no option matches, and no other rule found fits both.', lean: 'B' },
  89: c('A', '−6, +1, −4: RON → LPJ.', rule((w: string) => shifts(w, [-6, 1, -4]), [['GDC', 'AEY']], 'RON')),
  90: c('A', 'Each letter 16 on: BACD → RQST.', rule((w: string) => shifts(w, [16]), [['ABCD', 'QRST']], 'BACD')),
  91: c('B', '+1, −1, +2: RMS → SLU.', rule((w: string) => shifts(w, [1, -1, 2]), [['KMF', 'LLH']], 'RMS')),
  92: c('A', '+1, +3, +5: BIG → CLL.', rule((w: string) => shifts(w, [1, 3, 5]), [['CAT', 'DDY']], 'BIG')),
  93: c('B', 'Each letter 2 on: RIGHT → TKIJV.', rule((w: string) => shifts(w, [2]), [['LEFT', 'NGHV']], 'RIGHT')),
  94: c('A', 'Each letter 3 back: TAXI → QXUF.', rule((w: string) => shifts(w, [-3]), [['SUMO', 'PRJL']], 'TAXI')),
  95: c('B', 'Each letter 8 on: UBZX → CJHF.', rule((w: string) => shifts(w, [8]), [['ELJH', 'MTRP']], 'UBZX')),
  96: { held: true, reason: 'RACE → FACE can be "R becomes F" (CARE → CAFE, B) or "the first letter becomes F" (CARE → FARE, A); the pair does not decide.', lean: 'B' },
  97: c('C', 'The word reversed: FRUITS → STIURF.', rule((w: string) => rev(w), [['FLOWER', 'REWOLF']], 'FRUITS')),
  98: c('C', 'Each letter 2 on: AYRRJC → CATTLE, so NCPDCAR → PERFECT.', rule((w: string) => shifts(w, [2]), [['AYRRJC', 'CATTLE']], 'NCPDCAR')),
};
