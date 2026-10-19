'use server';

import { z } from 'zod';
import { getViewer } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { COMMENT_MAX } from '@/ppdt/rubric.ts';
import { PROMPTS } from '@/sdt/prompts.ts';
import { SITUATIONS_MAX } from '@/srt/rubric.ts';
import { NOTE_MAX, STORIES } from '@/tat/rubric.ts';
import type { ReviewInput, SaveResult } from '@/ui/review/ReviewForm.tsx';
import type { SdtReviewInput } from '@/ui/paper/SdtReviewForm.tsx';
import type { SrtReviewInput } from '@/ui/paper/SrtReviewForm.tsx';
import type { TatReviewInput } from '@/ui/tat/TatReviewForm.tsx';
import type { WatReviewInput } from '@/ui/wat/WatReviewForm.tsx';
import { WORDS_MAX } from '@/wat/rubric.ts';

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

const srtInput = z.object({
  answered: z.number().int().min(0).max(SITUATIONS_MAX),
  marks: z.object({ practical: mark, quick: mark, complete: mark }).strict(),
  wentWell: z.string().max(COMMENT_MAX * 2),
  focusOn: z.string().max(COMMENT_MAX * 2),
});

/** Mark an SRT attempt (D39). The database decides, as the reviewer (review_srt, 0018). */
export async function saveSrtReview(sessionId: string, raw: SrtReviewInput): Promise<SaveResult> {
  if (!(await getViewer())) return { kind: 'refused', reason: 'not_staff' };
  const parsed = srtInput.safeParse(raw);
  if (!UUID.test(sessionId) || !parsed.success) return { kind: 'refused', reason: 'bad_marks' };
  const { answered, marks, wentWell, focusOn } = parsed.data;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc('review_srt', { p_session_id: sessionId, p_answered: answered, p_marks: marks, p_went_well: wentWell, p_focus_on: focusOn });
  return refusal(error, 'an SRT');
}

const sdtInput = z.object({
  paragraphs: z.array(mark.nullable()).length(PROMPTS.length),
  marks: z.object({ honest: mark, consistent: mark }).strict(),
  wentWell: z.string().max(COMMENT_MAX * 2),
  focusOn: z.string().max(COMMENT_MAX * 2),
});

/** Mark an SDT attempt (D40). The database decides, as the reviewer (review_sdt, 0018). */
export async function saveSdtReview(sessionId: string, raw: SdtReviewInput): Promise<SaveResult> {
  if (!(await getViewer())) return { kind: 'refused', reason: 'not_staff' };
  const parsed = sdtInput.safeParse(raw);
  if (!UUID.test(sessionId) || !parsed.success) return { kind: 'refused', reason: 'bad_marks' };
  const { paragraphs, marks, wentWell, focusOn } = parsed.data;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc('review_sdt', { p_session_id: sessionId, p_paragraphs: paragraphs, p_marks: marks, p_went_well: wentWell, p_focus_on: focusOn });
  return refusal(error, 'an SDT');
}

const watInput = z.object({
  answered: z.number().int().min(0).max(WORDS_MAX),
  marks: z.object({ positive: mark, practical: mark, own: mark }).strict(),
  wentWell: z.string().max(COMMENT_MAX * 2),
  focusOn: z.string().max(COMMENT_MAX * 2),
});

/** Mark a WAT attempt (D41). The database decides, as the reviewer (review_wat, 0019). */
export async function saveWatReview(sessionId: string, raw: WatReviewInput): Promise<SaveResult> {
  if (!(await getViewer())) return { kind: 'refused', reason: 'not_staff' };
  const parsed = watInput.safeParse(raw);
  if (!UUID.test(sessionId) || !parsed.success) return { kind: 'refused', reason: 'bad_marks' };
  const { answered, marks, wentWell, focusOn } = parsed.data;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc('review_wat', { p_session_id: sessionId, p_answered: answered, p_marks: marks, p_went_well: wentWell, p_focus_on: focusOn });
  return refusal(error, 'a WAT');
}

function refusal(error: { message: string; code?: string } | null, what: string): SaveResult {
  if (!error) return { kind: 'ok' };
  const reason = REASONS.find((r) => error.message.includes(r));
  if (!reason) console.error(`saving ${what} review failed`, { code: error.code });
  return { kind: 'refused', reason: reason ?? 'failed' };
}
