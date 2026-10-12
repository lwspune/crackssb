/**
 * The signal vocabulary — the assessor's scattered wording reduced to a small
 * set of comparable traits.
 *
 * Every pattern below is taken from marks that actually appear in the corpus.
 * The assessor writes "Restd courage", "Restricted courage", "Restd/low
 * COURAGE", "traces of Restd courage?" and "Proceed to Restricted courage" for
 * one and the same finding, and nothing can be compared across instruments
 * until those collapse to one token.
 */

export type Signal =
  | 'anxiety'
  | 'courage_restricted'
  | 'temper'
  | 'authoritarian'
  | 'impulsive'
  | 'overthinker'
  | 'confidence_low'
  | 'disorganised'
  | 'wishful'
  | 'money_minded';

/** Ordered: the first pattern that matches wins, so put the specific ones first. */
const SIGNAL_PATTERNS: ReadonlyArray<readonly [Signal, RegExp]> = [
  // Specific before general — "short temper" must not be read as anxiety, and
  // "restricted courage" must not be swallowed by a bare "restricted".
  ['temper', /short[\s-]*(?:temper|fuse)|aggressi|overbearing|angry|anger|scolding/i],
  ['courage_restricted', /(?:restd|restricted|low)[\s/()a-z]*courage|courage[\s/]*(?:restd|restricted|low)/i],
  ['authoritarian', /authoritarian|dominat/i],
  ['overthinker', /overthink/i],
  ['impulsive', /impulsiv/i],
  ['wishful', /wishful|dreamworld|dream world|archaic/i],
  ['money_minded', /money[\s-]*minded|spendthrift|reward seeker/i],
  ['confidence_low', /lacks? confidence|low.*self.?confidence|restd.*self.?confidence/i],
  ['disorganised', /not organised|need to be organised|disorganis|confused|haphazard|incoheren/i],
  ['anxiety', /anxious|anxiety|panic|scared|nervous|afraid|fear(?!less)/i],
];

/**
 * Reduces one assessor mark to a signal, or null when it carries none.
 *
 * Phobia labels are deliberately NOT mapped. Per the codebook they are
 * stimulus-driven — Cynophobia belongs to the wolf picture, not to the
 * candidate — so feeding them into a cross-instrument personality comparison
 * would manufacture findings out of which slide someone happened to answer.
 */
export function normaliseSignal(raw: string): Signal | null {
  if (!raw || !raw.trim()) return null;
  if (/phobia/i.test(raw)) return null;
  for (const [signal, pattern] of SIGNAL_PATTERNS) {
    if (pattern.test(raw)) return signal;
  }
  return null;
}

/** Human-readable name, for feedback copy. */
export const SIGNAL_LABELS: Readonly<Record<Signal, string>> = {
  anxiety: 'anxiety under pressure',
  courage_restricted: 'restricted courage',
  temper: 'short temper',
  authoritarian: 'authoritarian manner',
  impulsive: 'impulsiveness',
  overthinker: 'overthinking',
  confidence_low: 'low self-confidence',
  disorganised: 'disorganised thinking',
  wishful: 'wishful thinking',
  money_minded: 'money-mindedness',
};

/**
 * Signals named for a DEFICIT, whose natural claim vocabulary describes the
 * ASSET. "I am courageous" matches the courage terms but denies
 * `courage_restricted`; without this the polarity of the finding inverts.
 */
export const DEFICIT_SIGNALS: ReadonlySet<Signal> = new Set<Signal>([
  'courage_restricted',
  'confidence_low',
  'disorganised',
]);

/**
 * Terms a candidate uses when writing about a signal in their own words, so a
 * self-claim can be matched to it.
 */
export const CLAIM_TERMS: Readonly<Record<Signal, RegExp>> = {
  anxiety: /panic|anxious|anxiety|nervous|scared|afraid|tense|stress/i,
  courage_restricted: /courage|brave|fearless|never give up|bold/i,
  temper: /angry|anger|temper|aggressive|overbearing|short[\s-]*fuse|fight|rude/i,
  authoritarian: /authoritarian|dominat|bossy|my way/i,
  impulsive: /impulsive|act without thinking|hasty/i,
  overthinker: /overthink|think too much|think every ?thing so much/i,
  confidence_low: /confiden/i,
  disorganised: /organis|organiz|manage my time|punctual|systematic/i,
  wishful: /dream|wishful|imagine/i,
  money_minded: /money|spend|saving/i,
};

/**
 * Claims whose contradiction is worded differently from the signal itself.
 *
 * cand-01 writes "leader type caliber to lead a team"; the contradicting mark is
 * "Shows authoritarian Behaviour". Neither string contains the other, so term
 * matching alone cannot connect them.
 */
export const OPPOSING_CLAIMS: ReadonlyArray<{
  readonly claim: RegExp;
  readonly contradictedBy: Signal;
  readonly why: string;
}> = [
  {
    claim: /leader|lead a team|leadership|team ?work/i,
    contradictedBy: 'authoritarian',
    why: 'claims leadership, but the responses read as directive rather than leading',
  },
  {
    claim: /calm|composed|patient|handle any situation|never give up/i,
    contradictedBy: 'temper',
    why: 'claims composure, but the responses show temper',
  },
  {
    claim: /confident|self.?confidence|sure of myself/i,
    contradictedBy: 'confidence_low',
    why: 'claims confidence, but the responses read as hesitant',
  },
  {
    claim: /organis|organiz|manage my time|systematic|planner|plan maker/i,
    contradictedBy: 'disorganised',
    why: 'claims to be organised, but the responses are marked confused or haphazard',
  },
  {
    claim: /courage|brave|fearless|never give up|ready to take risk/i,
    contradictedBy: 'courage_restricted',
    why: 'claims courage, but the responses avoid the decisive action',
  },
  {
    claim: /practical|realistic|grounded/i,
    contradictedBy: 'wishful',
    why: 'claims to be practical, but the responses are marked wishful',
  },
];
