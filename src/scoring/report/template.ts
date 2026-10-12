/**
 * The assessor's one-page report, as a structure rather than prose.
 *
 * Derived by diffing the three real reports in the corpus: cand-01
 * (Low-Borderliner), cand-04 (High Borderliner), cand-09
 * (High Borderline / good potential).
 *
 * The report is a fixed set of sentence FRAMES whose qualifiers move with the
 * candidate. It is NOT boilerplate plus slots — that was the reading from two
 * samples, and the third falsified it. See corpus/predictions/.
 *
 * n = 3, and every slot vocabulary is still open. Two weak candidates made
 * `intelligence` look like a constant; the strong one revealed a second value.
 * Assume every list here is a lower bound.
 */

export type SlotId =
  | 'intelligence'
  | 'imagination'
  | 'themeQuality'
  | 'englishLanguage'
  | 'socialAdaptability'
  | 'confidence'
  | 'assistance'
  | 'anxiousness'
  | 'watQuality'
  | 'srtQuality'
  | 'sdUnderstanding'
  | 'sdInsight'
  | 'speedOfDecision'
  | 'mentalStamina'
  | 'standing'
  | 'trainability';

export interface Slot {
  readonly id: SlotId;
  /** Values seen in real reports. Ordered weakest to strongest where ordered. */
  readonly observed: readonly string[];
  /** True only where two samples can plausibly have exhausted the vocabulary. */
  readonly closed: boolean;
  readonly note?: string;
}

export const SLOTS: Readonly<Record<SlotId, Slot>> = {
  intelligence: { id: 'intelligence', observed: ['just mediocre', 'adequate'], closed: false,
    note: 'Both weak candidates got "just mediocre"; the strongest got "adequate". The upper end of this vocabulary was invisible until a stronger candidate appeared — which is why no slot here is marked closed.' },
  imagination: { id: 'imagination', observed: ['restricted', 'just average'], closed: false },
  themeQuality: { id: 'themeQuality', observed: [
    'mundane with restricted rational approach (Shows confused chaotic comprehension)',
    'of mundane nature'], closed: false },
  englishLanguage: { id: 'englishLanguage', observed: ['just passable', 'O.K./Average'], closed: false },
  socialAdaptability: { id: 'socialAdaptability', observed: ['just acceptable', 'moderate'], closed: false },
  confidence: { id: 'confidence', observed: ['restricted', 'just average'], closed: false },
  assistance: { id: 'assistance', observed: ['demanding', 'seeking'], closed: false,
    note: 'demanding < seeking. A one-word slot carrying a real judgement about manner.' },
  anxiousness: { id: 'anxiousness', observed: [
    'moderate anxiousness in familiar situation and shows moderate to high anxiousness as the situation builds up to Dynamic situations',
    'high anxiousness in both familiar situation and unfamiliar/Dynamic situations'], closed: false },
  watQuality: { id: 'watQuality', observed: ['LOW', 'O.K./Average'], closed: false },
  srtQuality: { id: 'srtQuality', observed: ['Poor', 'just average in quality'], closed: false },
  sdUnderstanding: { id: 'sdUnderstanding', observed: ['just O.K.', 'just moderate'], closed: false },
  sdInsight: { id: 'sdInsight', observed: ['o.k. Insight & Motivation', 'limited Insight & Motivation'], closed: false },
  speedOfDecision: { id: 'speedOfDecision', observed: ['restricted', 'just average'], closed: false },
  mentalStamina: { id: 'mentalStamina', observed: ['restricted', 'just average'], closed: false },
  standing: { id: 'standing', observed: ['Low-Borderliner', 'Borderliner', 'High-Borderliner'], closed: true,
    note: 'ENUMERATED from the batch grading summary: three ordinal bands across 11 candidates (High 2, Borderliner 2, Low 7). The POTENTIAL qualifier moves independently and is NOT closed - observed "just adequate", "though adequate", "though Just adequate", "adequate", "good". Per D15 we still do not emit the band; it predicts a selection outcome.' },
  trainability: { id: 'trainability', observed: ['adequate'], closed: false,
    note: 'DOES NOT DISCRIMINATE. Three candidates spanning Low-Borderliner to High Borderline all scored "adequate". At n=3 this field carries no information, and D15 was wrong to treat it as the coaching signal. The field that DOES move is the potential qualifier (adequate -> good), which sits inside the standing verdict we decline to emit.' },
};

/**
 * Sentence FRAMES that recur across every report — not fixed text.
 *
 * CORRECTED after a third report (cand-09) falsified the original
 * reading. On two weak candidates these sentences were byte-identical, and
 * "identical text cannot be coincidence" looked safe. It was not: the two
 * candidates were simply close enough in ability to receive the same
 * qualifiers. A stronger candidate moved every one of them:
 *
 *   "He maintain cheerfulness at all times."
 *     -> "She maintains cheerfulness ALMOST at all times."
 *   "He can be bolder in risky situations (shows traces of restricted courage)."
 *     -> "She can be more bolder in few dynamics & risky situations."
 *        — the parenthetical is DROPPED, because it is a finding, not filler
 *   "His mental awareness is LOW AVERAGE to withstand prolong tasking"
 *     -> "Her mental awareness is JUST AVERAGE to withstand prolong tasking"
 *
 * So the frame recurs and the qualifier moves. A generator must fill the
 * qualifier from the candidate's marks; emitting the frame alone is not a
 * result, and an evaluation that rewards frame-matching measures nothing.
 */
export interface Frame {
  /** Stable part, used to recognise the sentence across reports. */
  readonly stem: string;
  /** Whether the qualifier within it varies with the candidate. */
  readonly modulated: boolean;
  readonly observedVariants?: readonly string[];
}

export const FRAMES: readonly Frame[] = [
  { stem: 'cheerfulness', modulated: true,
    observedVariants: ['maintain cheerfulness at all times', 'maintains cheerfulness almost at all times'] },
  { stem: 'bolder in', modulated: true,
    observedVariants: [
      'can be bolder in risky situations (shows traces of restricted courage)',
      'can be more bolder in few dynamics & risky situations'] },
  { stem: 'prolong tasking', modulated: true,
    observedVariants: [
      'mental awareness is low average to withstand prolong tasking (shows traces of restricted Mental Stamina)',
      'mental awareness is just average to withstand prolong tasking (shows traces of restricted Mental Stamina)'] },
  { stem: 'consistent', modulated: true,
    observedVariants: [
      'need to perform in a consistent manner and need to handle both familiar & dynamic situations in an organised manner',
      'can be better organised and need to maintain consistency'] },
  { stem: 'knowledge base', modulated: false },
  { stem: 'grounded to reality', modulated: false },
  { stem: 'well-articulated sentences', modulated: false },
  { stem: 'sharp & observant', modulated: false },
  { stem: 'refinement', modulated: false },
];

/** Kept for the few sentences that genuinely have not moved across three reports. */
export const BOILERPLATE: readonly string[] = FRAMES
  .filter((f) => !f.modulated)
  .map((f) => f.stem);

/** Section order, fixed in both reports. */
export const SECTIONS = ['tat', 'wat', 'srt', 'sd', 'summarizing', 'verdict'] as const;

/**
 * Counts the report states outright. Every one matched the transcribed sheets
 * on both candidates, so these are Layer 1 output and need no model at all.
 */
export const REPORTED_COUNTS = [
  'tat_low_theme',
  'tat_not_connected_with_picture',
  'tat_just_average',
  'wat_not_attempted',
  'srt_attempted',
  'sdt_opinions_not_attempted',
] as const;

/**
 * Marks that are USUALLY withheld from the report — a default, not a rule.
 *
 * Nine of cand-01's marks were dropped, including the entire SDT trait block and
 * `Shows authoritarian Behaviour`, despite must/should being corrected on all
 * 16 of his attempted SRT responses.
 *
 * DEMOTED after the full batch arrived. cand-05's report reads "shows traces of
 * trust issues with opposite gender - slight shy" — the same attribution
 * withheld from cand-01's. So the filter is discretionary, not categorical, and
 * there is no visible rule for when it applies.
 *
 * We keep withholding by default. The sheet is working notes; the report is a
 * moderated document, and a generator that promotes these is exceeding the
 * assessor's discretion about real people, in writing. But this is our editorial
 * choice now, not an imitation of an observed rule.
 */
export const NEVER_IN_REPORT: readonly string[] = [
  'authoritarian',
  'short temper',
  'short fuse',
  'aggressiveness',
  'impulsiveness',
  'trust issue',
  'money-minded',
  'dynamism',
  'phobia',
];

/**
 * Does this sentence use a recurring frame?
 *
 * Returns the frame and whether its qualifier varies. A `modulated` frame is
 * NOT filler — the frame recurs but the judgement inside it is the candidate's,
 * and that is the part a generator has to get right.
 */
export function matchFrame(sentence: string): Frame | null {
  const t = sentence.toLowerCase();
  return FRAMES.find((f) => t.includes(f.stem.toLowerCase())) ?? null;
}

/** True only for frames whose wording has not moved across three reports. */
export function isBoilerplate(sentence: string): boolean {
  const f = matchFrame(sentence);
  return f != null && !f.modulated;
}

/** Would including this finding exceed the discretion the assessor exercised? */
export function isWithheldFromReport(markText: string): boolean {
  const t = markText.toLowerCase();
  return NEVER_IN_REPORT.some((p) => t.includes(p));
}
