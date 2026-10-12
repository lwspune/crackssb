import { GRADES, type Grade } from '../judge/contract.ts';

/**
 * Measuring a judge against the human assessor.
 *
 * The corpus grade distribution is badly skewed: LOW 50, Just Avg 37, AVG 5,
 * Good 1, V. good 0. A judge that answers "LOW" every time scores 54%, so a
 * bare accuracy figure is close to meaningless. This scorer always reports the
 * majority-class baseline, whether the judge beat it, whether it collapsed onto
 * one grade, and which direction it errs in.
 *
 * Per D5, agreement measured this way is what selects the provider.
 */

export const GRADE_SCALE = GRADES;

const RANK = new Map<string, number>(GRADE_SCALE.map((g, i) => [g, i]));

export interface AgreementRow {
  readonly id: string;
  readonly slide?: number;
  readonly expected: { readonly grade: Grade | string | null };
  readonly actual: { readonly grade: Grade | string | null };
}

export interface AgreementReport {
  readonly exact: { readonly n: number; readonly hits: number; readonly rate: number };
  readonly adjacent: { readonly n: number; readonly hits: number; readonly rate: number };
  /** What always answering the commonest ground-truth grade would score. */
  readonly baseline: { readonly grade: string; readonly rate: number };
  readonly beatsBaseline: boolean;
  /** Positive = judge is systematically more lenient than the assessor. */
  readonly meanSignedError: number;
  readonly expectedDistribution: Readonly<Record<string, number>>;
  readonly actualDistribution: Readonly<Record<string, number>>;
  /** True when the judge put everything in one bucket. */
  readonly collapsed: boolean;
  readonly bySlide: Readonly<Record<number, { exact: number; n: number }>>;
  /** Rows with no ground-truth grade. Not counted as misses. */
  readonly skipped: number;
}

function tally(values: readonly (string | null)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) if (v != null) out[v] = (out[v] ?? 0) + 1;
  return out;
}

export function scoreAgreement(rows: readonly AgreementRow[]): AgreementReport {
  const scorable = rows.filter((r) => r.expected.grade != null);
  const skipped = rows.length - scorable.length;
  if (scorable.length === 0) {
    throw new Error('No scorable rows — every row lacked a ground-truth grade');
  }

  let exactHits = 0;
  let adjacentHits = 0;
  let signedSum = 0;
  let signedN = 0;
  const bySlide: Record<number, { exact: number; n: number }> = {};

  for (const row of scorable) {
    const expected = row.expected.grade as string;
    const actual = row.actual.grade;
    const slide = row.slide;

    if (slide != null) {
      bySlide[slide] ??= { exact: 0, n: 0 };
      bySlide[slide].n += 1;
    }

    // A judge that returned nothing is wrong, not absent. Only missing GROUND
    // TRUTH is a skip — otherwise a model could score well by declining.
    if (actual == null) continue;

    if (actual === expected) {
      exactHits += 1;
      adjacentHits += 1;
      if (slide != null) bySlide[slide].exact += 1;
      signedN += 1;
      continue;
    }

    const re = RANK.get(expected);
    const ra = RANK.get(actual);
    if (re == null || ra == null) continue; // off-vocabulary grade: counts as a miss
    if (Math.abs(ra - re) === 1) adjacentHits += 1;
    signedSum += ra - re;
    signedN += 1;
  }

  for (const s of Object.keys(bySlide)) {
    const k = Number(s);
    bySlide[k] = { exact: bySlide[k].exact / bySlide[k].n, n: bySlide[k].n };
  }

  const expectedDistribution = tally(scorable.map((r) => r.expected.grade as string));
  const actualDistribution = tally(scorable.map((r) => r.actual.grade));

  const [baselineGrade, baselineCount] = Object.entries(expectedDistribution).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const baselineRate = baselineCount / scorable.length;
  const exactRate = exactHits / scorable.length;

  return {
    exact: { n: scorable.length, hits: exactHits, rate: exactRate },
    adjacent: { n: scorable.length, hits: adjacentHits, rate: adjacentHits / scorable.length },
    baseline: { grade: baselineGrade, rate: baselineRate },
    beatsBaseline: exactRate > baselineRate,
    meanSignedError: signedN === 0 ? 0 : signedSum / signedN,
    expectedDistribution,
    actualDistribution,
    collapsed: Object.keys(actualDistribution).length === 1 && scorable.length > 1,
    bySlide,
    skipped,
  };
}
