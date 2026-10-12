/**
 * Calibration measured against the assessor's own reports.
 *
 * A rubric can describe what a good story looks like and still be miscalibrated
 * about how often stories are actually good. Eight reports were generated from
 * candidate responses before the assessor's were seen; scoring them exposed a
 * systematic gap that no amount of better prose in the rubric would have fixed,
 * because the rubric had no notion of a base rate at all.
 *
 * See corpus/predictions/batch-SCORED.md.
 */

/**
 * Who produced the marking this calibration is derived from.
 *
 * Further assessors are expected. When a second rater's marking arrives, add a
 * second entry here and compute the rate PER RATER before pooling — pooling
 * first destroys the only comparison that can separate this marker's threshold
 * from a shared standard. See corpus/SECOND-ASSESSOR-LEDGER.md item B1.
 */
export const CALIBRATION_SOURCES = [
  { assessor: 'yogesh-dutta', batch: 'LWS-2026, 31 July 2026', candidates: 11 },
] as const;

/** True while every number here comes from one marker. */
export const IS_SINGLE_RATER = CALIBRATION_SOURCES.length === 1;

/** Low-theme counts stated verbatim in each of the eleven assessor reports. */
export const OBSERVED_LOW_THEME = [
  { candidate: 'cand-09', low: 3, written: 12 },
  { candidate: 'cand-04', low: 4, written: 12 },
  { candidate: 'cand-10', low: 5, written: 12 },
  { candidate: 'cand-06', low: 5, written: 12 },
  { candidate: 'cand-01', low: 7, written: 12 },
  { candidate: 'cand-08', low: 7, written: 11 },
  { candidate: 'cand-02', low: 8, written: 11 },
  { candidate: 'cand-03', low: 8, written: 11 },
  { candidate: 'cand-11', low: 8, written: 11 },
  { candidate: 'cand-07', low: 9, written: 12 },
  { candidate: 'cand-05', low: 0, written: 8 },
] as const;

const totalLow = OBSERVED_LOW_THEME.reduce((a, r) => a + r.low, 0);
const totalWritten = OBSERVED_LOW_THEME.reduce((a, r) => a + r.written, 0);

/**
 * 64 of 124 written stories — **52%** — were judged low-theme.
 *
 * Reports generated before this was known flagged 30%. The rubric listed seven
 * forbidden themes and implicitly treated anything else as passing; the
 * assessor's band is far wider, and low is closer to the DEFAULT than the
 * exception.
 */
export const LOW_THEME_BASE_RATE = totalLow / totalWritten;

/**
 * A point estimate from one rater, not a population figure.
 *
 * Until a second assessor's rate is known there is no way to tell how much of
 * this 52% is the SSB standard and how much is this marker's threshold. Treat
 * it as a correction to an under-generous default, not as ground truth.
 */
export const BASE_RATE_IS_PROVISIONAL = IS_SINGLE_RATER;

/** What an uncalibrated read of the same responses produced, for contrast. */
export const UNCALIBRATED_RATE = 26 / 88;

/**
 * The structural finding behind most of the gap.
 *
 * Seven of the reports phrase the band identically:
 *
 *   "His 08 TAT stories were based on low level themes
 *    (AND ALSO NEED TO COMPLETE THE STORY)"
 *
 * Incompleteness is not a separate fault scored beside theme — it is folded
 * INTO the low-theme band. Treating them as two criteria, as the rubric did,
 * splits one count in half. Adding them together moved the estimate closer on
 * six of the eight candidates.
 */
export const INCOMPLETENESS_FOLDS_INTO_THEME = true;

/**
 * Guidance injected into the TAT rubric. Kept here rather than inline so the
 * numbers and the instruction cannot drift apart.
 */
export function themeCalibrationNote(): string {
  const pct = Math.round(LOW_THEME_BASE_RATE * 100);
  return [
    `## Calibration — read this before judging any theme`,
    ``,
    `In the source corpus **${pct}% of written stories were judged low-theme** (${totalLow} of ${totalWritten} across 11 candidates). A low theme is closer to the default than the exception. An assessment that finds only two or three weak stories in twelve is almost certainly too generous — the range actually observed runs from 3 to 9 per candidate.`,
    ``,
    `**Incompleteness counts as a low theme, not as a separate fault.** The assessor's own phrasing is "low level themes (and also need to complete the story)". A story that stops before resolving belongs in this band whatever its subject.`,
    ``,
    `A story escapes the band only when it has ALL of: a named protagonist, a real problem, an action that protagonist personally takes, a resolved ending, and specific supporting detail. Missing any one of those puts it in.`,
    ``,
    `The forbidden-theme list below is a set of automatic inclusions, NOT the boundary of the band. A mundane, thin or unresolved story is low-theme even when its subject is unobjectionable.`,
    ``,
    `*(This rate is measured from a single marker. It corrects a default that was demonstrably too generous; it is not a population figure.)*`,
  ].join('\n');
}

/**
 * Absence is invisible in a marking record but not in a submission.
 *
 * The same scoring pass over-rated the two candidates whose weakness was
 * blankness: one was called "among the more solid" while leaving 4 stories and
 * 34 word-associations empty, and another was praised for attempting 29 SRT
 * when the assessor's verdict on those 29 was "Poor".
 *
 * A grader reading a real submission can see every blank, so this is a bias in
 * how findings are WEIGHTED rather than a limit on what is available.
 */
export function absenceNote(): string {
  return [
    `## Weigh what is missing as heavily as what is written`,
    ``,
    `Count blanks and unattempted items first, and state them before any judgement of quality. An unwritten response scores nothing, and a candidate who leaves a third of the paper empty is not well served by praise for the part they finished.`,
    ``,
    `Volume is not quality. A high attempt count with weak responses is not a strength, and should not be reported as one.`,
  ].join('\n');
}
