import { z } from 'zod';
import { COMMENT_MAX, MARKS } from '../ppdt/rubric.ts';

/**
 * The SRT review rubric (D39). A mentor counts the situations answered on the
 * sheet (0 to 60), then marks practical, quick and complete, each a whole
 * mark 1 to 5; then went well / work on. No total and no band (D15).
 * review_srt (0018) enforces the same.
 */

export const SITUATIONS_MAX = 60;
export { COMMENT_MAX, MARKS };

export const SRT_HEADINGS = [
  { key: 'practical', label: 'Practical', hint: 'What he does would work, with what is at hand' },
  { key: 'quick', label: 'Quick', hint: 'Acts at once, takes charge, no hesitation' },
  { key: 'complete', label: 'Complete', hint: 'Sees it through to the end, others helped' },
] as const;

export type SrtKey = (typeof SRT_HEADINGS)[number]['key'];

export interface SrtReview {
  readonly answered: number;
  readonly marks: Readonly<Record<SrtKey, number>>;
  readonly wentWell: string | null;
  readonly focusOn: string | null;
  readonly at: string;
}

const mark = z.number().int().min(1).max(5);
const stored = z.object({
  verdict: z.object({
    rubric: z.literal('srt-1'),
    answered: z.number().int().min(0).max(SITUATIONS_MAX),
    marks: z.object({ practical: mark, quick: mark, complete: mark }).strict(),
  }),
  went_well: z.string().nullable(),
  focus_on: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

/** A stored `evaluations` row (evaluator 'human') as an SRT review; null for anything else. */
export function readSrtReview(row: unknown): SrtReview | null {
  const r = stored.safeParse(row);
  if (!r.success) return null;
  const { verdict, went_well, focus_on, created_at, updated_at } = r.data;
  return { answered: verdict.answered, marks: verdict.marks, wentWell: went_well, focusOn: focus_on, at: updated_at ?? created_at };
}

export interface SrtDraft {
  /** As typed: checked here, a whole number 0-60. */
  readonly answered: string;
  readonly marks: Partial<Record<SrtKey, number>>;
  readonly wentWell: string;
  readonly focusOn: string;
}

/** What stops a draft being saved, in the order the form shows it. Empty when it can be. */
export function srtDraftProblems(d: SrtDraft): string[] {
  const out: string[] = [];
  const n = d.answered.trim() === '' ? NaN : Number(d.answered);
  if (!Number.isInteger(n) || n < 0 || n > SITUATIONS_MAX) out.push(`Count the situations answered: 0 to ${SITUATIONS_MAX}.`);
  for (const h of SRT_HEADINGS) if (!d.marks[h.key]) out.push(`Mark ${h.label}.`);
  if (!d.wentWell.trim() && !d.focusOn.trim()) out.push('Write what went well or what to work on.');
  else if (d.wentWell.trim().length > COMMENT_MAX || d.focusOn.trim().length > COMMENT_MAX) out.push(`Keep each note to ${COMMENT_MAX} characters.`);
  return out;
}
