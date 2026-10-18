import { OIR_CHAPTERS } from './chapters.ts';

/**
 * A mock's result (D32) from test_result's rows (0009): the score, what was
 * wrong and what was left blank, and accuracy by question type — weakest
 * first, each pointing at its chapter for practice. A blank is not wrong; it
 * is absent. Mocks are practice: no percentile, no band. Pure.
 */

export interface ResultRow {
  readonly ordinal: number;
  readonly item_id: string;
  /** '' when left blank. */
  readonly chosen: string;
  readonly key: string;
  readonly rule: string | null;
  readonly reasoning_type: string;
}

export interface TypeLine {
  readonly reasoningType: string;
  readonly title: string;
  /** The chapter to practise it in; null for a type with no chapter. */
  readonly slug: string | null;
  readonly total: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
}

export interface MockSummary {
  readonly total: number;
  readonly answered: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly byType: readonly TypeLine[];
}

export function summarise(rows: readonly ResultRow[]): MockSummary {
  const lines = new Map<string, { total: number; correct: number; wrong: number; skipped: number }>();
  for (const r of rows) {
    const l = lines.get(r.reasoning_type) ?? { total: 0, correct: 0, wrong: 0, skipped: 0 };
    l.total++;
    if (r.chosen === '') l.skipped++;
    else if (r.chosen === r.key) l.correct++;
    else l.wrong++;
    lines.set(r.reasoning_type, l);
  }

  const byType = [...lines.entries()]
    .map(([reasoningType, l]) => {
      const chapter = OIR_CHAPTERS.find((c) => c.reasoningType === reasoningType);
      return { reasoningType, title: chapter?.title ?? reasoningType, slug: chapter?.slug ?? null, ...l };
    })
    .sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total || a.title.localeCompare(b.title));

  const correct = byType.reduce((n, t) => n + t.correct, 0);
  const wrong = byType.reduce((n, t) => n + t.wrong, 0);
  const skipped = byType.reduce((n, t) => n + t.skipped, 0);
  return { total: rows.length, answered: correct + wrong, correct, wrong, skipped, byType };
}

/** One attempt at a mock, as my_test_attempts (0010) lists it. `correct` is null until the attempt is over. */
export interface Attempt {
  readonly sessionId: string;
  readonly testId: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly over: boolean;
  readonly answered: number;
  readonly correct: number | null;
}

export interface Standing {
  /** The best score of the attempts that are over; null if none is. */
  readonly best: number | null;
  /** Attempts that are over. */
  readonly tries: number;
  /** The session of an attempt still running, if any. */
  readonly live: string | null;
}

/** Each mock's standing, by mock id. A mock never started has none. */
export function standings(attempts: readonly Attempt[]): Map<string, Standing> {
  const out = new Map<string, Standing>();
  for (const a of attempts) {
    const s = out.get(a.testId) ?? { best: null, tries: 0, live: null };
    out.set(
      a.testId,
      a.over
        ? { ...s, tries: s.tries + 1, best: a.correct === null ? s.best : Math.max(s.best ?? 0, a.correct) }
        : { ...s, live: a.sessionId },
    );
  }
  return out;
}
