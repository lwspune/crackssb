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

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const reverse = (s: string) => [...s].reverse().join('');

/** The letter orders the book's alphabet questions are set in. */
export const ALPHABETS = {
  normal: ABC,
  firstHalfReversed: reverse(ABC.slice(0, 13)) + ABC.slice(13),
  secondHalfReversed: ABC.slice(0, 13) + reverse(ABC.slice(13)),
  reversed: reverse(ABC),
} as const;

/** The n-th letter from the left (1-based), or null off the end. */
export function fromLeft(seq: string, n: number): string | null {
  return n >= 1 && n <= seq.length ? seq[n - 1] : null;
}

export function fromRight(seq: string, n: number): string | null {
  return fromLeft(seq, seq.length + 1 - n);
}

export function posFromLeft(seq: string, letter: string): number {
  const i = seq.indexOf(letter);
  if (i < 0) throw new RangeError(`${letter} is not in ${seq}`);
  return i + 1;
}

export function posFromRight(seq: string, letter: string): number {
  return seq.length + 1 - posFromLeft(seq, letter);
}

export function rightOf(seq: string, letter: string, k: number): string | null {
  return fromLeft(seq, posFromLeft(seq, letter) + k);
}

export function leftOf(seq: string, letter: string, k: number): string | null {
  return fromLeft(seq, posFromLeft(seq, letter) - k);
}

/** The letter exactly midway between two, or null when an even number of letters lie between them. */
export function middleOf(seq: string, a: string, b: string): string | null {
  const sum = posFromLeft(seq, a) + posFromLeft(seq, b);
  return sum % 2 === 0 ? fromLeft(seq, sum / 2) : null;
}

/** How many letters lie strictly between two. */
export function between(seq: string, a: string, b: string): number {
  return Math.abs(posFromLeft(seq, a) - posFromLeft(seq, b)) - 1;
}

export type Compass = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
const COMPASS_DEG: Readonly<Record<Compass, number>> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
const COMPASS_NAME = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'] as const;
/** Below this, a coordinate is zero: 45° moves leave float dust. */
const EPS = 1e-9;

/** A walk step: move forward, turn left or right 90°, turn by degrees (clockwise positive), or face a direction outright. */
export type Step = number | 'L' | 'R' | { readonly turn: number } | { readonly face: Compass };

/**
 * Direction-sense questions as a walk. x runs east, y north, heading in
 * degrees clockwise from north. Pure: the same steps always land in the same place.
 */
export function walk(start: Compass, steps: readonly Step[]): { x: number; y: number; heading: number } {
  let x = 0;
  let y = 0;
  let heading = COMPASS_DEG[start];
  for (const s of steps) {
    if (s === 'L') heading -= 90;
    else if (s === 'R') heading += 90;
    else if (typeof s === 'number') {
      const rad = (heading * Math.PI) / 180;
      x += s * Math.sin(rad);
      y += s * Math.cos(rad);
    } else if ('turn' in s) heading += s.turn;
    else heading = COMPASS_DEG[s.face];
    heading = ((heading % 360) + 360) % 360;
  }
  const clean = (v: number) => (Math.abs(v - Math.round(v)) < EPS ? Math.round(v) : v);
  return { x: clean(x), y: clean(y), heading };
}

/** "North" … "North-West" for a multiple of 45°; null for anything between. */
export function facingName(deg: number): string | null {
  const d = ((deg % 360) + 360) % 360;
  return d % 45 === 0 ? COMPASS_NAME[d / 45] : null;
}

/** Where a point at (dx, dy) lies, by quadrant: due north, or "North-East" for anything up and to the right. Null at the origin. */
export function bearingName(dx: number, dy: number): string | null {
  const ns = dy > EPS ? 'North' : dy < -EPS ? 'South' : '';
  const ew = dx > EPS ? 'East' : dx < -EPS ? 'West' : '';
  return ns && ew ? `${ns}-${ew}` : ns || ew || null;
}

/** 1 → "1st", 12 → "12th", 23 → "23rd": a rank as the book prints it. */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
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
