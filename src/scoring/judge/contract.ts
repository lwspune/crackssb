import type { Instrument } from '../thresholds.ts';

/**
 * The D5 adapter contract — text in, validated partial OLQ vector out.
 *
 * The provider is an implementation detail behind this interface. Nothing here
 * knows or cares which model produced the verdict, and nothing downstream sees
 * an unvalidated one.
 */

/** The 15 Officer Like Qualities, grouped by factor in ARCHITECTURE.md section 3. */
export const OLQS = [
  // Factor I — Planning & Organising
  'effectiveIntelligence',
  'reasoningAbility',
  'organisingAbility',
  'powerOfExpression',
  // Factor II — Social Adjustment
  'socialAdaptability',
  'cooperation',
  'senseOfResponsibility',
  // Factor III — Social Effectiveness
  'initiative',
  'selfConfidence',
  'speedOfDecision',
  'abilityToInfluenceTheGroup',
  'liveliness',
  // Factor IV — Dynamic
  'determination',
  'courage',
  'stamina',
] as const;

export type Olq = (typeof OLQS)[number];

/**
 * Which OLQs each instrument is entitled to observe.
 *
 * Grounded in what the assessor actually wrote in the corpus, not in what each
 * instrument might plausibly reveal. Codes observed per instrument:
 *
 *   TAT  Restd EI/RA, Restd courage, Restd Dynamism, low Mental Stamina,
 *        "confused"/"not organised", "better flow, sequence" (expression)
 *   SRT  Low SOD, Low EI/RA, Low Dynamism, Low Mental/Physical Stamina,
 *        "authoritarian behaviour" (influence, inverse)
 *   WAT  "Restricted" only, plus sentence-quality remarks
 *   SDT  no OLQ codes at all — the assessor works in traits there
 *
 * SDT is deliberately narrow for that reason. Widen only with evidence.
 */
export const ENTITLEMENTS: Readonly<Record<Instrument, readonly Olq[]>> = {
  tat: [
    'effectiveIntelligence',
    'reasoningAbility',
    'organisingAbility',
    'powerOfExpression',
    'determination',
    'courage',
    'stamina',
  ],
  srt: [
    'effectiveIntelligence',
    'reasoningAbility',
    'speedOfDecision',
    'abilityToInfluenceTheGroup',
    'determination',
    'courage',
    'stamina',
  ],
  wat: ['powerOfExpression', 'effectiveIntelligence', 'reasoningAbility'],
  sdt: ['selfConfidence', 'senseOfResponsibility', 'powerOfExpression'],
};

/** The assessor's own closed grade vocabulary, weakest first. */
export const GRADES = ['LOW', 'Just Avg', 'AVG', 'Good', 'V. good'] as const;
export type Grade = (typeof GRADES)[number];

export interface OlqScore {
  /** 1–9, mirroring assessor practice (ARCHITECTURE.md section 3.2). */
  readonly score: number;
  readonly confidence: number;
  readonly evidence: readonly string[];
}

/**
 * Two independent outputs, per D11. `quality` judges the response as a
 * response; `olq` and `flags` record findings about the candidate. Neither is
 * derived from the other — in the corpus, slide 11 is ticked most often while
 * producing a negative courage code every time.
 */
export interface JudgeVerdict {
  readonly quality: { readonly grade: Grade; readonly evidence: readonly string[] };
  readonly olq: Partial<Record<Olq, OlqScore>>;
  readonly flags: {
    readonly themes: readonly string[];
    readonly traits: readonly string[];
    /** What the response asserts that the stimulus contradicts, or null. */
    readonly perceptionMismatch: string | null;
  };
}

export interface JudgeRequest {
  readonly instrument: Instrument;
  readonly responseText: string;
  /** Known stimulus content, where we have it. Enables perception checking. */
  readonly stimulus?: string;
  readonly slide?: number;
}

const OLQ_SET: ReadonlySet<string> = new Set(OLQS);

/**
 * Validates at the boundary and throws on anything malformed.
 *
 * ARCHITECTURE.md section 3.1: an evaluation returning an OLQ outside its
 * entitlement is rejected here, not filtered downstream. Filtering would let a
 * miscalibrated judge quietly corrupt the rollup.
 */
export function validateVerdict(instrument: Instrument, verdict: unknown): JudgeVerdict {
  const entitled = ENTITLEMENTS[instrument];
  if (!entitled) throw new Error(`Unknown instrument: ${String(instrument)}`);
  if (verdict == null || typeof verdict !== 'object') {
    throw new TypeError('Verdict must be an object');
  }
  const v = verdict as Record<string, unknown>;

  const quality = v.quality as JudgeVerdict['quality'] | undefined;
  if (!quality || typeof quality !== 'object') {
    throw new TypeError('Verdict is missing `quality`');
  }
  if (!(GRADES as readonly string[]).includes(quality.grade)) {
    throw new RangeError(
      `Invalid grade "${String(quality.grade)}" — expected one of ${GRADES.join(', ')}`,
    );
  }
  if (!Array.isArray(quality.evidence) || quality.evidence.length === 0) {
    throw new TypeError('quality.evidence must be a non-empty array');
  }

  const flags = v.flags as JudgeVerdict['flags'] | undefined;
  if (!flags || typeof flags !== 'object') {
    throw new TypeError('Verdict is missing `flags`');
  }
  for (const key of ['themes', 'traits'] as const) {
    if (!Array.isArray(flags[key])) throw new TypeError(`flags.${key} must be an array`);
  }
  if (flags.perceptionMismatch !== null && typeof flags.perceptionMismatch !== 'string') {
    throw new TypeError('flags.perceptionMismatch must be a string or null');
  }

  const olq = (v.olq ?? {}) as Record<string, OlqScore>;
  if (typeof olq !== 'object' || olq === null) throw new TypeError('`olq` must be an object');

  for (const [name, entry] of Object.entries(olq)) {
    if (!OLQ_SET.has(name)) {
      throw new RangeError(`Unknown OLQ "${name}"`);
    }
    if (!entitled.includes(name as Olq)) {
      throw new RangeError(
        `${instrument.toUpperCase()} is not entitled to observe "${name}" — ` +
          `entitled: ${entitled.join(', ')}`,
      );
    }
    if (!Number.isInteger(entry?.score) || entry.score < 1 || entry.score > 9) {
      throw new RangeError(`"${name}" score must be an integer 1-9, received ${String(entry?.score)}`);
    }
    if (typeof entry.confidence !== 'number' || entry.confidence < 0 || entry.confidence > 1) {
      throw new RangeError(`"${name}" confidence must be between 0 and 1`);
    }
    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
      throw new TypeError(`"${name}" must carry evidence — every score carries its justification`);
    }
  }

  return verdict as JudgeVerdict;
}
