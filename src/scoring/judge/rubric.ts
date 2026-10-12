import { ENTITLEMENTS, GRADES } from './contract.ts';
import { themeCalibrationNote, absenceNote } from './calibration.ts';

/**
 * Calibration guidance, injected into the TAT rubric only.
 *
 * Built once as a constant so the byte-identical-prefix requirement of D5's
 * prompt caching still holds — this must not be recomputed per call.
 */
const CALIBRATION_BLOCK = `${themeCalibrationNote()}\n\n${absenceNote()}\n`;
import type { Instrument } from '../thresholds.ts';
import type { JudgeRequest } from './contract.ts';

/**
 * The rubric — the corpus findings turned into a prompt.
 *
 * Everything here is derived from `corpus/CODEBOOK.md`, which is derived from
 * 923 marks a real assessor made on 11 real sheets. Nothing is invented.
 *
 * Per D5 this string must be byte-identical on every call so it can sit ahead
 * of the prompt-cache breakpoint, so it is built from constants only and never
 * sees candidate text.
 */

/**
 * What each TAT slide actually shows.
 *
 * Two provenances, and the distinction is kept because it is the difference
 * between a fact and a reconstruction:
 *
 *  - `image` — read off the slide itself.
 *  - `assessor_description` — pieced together from what the assessor wrote in
 *    the margin when a candidate misread or skipped the picture.
 *
 * Slide 4 is the validation case: it was reconstructed from four separate
 * marginal notes long before the image turned up, and the image matches.
 *
 * Details here are not decoration. Each one demonstrably steers responses:
 * slide 1's clock reads 10:10 and three candidates wrote exactly that time;
 * slide 2's TV GUIDE sign put a television into 5 of 11 stories; slide 3's
 * drowsy posture put sleep into 7 of 10; slide 6's juice bottle was read as
 * liquor by five of eight.
 */
export interface Stimulus {
  readonly description: string;
  readonly source: 'image' | 'assessor_description';
}

export const STIMULI: Readonly<Record<number, Stimulus>> = {
  1: {
    source: 'image',
    description:
      'An indoor room. A young woman stands holding a letter or printed sheet, her other hand raised to her mouth — thinking, or uneasy. A wall clock behind her reads about 10:10. There is a mantelpiece, an ornamental urn, heavy curtains and a chair. Nothing in the picture states what the letter says.',
  },
  2: {
    source: 'image',
    description:
      'An office or meeting room. Four people at a large table: one man standing at the left with his arm raised mid-gesture, a woman seated facing us, a man seated with his back to us, and a fourth figure at the right. A TV GUIDE sign hangs on the wall behind them. Pens and papers on the table. The standing man is animated, but nothing shows whether the exchange is an argument or ordinary discussion.',
  },
  3: {
    source: 'image',
    description:
      'A woman at a desk with an open laptop, her head propped on one hand and her eyes closed or nearly closed — drowsy or asleep. A clock sits in the top right corner. Nothing shows why she is tired.',
  },
  4: {
    source: 'image',
    description:
      'Four soldiers in uniform, carrying backpacks with rifles slung, climbing a steep rocky slope and spread out along the ascent. It is a military operation — not mountaineering, trekking, or an NCC camp.',
  },
  6: {
    source: 'assessor_description',
    description:
      'A closed room. One well-dressed male of about 24 and one well-dressed female of about 23, and one dark shadow. Props: a table, a chair, a JUICE BOTTLE, and a photo frame showing a boat.',
  },
  7: {
    source: 'assessor_description',
    description:
      'A government medical camp. A nurse standing, doctors examining people, a microscope, two tables, a village setting.',
  },
  10: {
    source: 'assessor_description',
    description:
      'One male character and one female character sitting under a tree. There is no lake, no crowd and no vehicle.',
  },
  11: {
    source: 'assessor_description',
    description: 'A wolf.',
  },
};

const FORBIDDEN_THEMES = [
  'Drugs or alcohol. Note especially that slide 6 contains a JUICE bottle; reading it as liquor is a perception error, and five of ten candidates in the source corpus made it.',
  'Giving or taking a lift, or being dropped home. Eight of ten candidates wrote this on slide 9 and every one was marked down. The one who instead had the hero stop to help a pregnant woman reach hospital scored better.',
  'Depression, paranoia or any other psychological disorder.',
  'A vacation or holiday as the entire plot, with no problem and no action.',
  'Money-mindedness, or acting in order to collect a reward or promotion.',
  'Archaic attitudes to gender, such as a woman needing permission to work.',
  'Unearned future fantasy — a school candidate imagining themselves already a senior officer.',
];

/**
 * Criteria are per-instrument. The assessor marks a 15-second word association
 * on entirely different grounds from a 4-minute story, and mixing them would
 * both mislead the model and leak un-entitled qualities into the prompt.
 */
const CRITERIA: Readonly<Record<Instrument, readonly string[]>> = {
  tat: [
    'Does the story resolve? A story left mid-way belongs in the low-theme band — it is not a separate, lesser fault.',
    'Does it build a story, or merely describe the picture? "A mere description of Picture" is a named failure.',
    'Is the hero named, aged, and given a concrete occupation or setting?',
    'Is the decisive action taken BY the hero — not by a passer-by, the police, or luck arriving?',
    'Is the sequence coherent? "Confused", "haphazard" and "irrational" are recurring marks.',
    'Is the detail specific? "Idea/Theme is ok But Poor Detailing" is the commonest qualified pass.',
  ],
  wat: [
    'Is it an impersonal, general statement? Personal pronouns (I, me, my, he, she, his, her) are penalised.',
    'Is it a complete, grammatical sentence rather than a fragment?',
    'Is the sentiment constructive rather than negative or violent?',
    'Is it specific rather than an empty platitude? "Nothing" is a mark the assessor uses for vacuous responses.',
  ],
  srt: [
    'Does the response COMMIT to an action, rather than prescribe what someone ought to do? Obligation verbs (must, should) read as authoritarian and are the one phrasing the assessor consistently marks.',
    'Is the action concrete and immediate rather than tentative? TRY and TRIED are explicitly penalised.',
    'Tense itself is NOT a scoring criterion. This academy prefers responses opening "He will ...", but the assessor applies that preference inconsistently, so do not mark a response down for past or present tense alone (DECISIONS.md D14).',
    'Does it address the actual hazard, or only call for help? The assessor supplies model answers like "plug the hole, bail out the water, resume".',
    'Does it show more than one step where the situation needs more than one?',
  ],
  sdt: [
    'Is each opinion substantial — the assessor asks for roughly 80-90 words, six to seven lines?',
    'Is it specific rather than a list of adjectives?',
    'Does it show real insight, including weaknesses AND how the candidate intends to mitigate them?',
    'Does the self-description agree with what the other instruments show, or contradict it?',
  ],
};

/**
 * The D11 warning, phrased per instrument. TAT gets the wolf case, which is the
 * sharpest real example in the corpus; the others get it in their own terms,
 * because a WAT prompt discussing picture slides is noise at best.
 */
const ORTHOGONALITY: Readonly<Record<Instrument, string>> = {
  tat: 'These genuinely diverge. In the source corpus the wolf picture has the HIGHEST acceptance rate of any slide while producing a restricted-courage finding on every single sheet. A well-built story can still reveal a weakness, and a weak story does not automatically mean a weak candidate. Never let one output drag the other.',
  wat: 'These genuinely diverge. A well-formed, grammatical sentence can still reveal something adverse, and a clumsy sentence does not by itself mean a weak candidate. Never let one output drag the other.',
  srt: 'These genuinely diverge. A correctly phrased response can still reveal a weakness — "He must" reads as authoritarian even when the proposed action is sound. Never let one output drag the other.',
  sdt: 'These genuinely diverge. A fluent, well-written self-description can still reveal poor insight, and a plainly written one can show real self-knowledge. Never let one output drag the other.',
};

const GRADE_GUIDE = [
  'LOW — incomplete, incoherent, mundane, thin, a forbidden theme, or a mere description of the picture. This is the commonest grade: roughly half of all stories land here.',
  'Just Avg — theme acceptable and story resolved, but thin on detail or specificity. This is the commonest passing grade.',
  'AVG — competent, resolved, reasonably detailed.',
  'Good — clear hero, concrete action, specific detail, positive resolution.',
  'V. good — all of the above plus genuine initiative and an idea worth remarking on. Rare; the source corpus contains none at TAT.',
];

function olqBlock(instrument: Instrument): string {
  return ENTITLEMENTS[instrument]
    .map((o) => `  - ${o}`)
    .join('\n');
}

export function buildRubric(instrument: Instrument): string {
  const name = instrument.toUpperCase();
  return `You are assessing a candidate's ${name} response for an Indian Services Selection Board (SSB) preparation product.

You are modelling the marking behaviour of a specific experienced assessor, reconstructed from 758 marks across 11 hand-graded dossiers. Follow that behaviour, not your own taste.

## Two independent outputs

You produce TWO judgements that are NOT derived from each other:

1. **quality** — how good the response is AS A RESPONSE.
2. **olq / flags** — what the response reveals about the candidate.

${ORTHOGONALITY[instrument]}

## Grade vocabulary — use these exact strings and no others

${GRADE_GUIDE.map((g) => `- ${g}`).join('\n')}

Valid values: ${GRADES.map((g) => `"${g}"`).join(', ')}.

${instrument === 'tat' ? CALIBRATION_BLOCK : ''}
## What the assessor rewards and penalises in ${name}

${CRITERIA[instrument].map((c) => `- ${c}`).join('\n')}
${
  instrument === 'tat'
    ? `
## Themes the assessor marks down

${FORBIDDEN_THEMES.map((t) => `- ${t}`).join('\n')}
`
    : ''
}

## OLQs you may score for ${name}

Score ONLY these. Returning any other OLQ causes the whole verdict to be rejected:

${olqBlock(instrument)}

Scores are integers 1-9. Omit an OLQ entirely rather than guessing — a partial vector is expected and correct. Every score must carry at least one short evidence string quoting or paraphrasing the response.

## Traits

Record trait observations in flags.traits, using the assessor's own vocabulary where it fits: Highly Anxious, Overthinker, Impulsive, Short temper, Aggressive, Scared, Money-Minded, Reward seeker, Highly Wishful, Lacks Confidence, Overbearing, Authoritarian.

**Fear labels are stimulus-driven, not dispositional.** Cynophobia belongs to the wolf picture, Phasmophobia to the shadow, Aquaphobia to the water items. They describe what the response did with the stimulus. Do not treat them as a diagnosis of the candidate.

## Perception

If a stimulus description is supplied and the response asserts something it contradicts, set flags.perceptionMismatch to a short statement of the contradiction. Otherwise set it to null. Do not speculate about the picture when no description is given.

## Output

Return ONLY a JSON object, no prose and no code fence:

{
  "quality": { "grade": "<one of the grades above>", "evidence": ["..."] },
  "olq": { "<olqName>": { "score": 1-9, "confidence": 0-1, "evidence": ["..."] } },
  "flags": { "themes": ["..."], "traits": ["..."], "perceptionMismatch": null }
}`;
}

export function buildUserMessage(req: JudgeRequest): string {
  const stimulus = req.stimulus ?? (req.slide != null ? STIMULI[req.slide]?.description : undefined);
  const parts: string[] = [];
  if (stimulus) {
    parts.push(`STIMULUS (what the picture actually shows):\n${stimulus}`);
  }
  parts.push(`CANDIDATE RESPONSE:\n${req.responseText.trim()}`);
  return parts.join('\n\n');
}
