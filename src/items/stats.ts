import { OPTION_LABELS } from './bank.ts';
import type { OptionLabel } from './bank.ts';

/**
 * Item statistics — ported from Question_Bank's `src/lib/itemStats/`, whose
 * ITEM_STATS.md records the one rule that governs this module:
 *
 *   rows are stored at SITTING grain and pooled at READ time.
 *
 * A pooled number cannot be un-pooled. When a sitting turns out to be invalid
 * you subtract it; when a key is corrected, the rows measured under the old
 * key are stale. ARCHITECTURE.md §4 sketched `item_stats` as one pooled row
 * per item — that is the mistake Question_Bank already made once (their
 * migration 0010) and paid to undo. See D19.
 *
 * Dropped from the port: the tracker/vault two-source split and cohort
 * exposure. One source here, and batches are a staff concern (UI.md §5.2).
 */

/** One sitting's evidence for one item. */
export interface SittingRow {
  readonly itemId: string;
  /** The session/booklet run this came from. Opaque. */
  readonly sittingId: string;
  readonly seen: number;
  readonly attempted: number;
  readonly correct: number;
  /** Over ATTEMPTED responses only. Empty for un-keyed instruments. */
  readonly choiceCounts: Readonly<Partial<Record<OptionLabel, number>>>;
  readonly discTopCorrect: number | null;
  readonly discTopN: number | null;
  readonly discBottomCorrect: number | null;
  readonly discBottomN: number | null;
  /** The key AS MEASURED. A row measured under a different key is stale. */
  readonly keyAtMeasurement: OptionLabel | null;
  readonly measuredAt: string;
}

export interface ItemStats {
  readonly attempted: number;
  readonly correct: number;
  /** correct / attempted. NEVER correct / seen — that makes an easy-but-avoided item read as hard. */
  readonly pValue: number;
  readonly choiceCounts: Readonly<Record<OptionLabel, number>>;
  /** Top-27% rate minus bottom-27%, pooled as counts. Null when no sitting carried a split. */
  readonly discrimination: number | null;
  readonly sittings: number;
  /** Rows excluded because the key has changed since they were measured. */
  readonly staleDropped: number;
}

/**
 * Pool sitting rows into the one number a card shows. `currentKey` is
 * required, not optional, so the staleness rule cannot be forgotten at a
 * call site — pass `null` for an un-keyed instrument.
 */
export function aggregate(rows: readonly SittingRow[], currentKey: OptionLabel | null): ItemStats | null {
  let staleDropped = 0;
  const live: SittingRow[] = [];
  for (const r of rows) {
    if (r.keyAtMeasurement !== currentKey) {
      staleDropped++;
      continue;
    }
    live.push(r);
  }
  if (live.length === 0) return null;

  let attempted = 0;
  let correct = 0;
  const choiceCounts = { A: 0, B: 0, C: 0, D: 0 } as Record<OptionLabel, number>;
  let topCorrect = 0;
  let topN = 0;
  let bottomCorrect = 0;
  let bottomN = 0;
  let discSittings = 0;

  for (const r of live) {
    attempted += r.attempted;
    correct += r.correct;
    for (const label of OPTION_LABELS) choiceCounts[label] += r.choiceCounts[label] ?? 0;

    // Discrimination pools as COUNTS, never as a mean of per-sitting rates —
    // averaging rates lets a 10-student sitting outweigh a 100-student one.
    if (r.discTopCorrect !== null && r.discTopN !== null && r.discBottomCorrect !== null && r.discBottomN !== null) {
      topCorrect += r.discTopCorrect;
      topN += r.discTopN;
      bottomCorrect += r.discBottomCorrect;
      bottomN += r.discBottomN;
      discSittings++;
    }
  }

  // An undefined p-value is not zero. An item every candidate skipped has no
  // difficulty reading at all, and "0%" would assert one.
  if (attempted === 0) return null;

  const discrimination = discSittings > 0 && topN > 0 && bottomN > 0 ? topCorrect / topN - bottomCorrect / bottomN : null;

  return {
    attempted,
    correct,
    pValue: correct / attempted,
    choiceCounts,
    discrimination,
    sittings: live.length,
    staleDropped,
  };
}

// ---------------------------------------------------------------------------
// The split, computed within one sitting
// ---------------------------------------------------------------------------

export interface SittingEntry {
  readonly candidate: string;
  /** The candidate's total on the whole booklet — what they are ranked by. */
  readonly total: number;
  readonly correctOnItem: boolean;
}

/**
 * Kelley's 27% groups for one item within one sitting. Ranking happens
 * INSIDE a sitting because ranking candidates across cohorts of differing
 * ability would be meaningless; the counts then pool across sittings in
 * `aggregate`.
 */
export function sittingSplit(entries: readonly SittingEntry[]): Pick<SittingRow, 'discTopCorrect' | 'discTopN' | 'discBottomCorrect' | 'discBottomN'> {
  if (entries.length < 2) return { discTopCorrect: null, discTopN: null, discBottomCorrect: null, discBottomN: null };
  const k = Math.max(1, Math.round(entries.length * 0.27));
  const ranked = [...entries].sort((a, b) => b.total - a.total);
  const top = ranked.slice(0, k);
  const bottom = ranked.slice(-k);
  return {
    discTopCorrect: top.filter((e) => e.correctOnItem).length,
    discTopN: k,
    discBottomCorrect: bottom.filter((e) => e.correctOnItem).length,
    discBottomN: k,
  };
}

// ---------------------------------------------------------------------------
// Leads — items whose distribution says the key may be wrong
// ---------------------------------------------------------------------------

/** A ratio needs volume to mean anything. Below this, no lead is raised. */
export const MIN_N_LEAD = 10;

/**
 * - `key-never-chosen` — nobody picked the keyed answer. Very strong, still
 *   ambiguous: an entire cohort can fall for one well-built trap.
 * - `distractor` — a distractor outpulled the key.
 */
export type LeadReason = 'key-never-chosen' | 'distractor';

export interface Lead {
  readonly itemId: string;
  readonly attempted: number;
  readonly keyCount: number;
  readonly topDistractor: { label: OptionLabel; count: number } | null;
  /** topDistractor / keyCount. Null when the key was chosen by nobody. */
  readonly ratio: number | null;
  readonly discrimination: number | null;
  readonly reason: LeadReason;
}

export function computeLead(itemId: string, stats: ItemStats | null, key: OptionLabel | null): Lead | null {
  // No key, nothing to outpull.
  if (!stats || key === null) return null;
  if (stats.attempted < MIN_N_LEAD) return null;

  const keyCount = stats.choiceCounts[key];
  let top: { label: OptionLabel; count: number } | null = null;
  for (const label of OPTION_LABELS) {
    if (label === key) continue;
    const count = stats.choiceCounts[label];
    if (count > 0 && (top === null || count > top.count)) top = { label, count };
  }
  if (top === null || top.count <= keyCount) return null;

  return {
    itemId,
    attempted: stats.attempted,
    keyCount,
    topDistractor: top,
    ratio: keyCount === 0 ? null : top.count / keyCount,
    discrimination: stats.discrimination,
    reason: keyCount === 0 ? 'key-never-chosen' : 'distractor',
  };
}
