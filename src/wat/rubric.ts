import { z } from 'zod';
import { COMMENT_MAX, MARKS } from '../ppdt/rubric.ts';

/**
 * The WAT review rubric (D41). A mentor counts the words answered on the
 * sheet (0 to 60), then marks positive, practical and own voice, each a whole
 * mark 1 to 5; then went well / work on. No total and no band (D15).
 * review_wat (0019) enforces the same.
 */

export const WORDS_MAX = 60;
export { COMMENT_MAX, MARKS };

export const WAT_HEADINGS = [
  { key: 'positive', label: 'Positive', hint: 'Hopeful and constructive; fear and gloom turned round' },
  { key: 'practical', label: 'Practical', hint: 'Real things done or seen, not ideals' },
  { key: 'own', label: 'Own voice', hint: 'A thought of one’s own; no should, must or slogans' },
] as const;

export type WatKey = (typeof WAT_HEADINGS)[number]['key'];

export interface WatReview {
  readonly answered: number;
  readonly marks: Readonly<Record<WatKey, number>>;
  readonly wentWell: string | null;
  readonly focusOn: string | null;
  readonly at: string;
}

const mark = z.number().int().min(1).max(5);
const stored = z.object({
  verdict: z.object({
    rubric: z.literal('wat-1'),
    answered: z.number().int().min(0).max(WORDS_MAX),
    marks: z.object({ positive: mark, practical: mark, own: mark }).strict(),
  }),
  went_well: z.string().nullable(),
  focus_on: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

/** A stored `evaluations` row (evaluator 'human') as a WAT review; null for anything else. */
export function readWatReview(row: unknown): WatReview | null {
  const r = stored.safeParse(row);
  if (!r.success) return null;
  const { verdict, went_well, focus_on, created_at, updated_at } = r.data;
  return { answered: verdict.answered, marks: verdict.marks, wentWell: went_well, focusOn: focus_on, at: updated_at ?? created_at };
}

export interface WatDraft {
  /** As typed: checked here, a whole number 0-60. */
  readonly answered: string;
  readonly marks: Partial<Record<WatKey, number>>;
  readonly wentWell: string;
  readonly focusOn: string;
}

/** What stops a draft being saved, in the order the form shows it. Empty when it can be. */
export function watDraftProblems(d: WatDraft): string[] {
  const out: string[] = [];
  const n = d.answered.trim() === '' ? NaN : Number(d.answered);
  if (!Number.isInteger(n) || n < 0 || n > WORDS_MAX) out.push(`Count the words answered: 0 to ${WORDS_MAX}.`);
  for (const h of WAT_HEADINGS) if (!d.marks[h.key]) out.push(`Mark ${h.label}.`);
  if (!d.wentWell.trim() && !d.focusOn.trim()) out.push('Write what went well or what to work on.');
  else if (d.wentWell.trim().length > COMMENT_MAX || d.focusOn.trim().length > COMMENT_MAX) out.push(`Keep each note to ${COMMENT_MAX} characters.`);
  return out;
}
