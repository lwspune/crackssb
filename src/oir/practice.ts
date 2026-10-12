import { OPTION_LABELS } from '../items/bank.ts';
import type { OptionLabel } from '../items/bank.ts';

/**
 * Chapter practice (D26) — pure. One answer per row in `practice_answers`
 * (0007), retries included; a question counts by its latest answer.
 */

/** The columns of `practice_answers` this reads. */
export interface PracticeAnswer {
  readonly item_id: string;
  readonly correct: boolean;
  readonly answered_at: string;
}

export interface ChapterProgress {
  readonly total: number;
  readonly answered: number;
  /** Latest answer right. */
  readonly right: number;
  /** Latest answer wrong — what "retry wrong" serves. */
  readonly wrong: number;
}

/** item id → was its latest answer right. Answers to items outside `itemIds` are ignored. */
function latest(itemIds: readonly string[], answers: readonly PracticeAnswer[]): Map<string, boolean> {
  const inChapter = new Set(itemIds);
  const seen = new Map<string, PracticeAnswer>();
  for (const a of answers) {
    if (!inChapter.has(a.item_id)) continue;
    const prev = seen.get(a.item_id);
    if (!prev || Date.parse(a.answered_at) > Date.parse(prev.answered_at)) seen.set(a.item_id, a);
  }
  return new Map([...seen].map(([id, a]) => [id, a.correct]));
}

export function chapterProgress(itemIds: readonly string[], answers: readonly PracticeAnswer[]): ChapterProgress {
  const last = latest(itemIds, answers);
  let right = 0;
  for (const ok of last.values()) if (ok) right++;
  return { total: itemIds.length, answered: last.size, right, wrong: last.size - right };
}

/** `new`: not yet answered. `wrong`: latest answer wrong. `all`: from the start. */
export type PracticeSet = 'new' | 'wrong' | 'all';
export const PRACTICE_SETS: readonly PracticeSet[] = ['new', 'wrong', 'all'];

/** The questions to serve, in the order given (book order). */
export function practiceQueue(itemIds: readonly string[], answers: readonly PracticeAnswer[], set: PracticeSet): string[] {
  if (set === 'all') return [...itemIds];
  const last = latest(itemIds, answers);
  return set === 'new' ? itemIds.filter((id) => !last.has(id)) : itemIds.filter((id) => last.get(id) === false);
}

/** The set named in the address, if it is one; else what is left, then what was missed, then everything. */
export function pickSet(raw: string | string[] | undefined, progress: ChapterProgress): PracticeSet {
  if (typeof raw === 'string' && (PRACTICE_SETS as readonly string[]).includes(raw)) return raw as PracticeSet;
  if (progress.answered < progress.total) return 'new';
  return progress.wrong > 0 ? 'wrong' : 'all';
}

/** The `items.id` CHECK (0005). */
const ITEM_ID = /^[a-z0-9][a-z0-9-]{2,79}$/;

/** Validate an answer at the server action, before the database is asked. Null when it is not one. */
export function parsePracticeAnswer(itemId: unknown, chosen: unknown): { itemId: string; chosen: OptionLabel } | null {
  if (typeof itemId !== 'string' || !ITEM_ID.test(itemId) || typeof chosen !== 'string') return null;
  const c = chosen.trim().toUpperCase();
  return (OPTION_LABELS as readonly string[]).includes(c) ? { itemId, chosen: c as OptionLabel } : null;
}

/** Words for the codes answer_practice refuses with (0007). */
export function practiceRefusal(code: string): string {
  if (code === 'consent_required') return 'A guardian has to consent before your answers can be saved. Ask your academy.';
  if (code === 'dob_required') return 'Your date of birth is missing. Ask your academy to add it.';
  if (code === 'not_a_candidate') return 'Your account is not set up yet. Ask your academy.';
  return 'Could not check that answer. Check your connection and try again.';
}
