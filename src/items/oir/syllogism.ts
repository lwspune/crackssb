import { OPTION_LABELS } from '../bank.ts';
import type { OptionLabel } from '../bank.ts';

/**
 * A syllogism solver for checking OIR keys (Chapter 17). Classes are drawn as
 * a Venn diagram: with n classes there are 2ⁿ − 1 regions, each empty or not.
 *
 * "all"/"no" statements empty regions; "some" statements, and the exam's rule
 * that every class named has members, need a region filled. Filling a region
 * never breaks a "some", so the arrangement with every allowed region filled
 * is the most permissive one. That decides everything without enumerating
 * arrangements:
 * - an all/no conclusion follows when no allowed region breaks it;
 * - a some conclusion follows when emptying its witness regions leaves the
 *   statements unsatisfiable;
 * - "can be" holds when some arrangement allows it.
 *
 * Forms: "all a b", "some a b", "no a b", "somenot a b" (some a are not b),
 * "few a b" (only a few a are b: some are, some are not), "never a b" (all a
 * can never be b, i.e. some a are not b), "canall a b", "cansome a b".
 */

type Q = 'all' | 'some' | 'no' | 'somenot' | 'few' | 'never' | 'canall' | 'cansome';
interface Prop {
  readonly q: Q;
  readonly a: string;
  readonly b: string;
}

const FORMS: readonly Q[] = ['all', 'some', 'no', 'somenot', 'few', 'never', 'canall', 'cansome'];

function parse(s: string): Prop {
  const [q, a, b, ...rest] = s.trim().split(/\s+/);
  if (!FORMS.includes(q as Q) || !a || !b || rest.length) throw new Error(`cannot read "${s}": "${q}" is not a form`);
  return { q: q as Q, a, b };
}

interface World {
  readonly terms: readonly string[];
  /** Regions every statement allows, as bitmasks over `terms`. */
  readonly allowed: readonly number[];
  /** Each existential the statements need: a test a region can witness. */
  readonly needs: readonly ((r: number) => boolean)[];
}

const inA = (w: World, t: string) => (r: number) => (r >> w.terms.indexOf(t)) & 1;

function world(statements: readonly Prop[], conclusions: readonly Prop[]): World {
  const terms = [...new Set([...statements, ...conclusions].flatMap((p) => [p.a, p.b]))];
  const bit = (t: string) => 1 << terms.indexOf(t);
  const has = (r: number, t: string) => (r & bit(t)) !== 0;
  const regions = Array.from({ length: (1 << terms.length) - 1 }, (_, i) => i + 1);
  const allowed = regions.filter((r) =>
    statements.every((p) => (p.q === 'all' ? !(has(r, p.a) && !has(r, p.b)) : p.q === 'no' ? !(has(r, p.a) && has(r, p.b)) : true)),
  );
  const needs: ((r: number) => boolean)[] = terms.map((t) => (r: number) => has(r, t));
  for (const p of statements) {
    if (p.q === 'some' || p.q === 'few') needs.push((r) => has(r, p.a) && has(r, p.b));
    if (p.q === 'somenot' || p.q === 'few' || p.q === 'never') needs.push((r) => has(r, p.a) && !has(r, p.b));
    if (p.q === 'canall' || p.q === 'cansome') throw new Error('a possibility is a conclusion, not a statement');
  }
  return { terms, allowed, needs };
}

const satisfiable = (w: World, regions: readonly number[]) => w.needs.every((n) => regions.some(n));

function holds(w: World, c: Prop): boolean {
  const has = (r: number, t: string) => inA(w, t)(r) === 1;
  const both = (r: number) => has(r, c.a) && has(r, c.b);
  const aNotB = (r: number) => has(r, c.a) && !has(r, c.b);
  const without = (out: (r: number) => boolean) => w.allowed.filter((r) => !out(r));
  switch (c.q) {
    case 'all':
      return !w.allowed.some(aNotB);
    case 'no':
      return !w.allowed.some(both);
    case 'some':
      return !satisfiable(w, without(both));
    case 'somenot':
    case 'never':
      return !satisfiable(w, without(aNotB));
    case 'few':
      return !satisfiable(w, without(both)) && !satisfiable(w, without(aNotB));
    case 'cansome':
      return w.allowed.some(both);
    case 'canall':
      return satisfiable(w, without(aNotB));
  }
}

/** Two conclusions of which exactly one is true in every arrangement. */
function contradictory(p: Prop, q: Prop): boolean {
  const same = p.a === q.a && p.b === q.b;
  const swapped = p.a === q.b && p.b === q.a;
  const pair = (x: Q, y: Q) => (p.q === x && q.q === y) || (p.q === y && q.q === x);
  if (pair('some', 'no')) return same || swapped;
  if (pair('all', 'somenot') || pair('all', 'never')) return same;
  return false;
}

export interface Verdicts {
  /** Per conclusion: does it follow? */
  readonly follows: readonly boolean[];
  /** Index pairs that make an either-or: neither follows, exactly one is true. */
  readonly either: readonly (readonly [number, number])[];
}

export function verdicts(statements: readonly string[], conclusions: readonly string[]): Verdicts {
  const st = statements.map(parse);
  const cs = conclusions.map(parse);
  const w = world(st, cs);
  if (!satisfiable(w, w.allowed)) throw new Error('the statements contradict each other');
  const follows = cs.map((c) => holds(w, c));
  const either: [number, number][] = [];
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) if (!follows[i] && !follows[j] && contradictory(cs[i], cs[j])) either.push([i, j]);
  return { follows, either };
}

export type OptionMeaning = { readonly kind: 'set'; readonly set: readonly number[] } | { readonly kind: 'either'; readonly pair: readonly [number, number] };

const NUMERAL: Readonly<Record<string, number>> = { I: 0, II: 1, III: 2, IV: 3, 1: 0, 2: 1, 3: 2, 4: 3 };

/** What an option says follows, out of `count` conclusions; null when it names none it can be held to. */
export function optionMeaning(text: string, count: number): OptionMeaning | null {
  const t = text.replace(/IIand/g, 'II and');
  const nums = [...t.matchAll(/(?<![A-Za-z])(IV|III|II|I|[1-4])(?![A-Za-z])/g)].map((m) => NUMERAL[m[1]]);
  if (/\beither\b/i.test(t) || /\bI or II\b/.test(t)) return nums.length === 2 ? { kind: 'either', pair: [nums[0], nums[1]] } : null;
  if (/\b(neither|none|nor)\b|do not follow/i.test(t)) return { kind: 'set', set: [] };
  if (/^\s*all\b/i.test(t) || (/^\s*both\b/i.test(t) && nums.length === 0)) return { kind: 'set', set: Array.from({ length: count }, (_, i) => i) };
  if (nums.length === 0) return null;
  return { kind: 'set', set: [...new Set(nums)].sort((a, b) => a - b) };
}

/**
 * The text of the one option that says what the solver finds. An either-or
 * option, when the conclusions make one, is preferred to "neither".
 * Throws unless exactly one option fits.
 */
export function pickOption(options: Readonly<Record<OptionLabel, string>>, statements: readonly string[], conclusions: readonly string[]): string {
  const v = verdicts(statements, conclusions);
  const set = v.follows.flatMap((f, i) => (f ? [i] : []));
  const meanings = OPTION_LABELS.map((l) => [l, optionMeaning(options[l], conclusions.length)] as const);
  const eitherHits = meanings.filter(([, m]) => m?.kind === 'either' && set.length === 0 && v.either.some(([i, j]) => i === m.pair[0] && j === m.pair[1]));
  const hits = eitherHits.length > 0 ? eitherHits : meanings.filter(([, m]) => m?.kind === 'set' && m.set.join() === set.join());
  if (hits.length !== 1) throw new Error(`${hits.length} options say [${set.map((i) => i + 1).join(', ')}] follow${v.either.length ? ' (with an either-or)' : ''}, not one`);
  return options[hits[0][0]];
}
