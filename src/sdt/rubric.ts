import { z } from 'zod';
import { COMMENT_MAX } from '../ppdt/rubric.ts';
import { PROMPTS } from './prompts.ts';

/**
 * The SDT review rubric (D40). A mentor marks each of the five paragraphs a
 * whole mark 1 to 5, or none when it was not written (at least one marked),
 * then honest and consistent across the five; then went well / work on. No
 * total and no band (D15). review_sdt (0018) enforces the same.
 */

export { COMMENT_MAX };

export const SDT_HEADINGS = [
  { key: 'honest', label: 'Honest', hint: 'Real strengths and real weaknesses, in the candidate’s own words' },
  { key: 'consistent', label: 'Consistent', hint: 'The five paragraphs describe the same person' },
] as const;

export type SdtKey = (typeof SDT_HEADINGS)[number]['key'];

export interface SdtReview {
  readonly paragraphs: readonly (number | null)[];
  readonly marks: Readonly<Record<SdtKey, number>>;
  readonly wentWell: string | null;
  readonly focusOn: string | null;
  readonly at: string;
}

const mark = z.number().int().min(1).max(5);
const stored = z.object({
  verdict: z.object({
    rubric: z.literal('sdt-1'),
    paragraphs: z.array(mark.nullable()).length(PROMPTS.length),
    marks: z.object({ honest: mark, consistent: mark }).strict(),
  }),
  went_well: z.string().nullable(),
  focus_on: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

/** A stored `evaluations` row (evaluator 'human') as an SDT review; null for anything else. */
export function readSdtReview(row: unknown): SdtReview | null {
  const r = stored.safeParse(row);
  if (!r.success) return null;
  const { verdict, went_well, focus_on, created_at, updated_at } = r.data;
  return { paragraphs: verdict.paragraphs, marks: verdict.marks, wentWell: went_well, focusOn: focus_on, at: updated_at ?? created_at };
}

export interface SdtDraft {
  readonly paragraphs: readonly (number | null)[];
  readonly marks: Partial<Record<SdtKey, number>>;
  readonly wentWell: string;
  readonly focusOn: string;
}

/** What stops a draft being saved, in the order the form shows it. Empty when it can be. */
export function sdtDraftProblems(d: SdtDraft): string[] {
  const out: string[] = [];
  if (!d.paragraphs.some((p) => p !== null)) out.push('Mark at least one paragraph.');
  for (const h of SDT_HEADINGS) if (!d.marks[h.key]) out.push(`Mark ${h.label}.`);
  if (!d.wentWell.trim() && !d.focusOn.trim()) out.push('Write what went well or what to work on.');
  else if (d.wentWell.trim().length > COMMENT_MAX || d.focusOn.trim().length > COMMENT_MAX) out.push(`Keep each note to ${COMMENT_MAX} characters.`);
  return out;
}
