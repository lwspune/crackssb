import type { Item, OptionLabel } from '../bank.ts';

/**
 * Pure helpers for checking OIR answer keys mechanically, and for splitting a
 * bank item into the two rows the database stores.
 *
 * A derived key is a claim. Where a rule can be run, it is run: a number
 * series is regenerated from its rule and compared with the print, a letter
 * series is filled with the keyed option and tested for the pattern. See
 * `src/items/__tests__/oir-agrawal-series.test.ts`.
 */

/** Spaces and commas are layout; an en dash is how Q103 prints its blanks. */
export function normalizeLetters(s: string): string {
  return s.replace(/–/g, '_').replace(/[\s,]/g, '');
}

/** "c, u, c, r" and "cucr" are the same answer. */
export function optionLetters(option: string): string {
  return option.replace(/[\s,]/g, '');
}

export function fillBlanks(template: string, letters: string): string {
  const blanks = (template.match(/_/g) ?? []).length;
  if (blanks !== letters.length) {
    throw new RangeError(`template has ${blanks} blanks, got ${letters.length} letters`);
  }
  let i = 0;
  return template.replace(/_/g, () => letters[i++]);
}

/** Shortest block that repeats at least twice and generates the whole string (a partial last block is allowed). */
export function minimalPeriod(s: string): number | null {
  for (let p = 1; p <= s.length / 2; p++) {
    let ok = true;
    for (let i = p; i < s.length; i++) {
      if (s[i] !== s[i - p]) {
        ok = false;
        break;
      }
    }
    if (ok) return p;
  }
  return null;
}

/** Numbers in a printed series. A dash glued to a digit is a minus sign; question marks and dot leaders are not numbers. */
export function parseNumbers(s: string): number[] {
  return [...s.matchAll(/([—–-])?(\d+(?:\.\d+)?)/g)].map((m) => (m[1] ? -1 : 1) * Number(m[2]));
}

export function fromDiffs(start: number, diffs: readonly number[]): number[] {
  const out = [start];
  for (const d of diffs) out.push(out[out.length - 1] + d);
  return out;
}

/** `count` terms: the first is `start`, each next is `step(prev, i)` where i is the index being produced. */
export function iterate(start: number, count: number, step: (prev: number, i: number) => number): number[] {
  const out = [start];
  for (let i = 1; i < count; i++) out.push(step(out[i - 1], i));
  return out;
}

export function hamming(a: string, b: string): number {
  if (a.length !== b.length) throw new RangeError(`lengths differ: ${a.length} vs ${b.length}`);
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

function letterCounts(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of s.toUpperCase().replace(/[^A-Z]/g, '')) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}

/**
 * Word formation: what `candidate` needs that `word` cannot give, each letter
 * usable as often as it appears in `word`. Empty when the candidate can be
 * made. Letters only, case ignored.
 */
export function lettersShort(word: string, candidate: string): { letter: string; need: number; have: number }[] {
  const have = letterCounts(word);
  return [...letterCounts(candidate)]
    .filter(([c, n]) => (have.get(c) ?? 0) < n)
    .map(([letter, need]) => ({ letter, need, have: have.get(letter) ?? 0 }));
}

export type KeyBasis = 'derived' | 'book' | 'derived_and_book';

export interface ItemRow {
  readonly id: string;
  readonly assessment_type: Item['assessment_type'];
  readonly difficulty: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly asset_path: string | null;
  readonly active: boolean;
  readonly source: string;
  readonly source_ref: string;
}

export interface KeyRow {
  readonly item_id: string;
  readonly key: OptionLabel;
  readonly key_basis: KeyBasis;
  readonly rule: string;
}

/**
 * The `items` row a signed-in user may read, and the `item_keys` row only the
 * server may. The database refuses an `items.payload` carrying a key, so the
 * split happens here, once, before any write.
 */
export function splitKey(
  item: Item,
  meta: { sourceRef: string; keyBasis: KeyBasis; rule: string },
): { itemRow: ItemRow; keyRow: KeyRow } {
  const { key, assetPath, ...payload } = item.payload as Record<string, unknown> & { key?: OptionLabel; assetPath?: string };
  if (key === undefined) throw new TypeError(`${item.id}: no key in payload`);
  return {
    itemRow: {
      id: item.id,
      assessment_type: item.assessment_type,
      difficulty: item.difficulty,
      payload,
      asset_path: assetPath ?? null,
      active: item.active,
      source: item.source,
      source_ref: meta.sourceRef,
    },
    keyRow: { item_id: item.id, key, key_basis: meta.keyBasis, rule: meta.rule },
  };
}
