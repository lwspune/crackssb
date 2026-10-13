import source from '../../../content/oir/agrawal-examcart/ch24-paper-folding.source.json' with { type: 'json' };
import { OPTION_LABELS } from '../bank.ts';
import type { OptionLabel } from '../bank.ts';
import { matchMarks, mergeCuts, unfoldPaper } from './fold.ts';
import type { Fold, Mark } from './fold.ts';
import type { KeyEntry } from './key.ts';

/**
 * Derived answer key for Agrawal ExamCart OIR, Chapter 24 "Paper Cutting and
 * Folding" (pages 102-108). Each keyed question ships its folds, punches and
 * answer figures in sheet units (D29). The solver (`fold.ts`) opens the sheet
 * out fold by fold, last first, following the paper through partial folds,
 * joins cuts that meet across a fold, and the key is the one answer figure
 * whose marks match the opened sheet one for one. The keys below are written
 * out, and the check reruns the solver against the shipped data, so a wrong
 * letter or a misread figure fails the chapter test. Shipped with
 * `key_basis = 'derived'` until the book's key is compared against it.
 *
 * Source: content/oir/agrawal-examcart/ch24-paper-folding.source.json
 */

type Pt = readonly [number, number];
interface Plain {
  readonly paper: readonly Pt[];
  readonly folds: readonly Fold[];
  readonly punched: readonly Mark[];
  readonly options: Readonly<Record<OptionLabel, readonly Mark[]>>;
  readonly tol: number;
}
interface Reverse {
  readonly reverse: true;
  readonly target: readonly Mark[];
  readonly options: Readonly<Record<OptionLabel, { readonly folds: readonly Fold[]; readonly punched: readonly Mark[] }>>;
  readonly tol: number;
}
interface Q {
  readonly n: number;
  readonly options: Readonly<Record<OptionLabel, string>>;
  readonly fold?: Plain | Reverse;
  readonly medium?: string;
  readonly held?: string;
}

const question = (n: number) => source.questions[n - 1] as unknown as Q;
const SQUARE: readonly Pt[] = [[0, 0], [12, 0], [12, 12], [0, 12]];

/** A set of marks scaled to its own bounds: compares a layout, not a size. */
function layout(marks: readonly Mark[]): Mark[] {
  const xs = marks.map((m) => m.at[0]);
  const ys = marks.map((m) => m.at[1]);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  const s = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) || 1;
  return marks.map((m) => ({ ...m, at: [((m.at[0] - x0) / s) * 12, ((m.at[1] - y0) / s) * 12] as const }));
}

/** The answer figures the opened sheet matches. */
function matching(q: Q): OptionLabel[] {
  const f = q.fold!;
  if ('reverse' in f) return OPTION_LABELS.filter((l) => matchMarks(layout(f.target), layout(unfoldPaper(SQUARE, f.options[l].folds, f.options[l].punched)), f.tol));
  const opened = mergeCuts(unfoldPaper(f.paper, f.folds, f.punched));
  return OPTION_LABELS.filter((l) => matchMarks(opened, f.options[l], f.tol));
}

const count = (n: number) => (n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : String(n));

function keyed(n: number, key: OptionLabel): KeyEntry {
  const q = question(n);
  const hits = matching(q);
  if (hits.length !== 1) throw new Error(`Q${n}: ${hits.length} answer figures match the opened sheet, not one`);
  const f = q.fold!;
  const rule =
    'reverse' in f
      ? `Open each folded sheet out: only figure ${hits[0]} gives the pattern shown.`
      : (() => {
          const opened = mergeCuts(unfoldPaper(f.paper, f.folds, f.punched));
          return `Undo the ${count(f.folds.length)} fold${f.folds.length > 1 ? 's' : ''}, last first: each punch comes back mirrored across every fold it lay under, ${count(opened.length)} mark${opened.length > 1 ? 's' : ''} in all, as figure ${hits[0]} shows.`;
        })();
  return {
    key,
    confidence: q.medium ? 'medium' : 'high',
    rule,
    ...(q.medium ? { note: q.medium } : {}),
    check: { kind: 'computed', answer: q.options[hits[0]] },
  };
}

const KEYS: Readonly<Record<number, OptionLabel>> = {
  1: 'D', 2: 'B', 3: 'A', 4: 'B', 6: 'D', 7: 'C', 8: 'C', 10: 'A', 11: 'C', 12: 'A', 13: 'D', 14: 'D', 16: 'C', 18: 'A', 19: 'C',
  24: 'C', 25: 'D', 26: 'C', 27: 'C', 28: 'D', 32: 'C', 34: 'B', 35: 'C', 36: 'C', 37: 'B', 38: 'A', 39: 'D', 40: 'C', 41: 'C', 42: 'C',
  43: 'C', 44: 'A', 45: 'C', 46: 'D', 48: 'C', 49: 'B', 50: 'A', 51: 'A', 52: 'C', 53: 'D', 55: 'C', 56: 'A', 58: 'D', 59: 'A', 60: 'C',
  61: 'A', 62: 'C', 64: 'C', 65: 'A', 66: 'D', 67: 'B', 68: 'C', 70: 'A', 71: 'D', 72: 'B', 76: 'B', 77: 'D', 81: 'A',
};

export const AGRAWAL_CH24_PAPER_FOLDING: Readonly<Record<number, KeyEntry>> = Object.fromEntries(
  source.questions.map((raw) => {
    const q = raw as unknown as Q;
    if (q.held) return [q.n, { held: true, reason: q.held }];
    const key = KEYS[q.n];
    if (!key) throw new Error(`Q${q.n}: keyed in the source but not in KEYS`);
    return [q.n, keyed(q.n, key)];
  }),
);
