'use server';

import { z } from 'zod';
import { getViewer } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { COMMENT_MAX } from '@/ppdt/rubric.ts';
import { NOTE_MAX, STORIES } from '@/tat/rubric.ts';
import type { ReviewInput, SaveResult } from '@/ui/review/ReviewForm.tsx';
import type { TatReviewInput } from '@/ui/tat/TatReviewForm.tsx';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mark = z.number().int().min(1).max(5);
const input = z.object({
  story: z.object({ hero: mark, action: mark, outcome: mark, outlook: mark }).strict(),
  narration: z.object({ clarity: mark, confidence: mark, timing: mark }).strict().nullable(),
  wentWell: z.string().max(COMMENT_MAX * 2),
  focusOn: z.string().max(COMMENT_MAX * 2),
});

const REASONS = ['not_staff', 'not_found', 'own_attempt', 'staff_attempt', 'not_submitted', 'bad_marks', 'bad_comment'] as const;

/** Mark a PPDT attempt (D34). The database decides, as the reviewer (review_attempt, 0015). */
export async function saveReview(sessionId: string, raw: ReviewInput): Promise<SaveResult> {
  if (!(await getViewer())) return { kind: 'refused', reason: 'not_staff' };
  const parsed = input.safeParse(raw);
  if (!UUID.test(sessionId) || !parsed.success) return { kind: 'refused', reason: 'bad_marks' };
  const { story, narration, wentWell, focusOn } = parsed.data;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc('review_attempt', {
    p_session_id: sessionId,
    p_story: story,
    p_narration: narration,
    p_went_well: wentWell,
    p_focus_on: focusOn,
  });
  if (!error) return { kind: 'ok' };
  const reason = REASONS.find((r) => error.message.includes(r));
  if (!reason) console.error('saving a review failed', { code: error.code });
  return { kind: 'refused', reason: reason ?? 'failed' };
}

const tatInput = z.object({
  stories: z.array(z.object({ mark: mark.nullable(), note: z.string().max(NOTE_MAX).nullable() }).strict()).length(STORIES),
  wentWell: z.string().max(COMMENT_MAX * 2),
  focusOn: z.string().max(COMMENT_MAX * 2),
});

/** Mark a TAT attempt (D36), story by story. The database decides, as the reviewer (review_tat, 0017). */
export async function saveTatReview(sessionId: string, raw: TatReviewInput): Promise<SaveResult> {
  if (!(await getViewer())) return { kind: 'refused', reason: 'not_staff' };
  const parsed = tatInput.safeParse(raw);
  if (!UUID.test(sessionId) || !parsed.success) return { kind: 'refused', reason: 'bad_marks' };
  const { stories, wentWell, focusOn } = parsed.data;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc('review_tat', { p_session_id: sessionId, p_stories: stories, p_went_well: wentWell, p_focus_on: focusOn });
  if (!error) return { kind: 'ok' };
  const reason = REASONS.find((r) => error.message.includes(r));
  if (!reason) console.error('saving a TAT review failed', { code: error.code });
  return { kind: 'refused', reason: reason ?? 'failed' };
}
