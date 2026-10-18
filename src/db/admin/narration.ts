import type { SupabaseClient } from '@supabase/supabase-js';
import { SHEET_BUCKET } from './uploads.ts';

/**
 * Narrating a PPDT story, and sending the attempt for review (D34). The
 * private `narrations` bucket has no storage policies (0014): a take goes up,
 * and is heard, only through short-lived signed links the server issues.
 *
 * AUTHORIZATION FIRST, AS THE CALLER: begin_narration and submit_for_review
 * decide, as the signed-in candidate; reads go through the caller's row level
 * security on `narrations` before any link is signed.
 *
 * Not "server-only": the database tests import it.
 */

export const NARRATION_BUCKET = 'narrations';
const READ_SECONDS = 10 * 60;

export type IssuedTake = { readonly kind: 'ok'; readonly path: string; readonly token: string } | { readonly kind: 'forbidden' } | { readonly kind: 'failed' };

export async function issueNarrationUpload(
  caller: SupabaseClient,
  service: SupabaseClient,
  input: { sessionId: string; mime: string; durationMs: number },
): Promise<IssuedTake> {
  const { data: path, error } = await caller.rpc('begin_narration', { p_session_id: input.sessionId, p_mime: input.mime, p_duration_ms: input.durationMs });
  if (error || typeof path !== 'string') return { kind: 'forbidden' };
  // No upsert: a link is good for two hours, and must not replace a take once sent.
  const signed = await service.storage.from(NARRATION_BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data) {
    console.error('issueNarrationUpload: no upload link', { message: signed.error?.message });
    return { kind: 'failed' };
  }
  return { kind: 'ok', path, token: signed.data.token };
}

export interface Narration {
  readonly url: string;
  readonly mime: string;
  readonly durationMs: number;
  readonly submittedAt: string | null;
}

/** The attempt's current take, if the caller may hear it and it arrived. */
export async function narrationOf(caller: SupabaseClient, service: SupabaseClient, sessionId: string): Promise<Narration | null> {
  const { data: row } = await caller.from('narrations').select('storage_path, mime_type, duration_ms').eq('session_id', sessionId).maybeSingle();
  if (!row) return null;
  const { data: session } = await caller.from('sessions').select('submitted_for_review_at').eq('id', sessionId).single();
  const signed = await service.storage.from(NARRATION_BUCKET).createSignedUrl(row.storage_path, READ_SECONDS);
  // Begun but never sent: there is nothing to hear.
  if (signed.error || !signed.data) return null;
  return { url: signed.data.signedUrl, mime: row.mime_type, durationMs: row.duration_ms, submittedAt: session?.submitted_for_review_at ?? null };
}

export type Submitted = { readonly kind: 'ok'; readonly at: string } | { readonly kind: 'refused'; readonly reason: string };

const REASONS = ['not_your_session', 'not_ppdt', 'not_over', 'nothing_to_review', 'no_recording'] as const;

/**
 * Send the attempt for review; then clear away the takes and photos it no
 * longer points to (each retake left one behind).
 */
export async function submitForReview(caller: SupabaseClient, service: SupabaseClient, sessionId: string): Promise<Submitted> {
  const { data: at, error } = await caller.rpc('submit_for_review', { p_session_id: sessionId });
  if (error || typeof at !== 'string') {
    const reason = REASONS.find((r) => error?.message.includes(r)) ?? 'failed';
    return { kind: 'refused', reason };
  }
  await sweep(caller, service, sessionId);
  return { kind: 'ok', at };
}

async function sweep(caller: SupabaseClient, service: SupabaseClient, sessionId: string): Promise<void> {
  const { data: s } = await caller.from('sessions').select('candidate_id').eq('id', sessionId).single();
  if (!s) return;
  const folder = `${s.candidate_id}/${sessionId}`;
  const [{ data: take }, { data: pages }] = await Promise.all([
    caller.from('narrations').select('storage_path').eq('session_id', sessionId).maybeSingle(),
    caller.from('uploads').select('storage_path').eq('session_id', sessionId),
  ]);
  const kept = new Set([take?.storage_path, ...(pages ?? []).map((p) => p.storage_path)]);
  for (const bucket of [NARRATION_BUCKET, SHEET_BUCKET]) {
    const { data: files, error } = await service.storage.from(bucket).list(folder);
    if (error) {
      console.error('submitForReview: could not list', { bucket, message: error.message });
      continue;
    }
    const stale = (files ?? []).map((f) => `${folder}/${f.name}`).filter((p) => !kept.has(p));
    if (stale.length) await service.storage.from(bucket).remove(stale);
  }
}
