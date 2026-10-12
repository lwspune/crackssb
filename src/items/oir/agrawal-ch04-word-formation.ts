import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 4 "Word Formation"
 * (pages 15-16). Every question asks which option cannot be formed from the
 * given word's letters; the key is the only option that needs a letter the
 * word lacks, or needs one more often than the word has it. Shipped with
 * `key_basis = 'derived'` until the book's key is compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch04-word-formation.source.json
 */
export const AGRAWAL_CH04_WORD_FORMATION: Readonly<Record<number, KeyEntry>> = {
  1: { key: 'C', confidence: 'high', rule: "SITUATION needs a U, which ADMINISTRATION does not have.", check: { kind: 'letters' } },
  2: { key: 'C', confidence: 'high', rule: "CAUTION needs a U, which COMBINATION does not have.", check: { kind: 'letters' } },
  3: { key: 'D', confidence: 'high', rule: "IMPASSIVE needs a V, which IMPOSSIONABLE does not have.", check: { kind: 'letters' } },
  4: { key: 'A', confidence: 'high', rule: "SUNDAY needs an S, which FUNDAMENTALY does not have.", check: { kind: 'letters' } },
  5: { key: 'C', confidence: 'high', rule: "BRITAIN needs an A, which DISTRIBUTION does not have.", check: { kind: 'letters' } },
  6: { key: 'B', confidence: 'high', rule: "TERMINAL needs an L, which ENTERTAINMENT does not have.", check: { kind: 'letters' } },
  7: { key: 'D', confidence: 'high', rule: "CREATE needs a T, which UNNECESSARILY does not have.", check: { kind: 'letters' } },
  8: { key: 'B', confidence: 'high', rule: "BOND needs a D, which SUBSTITUTION does not have.", check: { kind: 'letters' } },
  9: { key: 'C', confidence: 'high', rule: "SONG needs a G, which CELEBRATIONS does not have.", check: { kind: 'letters' } },
  10: { key: 'C', confidence: 'high', rule: "DIME needs D and I, which PERFORMANCE does not have.", check: { kind: 'letters' } },
  11: { key: 'A', confidence: 'high', rule: "GRIEF needs an F, which OPERATING does not have.", check: { kind: 'letters' } },
  12: { key: 'A', confidence: 'high', rule: "STRICT needs two Ts, and ELECTRICIANS has one.", check: { kind: 'letters' } },
  13: { key: 'B', confidence: 'high', rule: "BALD needs an A, which BLENDING does not have.", check: { kind: 'letters' } },
  14: { key: 'D', confidence: 'high', rule: "BENT needs a B, which TRANSLUCENT does not have.", check: { kind: 'letters' } },
  15: { key: 'C', confidence: 'high', rule: "CANCEL needs an A, which INTELLIGENCE does not have. It also needs two Cs, and INTELLIGENCE has one.", check: { kind: 'letters' } },
  16: { key: 'D', confidence: 'high', rule: "DOCTOR needs an R, which DECOMPOSITION does not have.", check: { kind: 'letters' } },
  17: { key: 'D', confidence: 'high', rule: "SAMPLE needs an L, which DISAPPOINTMENT does not have.", check: { kind: 'letters' } },
  18: { key: 'B', confidence: 'high', rule: "COUNTED needs an E, which CONDUCT does not have.", check: { kind: 'letters' } },
  19: { key: 'C', confidence: 'high', rule: "INSTALLATION needs two Ls, and NATIONALISATION has one.", check: { kind: 'letters' } },
  20: { key: 'D', confidence: 'high', rule: "ORANGE needs an E, which ORGANISATION does not have.", check: { kind: 'letters' } },
  21: { key: 'A', confidence: 'high', rule: "CANCEL needs an A, which INTELLIGENCE does not have. It also needs two Cs, and INTELLIGENCE has one.", check: { kind: 'letters' } },
  22: { key: 'B', confidence: 'high', rule: "SITUATION needs an A, which DISTRIBUTION does not have.", check: { kind: 'letters' } },
  23: { key: 'C', confidence: 'high', rule: "ANKLE needs a K, which REPUBLICAN does not have.", check: { kind: 'letters' } },
  24: { key: 'A', confidence: 'high', rule: "GENERATE needs three Es, and ESTRANGE has two.", check: { kind: 'letters' } },
  25: { key: 'B', confidence: 'high', rule: "NEST needs an E, which ADMINISTRATOR does not have.", check: { kind: 'letters' } },
  26: { key: 'A', confidence: 'high', rule: "SCOUT needs a U, which SOCIALISATION does not have.", check: { kind: 'letters' } },
  27: { key: 'C', confidence: 'high', rule: "PAINTER needs an I, which CARPENTER does not have.", check: { kind: 'letters' } },
  28: { key: 'A', confidence: 'high', rule: "BRAIN needs an I, which REASONABLE does not have.", check: { kind: 'letters' } },
  29: { key: 'A', confidence: 'high', rule: "STATION needs two Ts, and ORGANISATION has one.", check: { kind: 'letters' } },
  30: { key: 'C', confidence: 'high', rule: "DROPPER needs two Ps, and CORRESPONDING has one.", check: { kind: 'letters' } },
  31: { key: 'D', confidence: 'high', rule: "PAIR needs an I, which DEPARTMENT does not have.", check: { kind: 'letters' } },
  32: { key: 'C', confidence: 'high', rule: "STONE needs an S, which RECOMMENDATION does not have.", check: { kind: 'letters' } },
  33: { key: 'A', confidence: 'high', rule: "NUMBER needs a B, which REMUNERATION does not have.", check: { kind: 'letters' } },
  34: { key: 'A', confidence: 'high', rule: "TONE needs an E, which ROTATIONAL does not have.", check: { kind: 'letters' } },
  35: { key: 'B', confidence: 'high', rule: "PAIR needs A and I, which SUPERCONDUCTOR does not have.", check: { kind: 'letters' } },
  36: { key: 'A', confidence: 'high', rule: "MOTION needs two Os, and REMUNERATION has one.", check: { kind: 'letters' } },
  37: { key: 'A', confidence: 'high', rule: "REAL needs an E, which NATURALIZATION does not have.", check: { kind: 'letters' } },
  38: { key: 'C', confidence: 'high', rule: "SITE needs an E, which SIGNIFICANT does not have.", check: { kind: 'letters' } },
  39: { key: 'B', confidence: 'high', rule: "SOUR needs an R, which SIMULTANEOUS does not have.", check: { kind: 'letters' } },
  40: { key: 'C', confidence: 'high', rule: "TOTAL needs an L, which PARTICIPATION does not have.", check: { kind: 'letters' } },
  41: { key: 'A', confidence: 'high', rule: "UNIVERSE needs two Es, and UNIVERSITY has one.", check: { kind: 'letters' } },
  42: { key: 'C', confidence: 'high', rule: "MANIA needs two As, and GERMINATION has one.", check: { kind: 'letters' } },
  43: { key: 'C', confidence: 'high', rule: "FAIR needs an A, which INFERIORITY does not have.", check: { kind: 'letters' } },
  44: { key: 'B', confidence: 'high', rule: "TEMPER needs an M, which COUNTERPART does not have. It also needs two Es, and COUNTERPART has one.", check: { kind: 'letters' } },
  45: { key: 'A', confidence: 'high', rule: "GESTURE needs an R, which SUGGESTION does not have. It also needs two Es, and SUGGESTION has one.", check: { kind: 'letters' } },
  46: { key: 'C', confidence: 'high', rule: "GAME needs an M, which LAUGHTER does not have.", check: { kind: 'letters' } },
  47: { key: 'D', confidence: 'high', rule: "NEGATIVE needs a V, which CATEGORIZATION does not have. It also needs two Es, and CATEGORIZATION has one.", check: { kind: 'letters' } },
};
