import type { OptionLabel } from '../bank.ts';

/**
 * A derived answer key for one chapter of a source book, in a form a test can
 * check. Every entry names its rule in words AND, where the rule can be run,
 * as code: `src/items/__tests__/oir-agrawal-series.test.ts` runs it against
 * the printed question and against every option.
 */

/**
 * - `missing`: `terms` is the whole series; the printed numbers are `terms`
 *   minus the `blanks` indices, and the keyed option holds the blank values.
 * - `wrong`: `terms` is the correct series; it differs from the print at
 *   exactly one position, and the keyed option is the printed number there.
 * - `fill` with `period`: the keyed letters fill the blanks and the result
 *   repeats with exactly that period. `misread` counts characters of
 *   `template` that differ from the print, each explained in the note.
 * - `fill` with `expected`: the keyed letters fill the blanks to `expected`.
 * - `next`: `sequence` regenerates the printed items and the keyed option is
 *   the item after them.
 * - `reasoned`: no mechanical check; the rule is the argument.
 */
export type KeyCheck =
  | { readonly kind: 'missing'; readonly terms: readonly number[]; readonly blanks: readonly number[] }
  | { readonly kind: 'wrong'; readonly terms: readonly number[] }
  | { readonly kind: 'fill'; readonly template: string; readonly period: number; readonly misread?: number }
  | { readonly kind: 'fill'; readonly template: string; readonly expected: string; readonly misread?: number }
  | { readonly kind: 'next'; readonly sequence: readonly string[] }
  | { readonly kind: 'reasoned' };

/**
 * `high`: the rule fits every printed term and only the keyed option fits it.
 * `medium`: the same, but the rule is unusual or the print needed a reading;
 * `note` says which. Both ship; medium ones are checked first against the
 * book's own key when it arrives.
 */
export type KeyConfidence = 'high' | 'medium';

export interface KeyedEntry {
  readonly key: OptionLabel;
  readonly rule: string;
  readonly confidence: KeyConfidence;
  readonly check: KeyCheck;
  readonly note?: string;
  /** The stem as presented, when the print cannot be shown as it is. `note` says why. */
  readonly stemFix?: string;
  /** Replaces the printed section direction when the question does not fit it. */
  readonly direction?: string;
}

/** Not shipped: the printed question cannot be answered as it stands. */
export interface HeldEntry {
  readonly held: true;
  readonly reason: string;
  /** The option a likely misprint points to, if any. Never shipped as a key. */
  readonly lean?: OptionLabel;
}

export type KeyEntry = KeyedEntry | HeldEntry;

export const isHeld = (e: KeyEntry): e is HeldEntry => 'held' in e;
