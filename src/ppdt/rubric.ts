import { z } from 'zod';

/**
 * The PPDT review rubric (D34). A mentor marks the story on four headings and,
 * when there is one, the narration on three: each a whole mark 1 to 5. Then a
 * word of feedback. review_attempt (0015) enforces the same rule; this is the
 * shape the form, the candidate's marks and the server all read.
 */

export const STORY_HEADINGS = [
  { key: 'hero', label: 'Hero', hint: 'One clear hero, near the candidate’s age' },
  { key: 'action', label: 'Action', hint: 'The hero acts, and others follow' },
  { key: 'outcome', label: 'Outcome', hint: 'The story ends somewhere' },
  { key: 'outlook', label: 'Outlook', hint: 'Positive, practical, believable' },
] as const;

export const NARRATION_HEADINGS = [
  { key: 'clarity', label: 'Clarity', hint: 'Easy to hear and follow' },
  { key: 'confidence', label: 'Confidence', hint: 'A steady voice, no hedging' },
  { key: 'timing', label: 'Within the minute', hint: 'Fits the time without rushing' },
] as const;

export type StoryKey = (typeof STORY_HEADINGS)[number]['key'];
export type NarrationKey = (typeof NARRATION_HEADINGS)[number]['key'];
export type Mark = 1 | 2 | 3 | 4 | 5;
export const MARKS: readonly Mark[] = [1, 2, 3, 4, 5];
export const COMMENT_MAX = 1000;

export interface Review {
  readonly story: Readonly<Record<StoryKey, Mark>>;
  readonly narration: Readonly<Record<NarrationKey, Mark>> | null;
  readonly wentWell: string | null;
  readonly focusOn: string | null;
  /** When it was last marked. */
  readonly at: string;
}

const mark = z.number().int().min(1).max(5);
const stored = z.object({
  verdict: z.object({
    rubric: z.literal('ppdt-1'),
    story: z.object({ hero: mark, action: mark, outcome: mark, outlook: mark }).strict(),
    narration: z.object({ clarity: mark, confidence: mark, timing: mark }).strict().nullable(),
  }),
  went_well: z.string().nullable(),
  focus_on: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

/** A stored `evaluations` row (evaluator 'human') as a review; null for anything else. */
export function readReview(row: unknown): Review | null {
  const r = stored.safeParse(row);
  if (!r.success) return null;
  const { verdict, went_well, focus_on, created_at, updated_at } = r.data;
  return {
    story: verdict.story as Review['story'],
    narration: verdict.narration as Review['narration'],
    wentWell: went_well,
    focusOn: focus_on,
    at: updated_at ?? created_at,
  };
}

export interface Draft {
  readonly story: Partial<Record<StoryKey, number>>;
  readonly narration: Partial<Record<NarrationKey, number>>;
  readonly wentWell: string;
  readonly focusOn: string;
}

/** What stops a draft being saved, in the order the form shows it. Empty when it can be. */
export function draftProblems(d: Draft, hasNarration: boolean): string[] {
  const out: string[] = [];
  for (const h of STORY_HEADINGS) if (!d.story[h.key]) out.push(`Mark ${h.label}.`);
  if (hasNarration) for (const h of NARRATION_HEADINGS) if (!d.narration[h.key]) out.push(`Mark ${h.label}.`);
  if (!d.wentWell.trim() && !d.focusOn.trim()) out.push('Write what went well or what to work on.');
  else if (d.wentWell.trim().length > COMMENT_MAX || d.focusOn.trim().length > COMMENT_MAX) out.push(`Keep each note to ${COMMENT_MAX} characters.`);
  return out;
}
