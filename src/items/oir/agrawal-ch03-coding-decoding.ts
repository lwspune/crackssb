import { charMap, solveCodes } from './check.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 3 "Coding Decoding"
 * (pages 9-14). Each rule is written as code and run on the book's own
 * examples first (`rule` throws, failing the test file, if it does not
 * reproduce them), then on the question's word. Phrase codes are solved by
 * intersection (`solveCodes`). Shipped with `key_basis = 'derived'` until the
 * book's key is compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch03-coding-decoding.source.json
 */

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** A = 1 … Z = 26. */
const p = (c: string) => ABC.indexOf(c.toUpperCase()) + 1;
/** Back from a number to a letter, round the alphabet either way. */
const L = (n: number) => ABC[(((n - 1) % 26) + 26) % 26];
/** Z = 1 … A = 26. */
const rp = (c: string) => 27 - p(c);
const rev = (w: string) => [...w].reverse().join('');
const sorted = (w: string) => [...w].sort().join('');
const sum = (w: string, f: (c: string) => number = p) => [...w].reduce((s, c) => s + f(c), 0);
/** Shift each letter; the shifts repeat when the word is longer than the list. */
const shifts = (w: string, ds: readonly number[]) => [...w].map((c, i) => L(p(c) + ds[i % ds.length])).join('');
/** Rearrange by 1-based positions. */
const perm = (w: string, order: readonly number[]) => order.map((i) => w[i - 1]).join('');
const atbash = (c: string) => L(27 - p(c));
/** Digital root, with 0 staying 0. */
const dr = (n: number) => (n === 0 ? 0 : 1 + ((n - 1) % 9));
const isVowel = (c: string) => 'AEIOU'.includes(c.toUpperCase());

/** Run a rule on the book's examples first; a rule that does not reproduce them stops the file loading. */
function rule<T extends string | number>(fn: (w: string) => T, examples: readonly (readonly [string, T])[], target: string): T {
  for (const [input, output] of examples) {
    const got = fn(input);
    if (String(got).replace(/[\s-]/g, '') !== String(output).replace(/[\s-]/g, '')) throw new Error(`rule turns ${input} into ${got}, not ${output}`);
  }
  return fn(target);
}

/** The single code each word of `target` has, from phrase pairs. Throws when a word is not pinned. */
type Split = { readonly words: ' ' | ''; readonly codes: ' ' | '' };
const SS: Split = { words: ' ', codes: ' ' };

function codesOf(pairs: readonly (readonly [string, string])[], target: string, split: Split = SS): string[] {
  const solved = solveCodes(pairs, split);
  const words = split.words === '' ? [...target] : target.split(' ');
  return words.map((w) => {
    const set = solved.get(w);
    if (!set || set.size !== 1) throw new Error(`"${w}" is not pinned: ${set ? [...set].join(', ') : 'unseen'}`);
    return [...set][0];
  });
}

/** The words whose codes are `codes`, from phrase pairs (decoding). */
function wordsOf(pairs: readonly (readonly [string, string])[], codes: readonly string[], split: Split = SS): string[] {
  const solved = solveCodes(pairs, split);
  return codes.map((code) => {
    const words = [...solved].filter(([, set]) => set.size === 1 && set.has(code)).map(([w]) => w);
    if (words.length !== 1) throw new Error(`code "${code}" is not pinned to one word: ${words.join(', ')}`);
    return words[0];
  });
}

const computed = (answer: string | number | null) => ({ kind: 'computed', answer }) as const;
const codeSet = (codes: readonly string[], sep: '' | ' ') => ({ kind: 'codeSet', codes, sep }) as const;
const reasoned = { kind: 'reasoned' } as const;
const WD: Split = { words: ' ', codes: '' };
const DW: Split = { words: '', codes: ' ' };
const CC: Split = { words: '', codes: '' };

export const AGRAWAL_CH03_CODING_DECODING: Readonly<Record<number, KeyEntry>> = {
  1: { key: 'C', confidence: 'high', rule: 'Letters 5, 4, 6, 2, 1, 3 in that order: RESULT → LUTERS, BARLEY → ELYABR, HEAVEN → EVNEHA.', check: computed(rule((w) => perm(w, [5, 4, 6, 2, 1, 3]), [['RESULT', 'LUTERS'], ['BARLEY', 'ELYABR']], 'HEAVEN')) },
  2: { key: 'B', confidence: 'high', rule: 'The word reversed: DOCTOR → ROTCOD.', check: computed(rule(rev, [['DANGER', 'REGNAD'], ['DETAIL', 'LIATED']], 'DOCTOR')) },
  3: { key: 'B', confidence: 'high', rule: 'The word reversed: HARBOUR → RUOBRAH.', check: computed(rule(rev, [['HUSBAND', 'DNABSUH'], ['CLEARLY', 'YLRAELC']], 'HARBOUR')) },
  4: { key: 'A', confidence: 'high', rule: 'Letters 8, 7, 2, 1, 6, 5, 4, 3: LEFTWING → GNELIWTF.', check: computed(rule((w) => perm(w, [8, 7, 2, 1, 6, 5, 4, 3]), [['EXTRNSIC', 'CIXESNRT']], 'LEFTWING')) },
  5: { key: 'A', confidence: 'high', rule: 'First three reversed, the middle letter kept, last three reversed: MEDICAL → DEM I LAC.', check: computed(rule((w) => perm(w, [3, 2, 1, 4, 7, 6, 5]), [['EDITION', 'IDETNOI']], 'MEDICAL')) },
  6: { key: 'C', confidence: 'high', rule: 'The letters in alphabetical order: STOMACH → ACHMOST.', check: computed(rule(sorted, [['SHOULDER', 'DEHLORSU']], 'STOMACH')) },
  7: { held: true, reason: 'FLAVOR has six letters but its code VUROLFA has seven, so no letter-for-letter rule can be read off the example.' },
  8: { key: 'B', confidence: 'high', rule: 'The letters in alphabetical order: REMOVAL → AELMORV.', check: computed(rule(sorted, [['DIAGNOSE', 'ADEGINOS']], 'REMOVAL')) },
  9: { key: 'C', confidence: 'high', rule: 'Each half sorted: GRAC → ACGR, EFUL → EFLU.', check: computed(rule((w) => sorted(w.slice(0, 4)) + sorted(w.slice(4)), [['OCTAGRAM', 'ACOTAGMR']], 'GRACEFUL')) },
  10: {
    key: 'D',
    confidence: 'high',
    rule: 'Split into threes and reverse each (STA TEM ENT → ATS MET TNE), then write the second, third and first: METTNEATS.',
    check: computed(rule((w) => { const t = [w.slice(0, 3), w.slice(3, 6), w.slice(6)].map(rev); return t[1] + t[2] + t[0]; }, [['RATIONALE', 'NOIELATAR']], 'STATEMENT')),
  },
  11: { key: 'B', confidence: 'high', rule: 'The word reversed: CHURCH → HCRUHC.', check: computed(rule(rev, [['TEMPLE', 'ELPMET']], 'CHURCH')) },
  12: { key: 'C', confidence: 'high', rule: '+2, +3, +2, +3: HAND → JDPG.', check: computed(rule((w) => shifts(w, [2, 3]), [['HEAD', 'JHCG'], ['NOSE', 'PRUH']], 'HAND')) },
  13: { key: 'C', confidence: 'high', rule: '+2, +3 alternately, round the alphabet: VIJAY → XLLDA.', check: computed(rule((w) => shifts(w, [2, 3]), [['PARUL', 'RDTXN'], ['MADHU', 'ODFKW']], 'VIJAY')) },
  14: { key: 'D', confidence: 'high', rule: 'First three +1, middle two kept, last three +2: JUNCTION → KVOCTKQP.', check: computed(rule((w) => shifts(w, [1, 1, 1, 0, 0, 2, 2, 2]), [['MERCHANT', 'NFSCHCPV'], ['INTERIOR', 'JOUERKQT']], 'JUNCTION')) },
  15: { key: 'B', confidence: 'high', rule: 'Reverse the word and write each letter\'s position + 2: DIG → G I D → 9 11 6.', check: computed(rule((w) => [...rev(w)].map((c) => p(c) + 2).join(''), [['EAR', '2037'], ['PBU', '23418']], 'DIG')) },
  16: { key: 'D', confidence: 'high', rule: '+1, +2, +3, −1, −2, −3: LATENT → MCWDLQ.', check: computed(rule((w) => shifts(w, [1, 2, 3, -1, -2, -3]), [['BUTTER', 'CWWSCO'], ['THEORY', 'UJHNPV']], 'LATENT')) },
  17: { key: 'C', confidence: 'high', rule: 'Each letter −3 (HOME → ELJB), so ARHB comes from adding 3 back: DUKE.', check: computed(rule((w) => shifts(w, [-3]), [['HOME', 'ELJB']], 'DUKE') === 'ARHB' ? 'DUKE' : null) },
  18: { key: 'B', confidence: 'high', rule: 'Each letter +16 (10 back), round the alphabet: ANGLE → QDWBU.', check: computed(rule((w) => shifts(w, [16]), [['BURMUD', 'RKHCKT']], 'ANGLE')) },
  19: { key: 'C', confidence: 'high', rule: '−2, −4 alternately: SHOP → QDML.', check: computed(rule((w) => shifts(w, [-2, -4]), [['ROCK', 'PKAG'], ['CLUB', 'AHSX']], 'SHOP')) },
  20: { key: 'C', confidence: 'high', rule: '−3, −4 alternately: TEAM → QAXI.', check: computed(rule((w) => shifts(w, [-3, -4]), [['LAND', 'IWKZ'], ['GOLD', 'DKIZ']], 'TEAM')) },
  21: { key: 'C', confidence: 'high', rule: '+5, −6 alternately: FITAND → KCYUSX.', check: computed(rule((w) => shifts(w, [5, -6]), [['STOPER', 'XNTJJL'], ['GANOPY', 'LUSIUS']], 'FITAND')) },
  22: { key: 'A', confidence: 'high', rule: '+4, +5 alternately: GREASE → KWIFWJ.', check: computed(rule((w) => shifts(w, [4, 5]), [['WHEAT', 'AMIFX'], ['BLACK', 'FQEHO']], 'GREASE')) },
  23: {
    key: 'C',
    confidence: 'medium',
    rule: 'Reverse the word, then +3, −3 alternately: BUFFALO → OLAFFUB → RIDCIRE; LEOPARD → DRAPOEL → GODMRBO.',
    note: 'The CHEETAH example does not fit: the rule gives KXWBHEF, the print KXBHBEF (three letters differ). BUFFALO fits exactly. Check against the book key.',
    check: computed(rule((w) => shifts(rev(w), [3, -3]), [['BUFFALO', 'RIDCIRE']], 'LEOPARD')),
  },
  24: { key: 'A', confidence: 'high', rule: 'Reverse the word, then +2, −2, +4, −4, +6, −6, +8: GARNISH → HSINRAG → JQMJXUO.', check: computed(rule((w) => shifts(rev(w), [2, -2, 4, -4, 6, -6, 8]), [['PROJECT', 'VAIFULX'], ['INDULGE', 'GEPQJHQ']], 'GARNISH')) },
  25: {
    key: 'B',
    confidence: 'high',
    rule: 'In YBA, PSR and MPO the second letter is 3 after the first and the third is 1 before the second (Y → B round the alphabet). TUX does not follow it.',
    check: computed(['YBA', 'TUX', 'PSR', 'MPO'].filter((g) => !(L(p(g[0]) + 3) === g[1] && L(p(g[1]) - 1) === g[2]))[0] ?? null),
  },
  26: { key: 'A', confidence: 'high', rule: '+1, −1 alternately: BANNED → CZOMFC.', check: computed(rule((w) => shifts(w, [1, -1]), [['RESTED', 'SDTSFC'], ['POINTS', 'QNJMUR']], 'BANNED')) },
  27: { held: true, reason: 'No rule found that turns NORMAL into DIPKRO and SOUND into GKRPX: the shifts differ position to position and between the two words, and no rearrangement fits.' },
  28: {
    key: 'D',
    confidence: 'high',
    rule: 'After the first letter add the next one; before the last letter add the one before it: FIT → F G I S T, JOY → J K O X Y.',
    check: computed(rule((w) => w[0] + L(p(w[0]) + 1) + w.slice(1, -1) + L(p(w.at(-1)!) - 1) + w.at(-1), [['FIT', 'FGIST'], ['KIN', 'KLIMN']], 'JOY')),
  },
  29: { key: 'A', confidence: 'high', rule: 'Letters 1 + 2, letter 3, letters 4 + 5 by position: ARMED → A+R = S, M, E+D = I.', check: computed(rule((w) => L(p(w[0]) + p(w[1])) + w[2] + L(p(w[3]) + p(w[4])), [['FLOAT', 'ROU'], ['CLAIM', 'OAV']], 'ARMED')) },
  30: { key: 'D', confidence: 'high', rule: 'Each letter becomes its opposite (A↔Z) followed by the next letter: B → Y C, I → R J, G → T H.', check: computed(rule((w) => [...w].map((c) => atbash(c) + L(p(c) + 1)).join(''), [['PLUM', 'KQOMFVNN']], 'BIG')) },
  31: { key: 'B', confidence: 'high', rule: 'Sum of letter positions + 2: SELF = 19 + 5 + 12 + 6 + 2 = 44.', check: computed(rule((w) => sum(w) + 2, [['MAKE', 32], ['QUAD', 45]], 'SELF')) },
  32: { key: 'B', confidence: 'high', rule: 'Sum of letter positions − 15: DEVOUR = 85 − 15 = 70.', check: computed(rule((w) => sum(w) - 15, [['PROVED', 65], ['REMOVER', 81]], 'DEVOUR')) },
  33: { key: 'A', confidence: 'high', rule: 'Letter positions, +1 on the 1st, 3rd, 5th…: BETTER → 3 5 21 20 6 18.', check: computed(rule((w) => [...w].map((c, i) => p(c) + (i % 2 === 0 ? 1 : 0)).join(''), [['FIRST', '79191921'], ['TIME', '219145']], 'BETTER')) },
  34: { key: 'C', confidence: 'high', rule: 'Sum of letter positions: RAVISHED = 86.', check: computed(rule((w) => sum(w), [['MORBID', 61], ['PARIAH', 53]], 'RAVISHED')) },
  35: { key: 'D', confidence: 'high', rule: 'Twice the sum of letter positions: GRANTED = 2 × 69 = 138.', check: computed(rule((w) => 2 * sum(w), [['PARENT', 148], ['WRANGLE', 160]], 'GRANTED')) },
  36: { key: 'B', confidence: 'high', rule: 'Each letter\'s position + 2: SHARK → 21 10 3 20 13.', check: computed(rule((w) => [...w].map((c) => p(c) + 2).join(''), [['WHALE', '25103147']], 'SHARK')) },
  37: { key: 'C', confidence: 'high', rule: 'The number of letters: EIGHT → 5.', check: computed(rule((w) => w.length, [['TWO', 3], ['FIVE', 4]], 'EIGHT')) },
  38: { key: 'D', confidence: 'high', rule: 'Each letter\'s position reduced to one digit (R = 18 → 9): QUEEN → 8 3 5 5 5.', check: computed(rule((w) => [...w].map((c) => dr(p(c))).join(''), [['TARGET', '219752'], ['PRIZE', '79985']], 'QUEEN')) },
  39: { key: 'B', confidence: 'high', rule: 'Sum of letter positions: KIDNAP = 55.', check: computed(rule((w) => sum(w), [['REFUSE', 74]], 'KIDNAP')) },
  40: { key: 'A', confidence: 'high', rule: 'Three times the sum of letter positions: PADM = 3 × 34 = 102.', check: computed(rule((w) => 3 * sum(w), [['TORQ', 210], ['HARN', 123]], 'PADM')) },
  41: { key: 'B', confidence: 'high', rule: 'The number of vowels: ABSENCE has A, E, E: 3.', check: computed(rule((w) => [...w].filter(isVowel).length, [['ELITE', 3], ['BLUE', 2]], 'ABSENCE')) },
  42: { key: 'B', confidence: 'high', rule: 'Sum of letter positions with its digits reversed: PRACTICE = 75 → 57.', check: computed(rule((w) => Number(rev(String(sum(w)))), [['BASEBALL', 45], ['FEEDBACK', 73]], 'PRACTICE')) },
  43: { key: 'C', confidence: 'high', rule: 'Consonants by alphabet position, vowels by vowel order (A 1, E 2, I 3, O 4, U 5): URANUS → 5 18 1 14 5 19.', check: computed(rule((w) => [...w].map((c) => (isVowel(c) ? 'AEIOU'.indexOf(c) + 1 : p(c))).join(''), [['FORCE', '641832'], ['MIST', '1331920']], 'URANUS')) },
  44: { key: 'B', confidence: 'high', rule: 'Sum of reverse positions (Z = 1): PEGION = 11 + 22 + 20 + 18 + 12 + 13 = 96.', check: computed(rule((w) => sum(w, rp), [['DONKEY', 88], ['SPARROW', 79]], 'PEGION')) },
  45: { key: 'D', confidence: 'high', rule: 'Sum of letter positions + the number of letters: CLEVER = 65 + 6 = 71.', check: computed(rule((w) => sum(w) + w.length, [['BANK', 32], ['BRAKE', 42]], 'CLEVER')) },
  46: { key: 'D', confidence: 'high', rule: 'Sum of letter positions + 6: BIB = 13 + 6 = 19.', check: computed(rule((w) => sum(w) + 6, [['HUT', 55], ['MAT', 40]], 'BIB')) },
  47: { key: 'A', confidence: 'high', rule: 'Sum of reverse positions (Z = 1) + 5: LABEL = 103 + 5 = 108.', check: computed(rule((w) => sum(w, rp) + 5, [['RUBBER', 101], ['JELLY', 76]], 'LABEL')) },
  48: { key: 'B', confidence: 'high', rule: 'Sum of letter positions + 3: DROP = 53 + 3 = 56.', check: computed(rule((w) => sum(w) + 3, [['RAIN', 45], ['GOOD', 44]], 'DROP')) },
  49: { key: 'B', confidence: 'high', rule: 'Consonants at twice their position, vowels at their position: MAIL → 26 1 9 24.', check: computed(rule((w) => [...w].map((c) => (isVowel(c) ? p(c) : 2 * p(c))).join(''), [['HELP', '1652432'], ['SAVE', '381445']], 'MAIL')) },
  50: { key: 'C', confidence: 'high', rule: 'The word reversed, each letter as its position: LEADER → R E D A E L → 18 5 4 1 5 12.', check: computed(rule((w) => [...rev(w)].map(p).join(' '), [['FAMOUS', '19 21 15 13 1 6'], ['GARDEN', '14 5 4 18 1 7']], 'LEADER')) },
  51: { key: 'C', confidence: 'high', rule: 'The Eiffel Tower is in France, and France is called Italy.', check: reasoned },
  52: { key: 'C', confidence: 'high', rule: 'We write on a notebook, and a notebook is called a bag.', check: reasoned },
  53: { key: 'B', confidence: 'high', rule: 'Blood is red, and red is called tomato.', check: reasoned },
  54: { key: 'B', confidence: 'high', rule: 'Plants grow in soil, and soil is called white.', check: reasoned },
  55: { key: 'D', confidence: 'high', rule: 'The sun gives light and heat, and the sun is called river.', check: reasoned },
  56: { key: 'A', confidence: 'high', rule: 'Turmeric is yellow, and yellow is called red.', check: reasoned },
  57: { key: 'D', confidence: 'high', rule: 'Rice is edible, and rice is called bank.', check: reasoned },
  58: {
    key: 'A',
    confidence: 'medium',
    rule: 'Of the fruits named, orange is the sour one, and orange is called guava.',
    note: 'Read as asking for the sour fruit\'s code name. Check against the book key.',
    check: reasoned,
  },
  59: { key: 'B', confidence: 'high', rule: "'door' is potato (in both door phrases), so 'tower' is mountain.", check: codeSet(codesOf([['war door', 'plane potato'], ['cauliflower war', 'racecar plane'], ['door tower', 'potato mountain']], 'tower'), ' ') },
  60: { key: 'B', confidence: 'high', rule: "'she' is bo and 'late' is lu, so 'arrived' is ka.", check: codeSet(codesOf([['he is late', 'ah hu lu'], ['she is expected', 'bo hu ma'], ['she arrived late', 'bo ka lu']], 'arrived'), ' ') },
  61: { key: 'A', confidence: 'high', rule: "'he' is ar and 'move' is ba, so 'must' is du.", check: codeSet(codesOf([['he came forward', 'ar ka mu'], ['move forward', 'ba mu'], ['he must move', 'ar du ba']], 'must'), ' ') },
  62: { key: 'A', confidence: 'high', rule: "'sweet' is de and 'is' is ke, so 'mango' is me.", check: codeSet(codesOf([['sweet fruits', 're de'], ['mango is sweet', 'de me ke'], ['orange is citrus', 'ke le pe'], ['eat orange', 'pe ne']], 'mango'), ' ') },
  63: { key: 'D', confidence: 'high', rule: "'is' is mu and 'radish' is ru, so 'white' is ku.", check: codeSet(codesOf([['red ribbon', 'cu du'], ['apple is red', 'nu mu cu'], ['radish is white', 'mu ku ru'], ['eat radish', 'ru pu']], 'white'), ' ') },
  64: { key: 'C', confidence: 'high', rule: "'are' is ku and 'bright' is wu, so 'days' is tu.", check: codeSet(codesOf([['dark colurs', 'yu nu'], ['days are bright', 'wu tu ku'], ['nights are dark', 'ku nu pu'], ['paint bright', 'wu ru']], 'days'), ' ') },
  65: { key: 'D', confidence: 'high', rule: "'is' is ke and 'orange' is pe, so 'citrus' is le.", check: codeSet(codesOf([['sweet fruits', 're de'], ['mango is sweet', 'de me ke'], ['orange is citrus', 'ke le pe'], ['eat orange', 'pe ne']], 'citrus'), ' ') },
  66: { key: 'A', confidence: 'high', rule: "'son's' is fu and 'our' is da, so 'car' is be; 'today' is la, so 'match' is he.", check: codeSet(codesOf([["our son's car", 'fu da be'], ["son's birthday today", 'la fu ja'], ['today our match', 'he da la']], 'car match'), ' ') },
  67: { key: 'A', confidence: 'high', rule: "'he' is ka and 'was' is va, so 'hungry' is da.", check: codeSet(codesOf([['he called them', 'ka ba ma'], ['I was called', 'ga va ba'], ['he was hungry', 'ka va da']], 'hungry'), ' ') },
  68: { key: 'A', confidence: 'high', rule: "'are' is duk and 'people' is lur, so 'confident' is bur.", check: codeSet(codesOf([['people are confident', 'lur bur duk'], ['we are helpful', 'kur duk sur'], ['we have cars', 'sur mur jur'], ['people have honesty', 'lur jur nur']], 'confident'), ' ') },
  69: { held: true, reason: 'No rule found linking ONE DAY AT A TIME (five words) to J21 SN5N3N 3LGI (three groups); no reading of the groups fits the words.' },
  70: { key: 'C', confidence: 'high', rule: "'mistake' is 2 (in both mistake phrases), so 'my' is 6; 'nice' is 5, so 'shoes' is 4. 'my shoes' is 46.", check: codeSet(codesOf([['my mistake', '62'], ['nice shoes', '45'], ['people are nice', '135'], ['big mistake', '29']], 'my shoes', WD), '') },
  71: {
    key: 'D',
    confidence: 'high',
    rule: "'chips' is pur, so 'contain metal' is st and mo between them, and nothing says which is which.",
    check: computed([...solveCodes([['chips are good', 'lo pur tan'], ['soul are mate', 'tan fu gil'], ['chips contain metal', 'pur st mo']]).get('contain')!].join(' or ')),
  },
  72: { key: 'A', confidence: 'high', rule: "'is' is 6 (in all three), 'friend' 2, 'ill' 7, 'my' 5, so 'aunt' is 3.", check: codeSet(codesOf([['he is my friend', '5692'], ['my aunt is ill', '7635'], ['friend is ill', '627']], 'aunt', WD), '') },
  73: { key: 'C', confidence: 'high', rule: "'is' is mu and 'she' is hu, so 'emotional' is ru.", check: codeSet(codesOf([['honest persons', 'yu du'], ['he is honest', 'du mu cu'], ['she is emotional', 'mu hu ru'], ['she left', 'hu nu']], 'emotional'), ' ') },
  74: { key: 'A', confidence: 'high', rule: "'Are' is ga and 'People' is pa, so 'sa' is Angry; 'so' is Now (in both Now phrases).", check: codeSet(wordsOf([['doors are locked', 'lo re ga'], ['people are angry', 'sa ga pa'], ['people live now', 'so du pa'], ['go now', 'bu so']], ['sa', 'so']), ' ') },
  75: {
    key: 'D',
    confidence: 'high',
    rule: "'Kings' is pa (in both Kings phrases). 'so' is in 'Kings Will Dic' and 'They Die', so it is Die (\"Dic\" in the print); 'du' is Will and 'bu' is They.",
    check: reasoned,
  },
  76: { key: 'A', confidence: 'high', rule: "'strength to' is 42 and 32 in both, so 'create' is 24.", check: codeSet(codesOf([['strength to innovate', '42 64 32'], ['strength to create', '32 42 24']], 'create'), ' ') },
  77: { key: 'D', confidence: 'high', rule: "'well' is the only word in both phrases, and rb the only code.", check: codeSet(codesOf([['mix jaggery well', 'rb co ot'], ['well done boss', 'cx rb op']], 'well'), ' ') },
  78: { key: 'D', confidence: 'high', rule: "'9' is te and '4' is to, so '3' is dump.", check: codeSet(codesOf([['629', 'namo te fek'], ['943', 'dump to te'], ['748', 'to fir tako']], '3', DW), ' ') },
  79: { key: 'C', confidence: 'high', rule: "'high' is 6 and 'and' is 5, so 'low' is 7.", check: codeSet(codesOf([['high and low', '567'], ['Building are high', '629'], ['hot and sour', '531']], 'low', WD), '') },
  80: { key: 'C', confidence: 'high', rule: "'and Sun' are 2% and 9& in both, so 'Stars' is 6#.", check: codeSet(codesOf([['Earth and Sun', '2% J4 9&'], ['Sun and Stars', '9& 6# 2%']], 'Stars'), ' ') },
  81: { key: 'C', confidence: 'high', rule: 'Each word is coded by its first letter\'s position: make, one, code → 13, 15, 3.', check: computed(rule((s) => s.split(' ').map((w) => p(w[0])).join(' '), [['Read the code', '18 20 3'], ['Decode the code', '4 20 3'], ['code is easy', '3 9 5']], 'make one code')) },
  82: { key: 'A', confidence: 'high', rule: "'I' is Ha, 'you' is He and 'like' is Ho, so 'me' is Haa.", check: codeSet(codesOf([['i know you', 'Ha Hi He'], ['i like french', 'Ho Hu Ha'], ['you like me', 'He Ho Haa']], 'me'), ' ') },
  83: { key: 'A', confidence: 'high', rule: "'sign' is rit and 'the post' are pri and dan, so 'fell' is nei.", check: codeSet(codesOf([['sign up for sports', 'kri rit vin gab'], ['the sign post fell', 'pri dan rit nei'], ['the post is closed', 'dan sha fal pri']], 'fell'), ' ') },
  84: { key: 'B', confidence: 'high', rule: "'the' is fern, 'mountain' lor and 'to' tes, so 'trek' is mel.", check: codeSet(codesOf([['trek to the mountain', 'tes mel fern lor'], ['the mountain is high', 'lor max fern ani'], ['high to the sky', 'tes ani sav fern']], 'trek'), ' ') },
  85: { key: 'B', confidence: 'high', rule: "'blue' is mud and 'sky' is pot, so 'is' is sum.", check: codeSet(codesOf([['sky is blue', 'mud pot sum'], ['I like blue', 'mud man log'], ['I am sky', 'man red pot']], 'is'), ' ') },
  86: { key: 'C', confidence: 'high', rule: "'you' is room (in all three), and 'can you' is sent and room, so 'can' is sent.", check: codeSet(codesOf([['you can start', 'sent room dark'], ['can you read', 'room sent less'], ['you are good', 'tyre room spin']], 'can'), ' ') },
  87: {
    key: 'A',
    confidence: 'high',
    rule: "'book' is 9 (in all three), 'this' 6, 'good' 4, and 'is' 5 or 7. Only 4965 holds 6, 9, 4 and one of 5 or 7.",
    check: reasoned,
  },
  88: { key: 'D', confidence: 'high', rule: "'are' is 8, 'beautiful' 5, 'watches' 6 and 'preferred' 7: 876.", check: codeSet(codesOf([['watches are beautiful', '856'], ['beautiful things are expensive', '3845'], ['expensive things are preferred', '3874']], 'watches are preferred', WD), '') },
  89: { key: 'A', confidence: 'high', rule: "'chocolates' 5, 'like' 8, 'we' 1, so 'I' 9, 'bought' 3, 'them' 6: 936.", check: codeSet(codesOf([['I like chocolates', '958'], ['we bought chocolates', '153'], ['we like them', '816']], 'I bought them', WD), '') },
  90: { key: 'C', confidence: 'high', rule: "'fast' is mo and 'it' is ga, so 'do' is cha.", check: codeSet(codesOf([['fast and furious', 'co mo jo'], ['do it fast', 'cha mo ga'], ['she did it', 'ga la nop']], 'do'), ' ') },
  91: {
    key: 'B',
    confidence: 'high',
    rule: "Reading 'thing' and 'things' as one word: 'use' 1, 'personal' 2, 'my' 5, 'things' 9, 'these' 6. So 569 is 'my these things'.",
    check: reasoned,
  },
  92: { key: 'C', confidence: 'high', rule: "'get' is max and 'will' is zax, so 'dax' is 'he'.", check: codeSet(wordsOf([['get up now', 'pax max rax'], ['he will get', 'max dax zax'], ['will it stop', 'zax kax lax']], ['dax']), ' ') },
  93: { key: 'C', confidence: 'high', rule: "'are' der, 'we' ner, 'stay' yer, 'there' jer, so 'you' ter and 'late' ser: ter yer ser.", check: codeSet(codesOf([['you are there', 'ter der jer'], ['we stay here', 'yer mer ner'], ['we are late', 'ser ner der'], ['I stay there', 'yer fer jer']], 'you stay late'), ' ') },
  94: { key: 'A', confidence: 'high', rule: "'was' is 2 and 'curious' is 7, so 'she' is 9.", check: codeSet(codesOf([['she was working', '592'], ['I was curious', '267'], ['she is curious', '987']], 'she', WD), '') },
  95: { key: 'D', confidence: 'high', rule: "'available' juk, 'here' bhu, 'objects' nut, so 'lost' gan; 'drinks' lop: gan lop.", check: codeSet(codesOf([['cool drinks available here', 'bhu man juk lop'], ['available lost objects here', 'gan bhu nut juk'], ['be cool search objects', 'vax der man nut'], ['available drinks desert search', 'but juk der lop']], 'lost drinks'), ' ') },
  96: { key: 'D', confidence: 'high', rule: "'some' 4, 'needs' 1, 'water' 9, 'she' 2, so 'take' 8 and 'medicines' 5: 85.", check: codeSet(codesOf([['she needs some medicines', '1542'], ['take some water', '849'], ['he needs rest', '713'], ['she is water', '269']], 'take medicines', WD), '') },
  97: { key: 'B', confidence: 'high', rule: 'Each letter and its code add to 25 by position (D 4 + U 21): DYAD → U, Z, X, U.', check: computed(rule((w) => [...w].map((c) => L(25 - p(c))).join(''), [['DWELL', 'UBTMM'], ['OVER', 'JCTG']], 'DYAD')) },
  98: {
    held: true,
    reason: 'UNDERNEATH fixes the rule as vowel 1, consonant 0 (HABITAT agrees). POSSIBLE then codes as 01001001, which is not an option; the opposite reading gives 10110110 (D).',
    lean: 'D',
  },
  99: {
    key: 'C',
    confidence: 'high',
    rule: 'Last letter + 1, then the sum of letter positions + 15, then first letter − 1: MEDIA → B, 32 + 15 = 47, L.',
    check: computed(rule((w) => `${L(p(w.at(-1)!) + 1)}${sum(w) + 15}${L(p(w[0]) - 1)}`, [['LOGIC', 'D61K'], ['POWER', 'S92O']], 'MEDIA')),
  },
  100: {
    key: 'C',
    confidence: 'high',
    rule: 'Last letter − 1, then the sum of letter positions − 15, then first letter + 1: BASIS → R, 50 − 15 = 35, C.',
    check: computed(rule((w) => `${L(p(w.at(-1)!) - 1)}${sum(w) - 15}${L(p(w[0]) + 1)}`, [['WRITE', 'D60X'], ['APPLE', 'D35B']], 'BASIS')),
  },
  101: {
    key: 'B',
    confidence: 'high',
    rule: 'Last letter − 1, then the sum of letter positions − 15, then first letter + 1: POWER → Q, 77 − 15 = 62, Q.',
    check: computed(rule((w) => `${L(p(w.at(-1)!) - 1)}${sum(w) - 15}${L(p(w[0]) + 1)}`, [['VITAL', 'K49W'], ['WOMAN', 'M51X']], 'POWER')),
  },
  102: {
    key: 'D',
    confidence: 'high',
    rule: 'Last letter − 1, then the sum of letter positions − 10, then first letter + 1: GRAIN → M, 49 − 10 = 39, H.',
    check: computed(rule((w) => `${L(p(w.at(-1)!) - 1)}${sum(w) - 10}${L(p(w[0]) + 1)}`, [['BLOOD', 'C38C'], ['DEBUT', 'S42E']], 'GRAIN')),
  },
  103: { key: 'D', confidence: 'high', rule: 'E, A and M share 2, 3 and 4; B is 9, so N is 7.', check: computed(codesOf([['BEAM', '2349'], ['MEAN', '4327']], 'N', CC)[0]) },
  104: { key: 'B', confidence: 'high', rule: 'UNCERTAIN adds U and N to CERTAIN, and the code adds 1 and 7; N is 1, so U is 7.', check: computed(codesOf([['CERTAIN', '9643821'], ['UNCERTAIN', '964382117']], 'U', CC)[0]) },
  105: { key: 'A', confidence: 'high', rule: 'The number of letters squared, less 1: PUNY = 4² − 1 = 15.', check: computed(rule((w) => w.length ** 2 - 1, [['INDULGE', 48], ['PURGE', 24]], 'PUNY')) },
  106: { key: 'A', confidence: 'high', rule: 'R, O and W share 7, 5 and 2, so B is 4.', check: computed(codesOf([['BROW', '7542'], ['WORM', '7295']], 'B', CC)[0]) },
  107: { key: 'A', confidence: 'high', rule: 'Seven times the number of letters: ADMINISTRATION = 7 × 14 = 98.', check: computed(rule((w) => 7 * w.length, [['MANGO', 35], ['CHERRIES', 56]], 'ADMINISTRATION')) },
  108: { key: 'A', confidence: 'high', rule: 'R, I and K share 3, 9 and 1, so S is 2.', check: computed(codesOf([['RISK', '3921'], ['KIRT', '1693']], 'S', CC)[0]) },
  109: { key: 'D', confidence: 'high', rule: 'Twice the sum of letter positions: FACT = 2 × 30 = 60.', check: computed(rule((w) => 2 * sum(w), [['BABE', 20], ['EACH', 34]], 'FACT')) },
  110: { key: 'A', confidence: 'high', rule: 'T, K, E and N share 8, 6, 2 and 3; A is 7, so 5 is O.', check: computed(codesOf([['78623', 'TAKEN'], ['32685', 'TOKEN']], '5', CC)[0]) },
  111: { key: 'D', confidence: 'high', rule: 'Sum of letter positions + the number of letters: PACK = 31 + 4 = 35.', check: computed(rule((w) => sum(w) + w.length, [['FLOWER', 85], ['STARS', 82], ['MOON', 61]], 'PACK')) },
  112: {
    key: 'B',
    confidence: 'high',
    rule: 'Letters 1, 3, 5… as their positions, letters 2, 4… in small type: SOLVE → 19 o 12 v 5.',
    note: 'The print spells the second example "PROBELM"; its code 16r15b12e13 is of PROBLEM, which is what is checked.',
    check: computed(rule((w) => [...w].map((c, i) => (i % 2 === 0 ? String(p(c)) : c.toLowerCase())).join(''), [['CONCEPT', '3o14c5p20'], ['PROBLEM', '16r15b12e13']], 'SOLVE')),
  },
  113: { key: 'C', confidence: 'high', rule: 'Sum of reverse positions (Z = 1): RULE = 9 + 6 + 15 + 22 = 52.', check: computed(rule((w) => sum(w, rp), [['PILOT', 63], ['RICE', 73]], 'RULE')) },
  114: { key: 'C', confidence: 'high', rule: 'Reverse the word, then +1: INTERCOM → MOCRETNI → NPDSFUOJ.', check: computed(rule((w) => shifts(rev(w), [1]), [['TELEPHONE', 'FOPIQFMFU']], 'INTERCOM')) },
  115: { key: 'C', confidence: 'high', rule: 'Sum of letter positions + 2: TORN = 67 + 2 = 69.', check: computed(rule((w) => sum(w) + 2, [['PAIN', 42], ['GOMT', 57]], 'TORN')) },
  116: { key: 'A', confidence: 'high', rule: 'Sum of letter positions − 3: TIR = 47 − 3 = 44.', check: computed(rule((w) => sum(w) - 3, [['GON', 33], ['PAD', 18]], 'TIR')) },
  117: { key: 'C', confidence: 'high', rule: 'Each letter\'s position less 1, reduced to one digit: GRAPES → 6 8 0 6 4 9.', check: computed(rule((w) => [...w].map((c) => dr(p(c) - 1)).join(''), [['FRUIT', '58281']], 'GRAPES')) },
  118: {
    key: 'D',
    confidence: 'high',
    rule: '−1 at every odd place; −6, −5, −4, −3 at the even places in turn: GUIDANCE → FOHYZJBB.',
    check: computed(rule((w) => shifts(w, [-1, -6, -1, -5, -1, -4, -1, -3]), [['COUNSEL', 'BITIRAK']], 'GUIDANCE')),
  },
  119: { key: 'D', confidence: 'high', rule: 'Each letter becomes its opposite (A↔Z), then the word is reversed: GRAVITY → TIZERGB → BGREZIT.', check: computed(rule((w) => rev([...w].map(atbash).join('')), [['INCEPTION', 'MLRGKVXMR']], 'GRAVITY')) },
  120: { key: 'D', confidence: 'high', rule: 'Sum of letter positions − the number of letters: MASSACHUSETTS = 168 − 13 = 155.', check: computed(rule((w) => sum(w) - w.length, [['BUCKINGHAM', 79], ['TRANSFORMER', 136]], 'MASSACHUSETTS')) },
  121: {
    held: true,
    reason: 'RECK fits the sum of letter positions plus the number of letters (37 + 4 = 41), but MAPED then gives 44, not the printed 64, and no other rule tried fits both. That rule would give NOSE 57 (A).',
    lean: 'A',
  },
  122: { key: 'A', confidence: 'high', rule: 'Sum of reverse positions (Z = 1): PLASTER = 11 + 15 + 26 + 8 + 7 + 22 + 9 = 98.', check: computed(rule((w) => sum(w, rp), [['SECTOR', 82], ['TANKER', 93]], 'PLASTER')) },
  123: { key: 'B', confidence: 'high', rule: 'Vowels as their position, consonants +1: RINGS → S 9 O H T.', check: computed(rule((w) => [...w].map((c) => (isVowel(c) ? String(p(c)) : L(p(c) + 1))).join(''), [['PASTRY', 'Q1TUSZ']], 'RINGS')) },
  124: { held: true, reason: 'One example, 117 for TRACTOR, does not fix a rule: its letters sum to 95 and their reverse positions to 94, and no rule built on either leads to an option for MEDICAL.' },
  125: { key: 'A', confidence: 'high', rule: 'Vowels as their position, consonants +1: FASHION → G 1 T I 9 15 O.', check: computed(rule((w) => [...w].map((c) => (isVowel(c) ? String(p(c)) : L(p(c) + 1))).join(''), [['TRAINER', 'US19O5S']], 'FASHION')) },
  126: { key: 'D', confidence: 'high', rule: 'Letter by letter from the examples (P 1, A 2, R 3, O 4, T 5, S 6): ROAST → 3 4 2 6 5.', check: computed([...'ROAST'].map((c) => charMap([['PARROT', '123345'], ['SOAT', '6425']]).get(c)).join('')) },
  127: { key: 'A', confidence: 'high', rule: 'Letters 5, 3, 4, 1, 2: PAPER → R P E P A.', check: computed(rule((w) => perm(w, [5, 3, 4, 1, 2]), [['FIGHT', 'TGHFI']], 'PAPER')) },
  128: { key: 'A', confidence: 'high', rule: 'W 6, A 7, Y 9: YAW → 9 7 6.', check: computed([...'YAW'].map((c) => charMap([['WAY', '679'], ['MAY', '579']]).get(c)).join('')) },
  129: { key: 'D', confidence: 'high', rule: '+1, −1 alternately: DELHI → EDMGJ.', check: computed(rule((w) => shifts(w, [1, -1]), [['BOMBAY', 'CNNABX']], 'DELHI')) },
  130: {
    key: 'D',
    confidence: 'high',
    rule: 'Reverse the word, then +1 on every letter but the first and last: MEDICINE → ENICIDEM → EOJDJEFM.',
    check: computed(rule((w) => { const r = rev(w); return r[0] + shifts(r.slice(1, -1), [1]) + r.at(-1); }, [['COMPUTER', 'RFUVQNPC']], 'MEDICINE')),
  },
  131: { key: 'B', confidence: 'high', rule: 'Letter by letter from the examples (D 3, E 5, A 8, F 7, I 4, L 6): IDEAL → 4 3 5 8 6.', check: computed([...'IDEAL'].map((c) => charMap([['DEAF', '3587'], ['FILE', '7465']]).get(c)).join('')) },
  132: { key: 'A', confidence: 'high', rule: 'Each letter +2: BRL → DTN.', check: computed(rule((w) => shifts(w, [2]), [['MBS', 'ODU']], 'BRL')) },
  133: { key: 'A', confidence: 'high', rule: 'The word reversed: POLITICAL → LACITILOP.', check: computed(rule(rev, [['STATEMENT', 'TNEMETATS']], 'POLITICAL')) },
  134: { key: 'C', confidence: 'high', rule: 'Each letter +3: BUS → EXV.', check: computed(rule((w) => shifts(w, [3]), [['TRAIN', 'WUDLQ']], 'BUS')) },
  135: { key: 'C', confidence: 'high', rule: "'fast' is 9 and 'run' is 8, so 'come' is 4.", check: codeSet(codesOf([['run very fast', '389'], ['come back fast', '964'], ['run and come', '487']], 'come', WD), '') },
  136: { key: 'C', confidence: 'high', rule: 'Letter by letter from the examples (G 5, A 2, T 4, E 7): GATE → 5 2 4 7.', check: computed([...'GATE'].map((c) => charMap([['GIVE', '5137'], ['BAT', '924']]).get(c)).join('')) },
  137: { key: 'D', confidence: 'high', rule: 'First and last letters swap: BALE → EALB.', check: computed(rule((w) => w.at(-1) + w.slice(1, -1) + w[0], [['MEAT', 'TEAM']], 'BALE')) },
  138: { key: 'D', confidence: 'high', rule: 'Letter by letter from the examples: SCULPTURE → 9 5 3 6 0 1 3 4 7.', check: computed([...'SCULPTURE'].map((c) => charMap([['TOUR', '1234'], ['CLEAR', '56784'], ['SPARE', '90847']]).get(c)).join('')) },
  139: { key: 'C', confidence: 'high', rule: 'Each letter −1 (CBE → BAD): GMBH → FLAG.', check: computed(rule((w) => shifts(w, [-1]), [['CBE', 'BAD']], 'GMBH')) },
  140: {
    key: 'A',
    confidence: 'medium',
    rule: 'Half the sum of letter positions: CAT = 24 / 2 = 12, MAN = 28 / 2 = 14.',
    note: 'One example cannot fix a rule; half the letter sum is the plain reading. Check against the book key.',
    check: computed(rule((w) => sum(w) / 2, [['CAT', 12]], 'MAN')),
  },
  141: { key: 'C', confidence: 'high', rule: 'Letter by letter from the examples (H 5, A 3, I 2, R 9): HAIR → 5 3 2 9.', check: computed([...'HAIR'].map((c) => charMap([['PAINT', '63257'], ['SHIRT', '15297']]).get(c)).join('')) },
  142: { key: 'A', confidence: 'high', rule: 'M → A, N → B, … Q → E: QPONM → EDCBA.', check: computed([...'QPONM'].map((c) => charMap([['MNOPQ', 'ABCDE']]).get(c)).join('')) },
  143: {
    key: 'C',
    confidence: 'high',
    rule: "Each code is a symbol, the word's last letter and its length. #e5 is in both craze phrases, so craze; #e6 is the six-letter word ending e, course; @o4 (printed @04) is also.",
    check: reasoned,
  },
  144: { key: 'D', confidence: 'high', rule: "'pencil' is $ (in both pencil phrases), so 'pen' is %.", check: codeSet(codesOf([['pen pencil', '$%'], ['eraser sharpener', '@#'], ['pencil eraser', '$@']], 'pen', WD), '') },
  145: { key: 'A', confidence: 'high', rule: 'The word reversed: ALIGATOR → ROTAGILA.', check: computed(rule(rev, [['TELEPHONE', 'ENOHPELET']], 'ALIGATOR')) },
  146: { key: 'B', confidence: 'high', rule: "The mother's father is the maternal grandfather, who is called maternal uncle.", check: reasoned },
  147: { key: 'A', confidence: 'high', rule: '3 Z, 4 Y, 5 X, 7 V: 5734 → X V Z Y.', check: computed([...'5734'].map((c) => charMap([['34567', 'ZYXWV']]).get(c)).join('')) },
  148: { key: 'B', confidence: 'high', rule: 'The lion is king of the forest, and the lion is called dog.', check: reasoned },
  149: { key: 'C', confidence: 'high', rule: '−1, +1 alternately: POPULAR → OPOVKBQ.', check: computed(rule((w) => shifts(w, [-1, 1]), [['MICROWAVE', 'LJBSNXZWD']], 'POPULAR')) },
  150: { key: 'B', confidence: 'high', rule: 'Each letter −1: FREEZE → EQDDYD.', check: computed(rule((w) => shifts(w, [-1]), [['TAP', 'SZO']], 'FREEZE')) },
};
