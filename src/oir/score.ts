import { OPTION_LABELS } from '../items/bank.ts';
import type { AssembledBooklet, OptionLabel } from '../items/bank.ts';

/**
 * `score-oir` — ARCHITECTURE.md §5: responses to a per-reasoning-type
 * breakdown, a percentile and a simulated 1–5 band. Pure and deterministic;
 * no model anywhere near it.
 *
 * Two things it refuses to fake:
 *
 *  - A percentile without a norm. Until prior sittings exist there is nothing
 *    to rank against, and the honest output is `null` — "not yet measured"
 *    (UI.md §7 rule 3) — never a manufactured 50th.
 *  - OLQ scores. OIR is entitled to Effective Intelligence and Reasoning
 *    Ability (ARCHITECTURE.md §3.1) but mapping a raw count onto a 1–9 scale
 *    needs the same norm. That is a separate step, not this one.
 *
 * No negative marking: the SSB's OIR has none.
 */

export interface TypeBreakdown {
  readonly n: number;
  readonly attempted: number;
  readonly correct: number;
  /** correct / attempted within the type. Null when nothing in the type was attempted. */
  readonly pValue: number | null;
}

export interface OirItemResult {
  readonly ordinal: number;
  readonly chosen: OptionLabel | null;
  /** Null when blank — a blank is not wrong, it is absent. */
  readonly correct: boolean | null;
}

export type OirBand = 1 | 2 | 3 | 4 | 5;

export interface OirScore {
  readonly attempted: number;
  readonly correct: number;
  /** Equal to `correct` — there is no penalty. Kept as its own field so a future scheme has a place to differ. */
  readonly raw: number;
  readonly byType: Readonly<Record<string, TypeBreakdown>>;
  readonly percentile: number | null;
  readonly band: OirBand | null;
  readonly items: readonly OirItemResult[];
}

/**
 * Percentile floors for bands 1–4; below the last is band 5. Band 1 is best,
 * as in the SSB's own OIR rating.
 *
 * PROVISIONAL. The real thresholds are not public; these are a placeholder
 * that makes the band computable. Revisit when a norm exists and someone
 * with board experience can say where the cuts actually fall.
 */
export const BAND_THRESHOLDS = [90, 70, 40, 15] as const;

export function bandFor(percentile: number): OirBand {
  for (let i = 0; i < BAND_THRESHOLDS.length; i++) {
    if (percentile >= BAND_THRESHOLDS[i]) return (i + 1) as OirBand;
  }
  return 5;
}

/** Share of the norm strictly below `raw`, with ties counted half. Null when there is no norm. */
export function percentileOf(raw: number, norm: readonly number[] | undefined): number | null {
  if (!norm || norm.length === 0) return null;
  let below = 0;
  let equal = 0;
  for (const n of norm) {
    if (n < raw) below++;
    else if (n === raw) equal++;
  }
  return ((below + 0.5 * equal) / norm.length) * 100;
}

function normaliseChoice(ordinal: number, value: string | undefined): OptionLabel | null {
  const v = (value ?? '').trim().toUpperCase();
  if (v === '') return null;
  if (!(OPTION_LABELS as readonly string[]).includes(v)) {
    throw new RangeError(`Invalid choice "${value}" for ordinal ${ordinal}`);
  }
  return v as OptionLabel;
}

export function scoreOir(
  booklet: AssembledBooklet,
  responses: Readonly<Record<string, string>>,
  norm?: readonly number[],
): OirScore {
  if (booklet.released.length === 0) throw new RangeError('Cannot score an empty booklet');

  const ordinals = new Set<number>();
  for (const r of booklet.released) {
    if (ordinals.has(r.ordinal)) throw new RangeError(`Duplicate ordinal ${r.ordinal} in booklet`);
    ordinals.add(r.ordinal);
    if (booklet.answerKey[r.ordinal] === undefined) throw new RangeError(`No key for ordinal ${r.ordinal}`);
  }
  for (const k of Object.keys(responses)) {
    if (!ordinals.has(Number(k))) throw new RangeError(`Response for ordinal ${k} not in booklet`);
  }

  const byType: Record<string, { n: number; attempted: number; correct: number }> = {};
  const items: OirItemResult[] = [];
  let attempted = 0;
  let correct = 0;

  for (const r of [...booklet.released].sort((a, b) => a.ordinal - b.ordinal)) {
    const type = typeof r.payload.reasoningType === 'string' ? r.payload.reasoningType : 'unclassified';
    const t = (byType[type] ??= { n: 0, attempted: 0, correct: 0 });
    t.n++;

    const chosen = normaliseChoice(r.ordinal, responses[String(r.ordinal)]);
    if (chosen === null) {
      items.push({ ordinal: r.ordinal, chosen: null, correct: null });
      continue;
    }
    const ok = chosen === booklet.answerKey[r.ordinal];
    attempted++;
    t.attempted++;
    if (ok) {
      correct++;
      t.correct++;
    }
    items.push({ ordinal: r.ordinal, chosen, correct: ok });
  }

  const percentile = percentileOf(correct, norm);

  return {
    attempted,
    correct,
    raw: correct,
    byType: Object.fromEntries(
      Object.entries(byType).map(([k, t]) => [k, { ...t, pValue: t.attempted === 0 ? null : t.correct / t.attempted }]),
    ),
    percentile,
    band: percentile === null ? null : bandFor(percentile),
    items,
  };
}
