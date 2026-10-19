import { z } from 'zod';
import { COMMENT_MAX } from '../ppdt/rubric.ts';

/**
 * The TAT review rubric (D36). A mentor marks each of the twelve stories with
 * a whole mark 1 to 5, or none when it was not written, and a short note;
 * then what went well and what to work on across the set. No total and no
 * band (D15). review_tat (0017) enforces the same rule; this is the shape the
 * form, the candidate's marks and the server all read.
 */

export const STORIES = 12;
export const NOTE_MAX = 300;
export { COMMENT_MAX };

export interface StoryMark {
  readonly mark: number | null;
  readonly note: string | null;
}

export interface TatReview {
  readonly stories: readonly StoryMark[];
  readonly wentWell: string | null;
  readonly focusOn: string | null;
  /** When it was last marked. */
  readonly at: string;
}

const story = z.object({ mark: z.number().int().min(1).max(5).nullable(), note: z.string().nullable() }).strict();
const stored = z.object({
  verdict: z.object({ rubric: z.literal('tat-1'), stories: z.array(story).length(STORIES) }),
  went_well: z.string().nullable(),
  focus_on: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

/** A stored `evaluations` row (evaluator 'human') as a TAT review; null for anything else. */
export function readTatReview(row: unknown): TatReview | null {
  const r = stored.safeParse(row);
  if (!r.success) return null;
  const { verdict, went_well, focus_on, created_at, updated_at } = r.data;
  return { stories: verdict.stories, wentWell: went_well, focusOn: focus_on, at: updated_at ?? created_at };
}

export interface TatDraft {
  readonly stories: readonly StoryMark[];
  readonly wentWell: string;
  readonly focusOn: string;
}

/** What stops a draft being saved, in the order the form shows it. Empty when it can be. */
export function draftProblems(d: TatDraft): string[] {
  const out: string[] = [];
  if (!d.stories.some((s) => s.mark !== null)) out.push('Mark at least one story.');
  d.stories.forEach((s, i) => {
    if ((s.note ?? '').trim().length > NOTE_MAX) out.push(`Keep the note on story ${i + 1} to ${NOTE_MAX} characters.`);
  });
  if (!d.wentWell.trim() && !d.focusOn.trim()) out.push('Write what went well or what to work on.');
  else if (d.wentWell.trim().length > COMMENT_MAX || d.focusOn.trim().length > COMMENT_MAX) out.push(`Keep each note to ${COMMENT_MAX} characters.`);
  return out;
}
