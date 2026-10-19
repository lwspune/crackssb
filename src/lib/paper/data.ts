import type { SupabaseClient } from '@supabase/supabase-js';
import type { PpdtAttempt } from '../../ppdt/attempts.ts';

/**
 * Reads for SRT (D39) and SDT (D40), as the signed-in user. An SRT set is a
 * `tests` row any signed-in user may read (0009), its situations `items` rows;
 * attempts are sessions under row level security, filtered to the viewer —
 * staff would otherwise get their academy's. A review is the attempt's one
 * human `evaluations` row, read by the rubric's own parser.
 *
 * Server-only: called from Server Components with the user's client.
 */

export type PaperTest = 'srt' | 'sdt';

export const SRT_SET_ID = /^srt-set-\d{2}$/;

export interface SrtSetMeta {
  readonly id: string;
  readonly title: string;
  /** What the candidate reads, in order. */
  readonly situations: readonly string[];
}

type SetRow = { id: string; title: string; test_items: { ordinal: number; items: { payload: { text: string } } }[] };
const toMeta = (r: SetRow): SrtSetMeta => ({
  id: r.id,
  title: r.title,
  situations: [...r.test_items].sort((a, b) => a.ordinal - b.ordinal).map((t) => t.items.payload.text),
});
const SELECT = 'id, title, test_items(ordinal, items(payload))';

export async function loadSrtSets(client: SupabaseClient): Promise<SrtSetMeta[]> {
  const { data, error } = await client.from('tests').select(SELECT).eq('assessment_type', 'srt').order('id');
  if (error) {
    console.error('loading the SRT sets failed', { code: error.code });
    throw new Error('Could not load the sets');
  }
  return (data as unknown as SetRow[]).map(toMeta);
}

export async function loadSrtSet(client: SupabaseClient, id: string): Promise<SrtSetMeta | null> {
  const { data, error } = await client.from('tests').select(SELECT).eq('assessment_type', 'srt').eq('id', id).maybeSingle();
  if (error) {
    console.error('loading an SRT set failed', { code: error.code });
    throw new Error('Could not load the set');
  }
  return data ? toMeta(data as unknown as SetRow) : null;
}

/** The viewer's attempts at a test, newest first; `itemId` is the set (SRT) or '' (SDT), so PPDT's standings read them. */
export async function loadPaperAttempts(client: SupabaseClient, viewerId: string, test: PaperTest): Promise<PpdtAttempt[]> {
  const { data, error } = await client
    .from('sessions')
    .select('id, test_id, started_at, expires_at, status, input_mode')
    .eq('assessment_type', test)
    .eq('candidate_id', viewerId)
    .order('started_at', { ascending: false });
  if (error) {
    console.error('loading attempts failed', { test, code: error.code });
    throw new Error('Could not load your attempts');
  }
  const now = Date.now();
  return data.map((s) => ({
    sessionId: s.id,
    itemId: s.test_id ?? '',
    startedAt: s.started_at,
    over: s.status === 'ended' || Date.parse(s.expires_at) + 2000 < now,
    input: s.input_mode === 'paper' ? 'paper' : 'typed',
  }));
}

export type LoadedPaperResult =
  | { readonly kind: 'missing' }
  | { readonly kind: 'running'; readonly testId: string | null }
  | { readonly kind: 'over'; readonly testId: string | null; readonly candidateId: string; readonly paperCode: string | null; readonly submittedAt: string | null };

/** One attempt at SRT or SDT: missing when there is none of that test the viewer may see, running while its clock runs. */
export async function loadPaperResult(client: SupabaseClient, sessionId: string, test: PaperTest): Promise<LoadedPaperResult> {
  const { data: s } = await client
    .from('sessions')
    .select('assessment_type, test_id, candidate_id, status, expires_at, paper_code, submitted_for_review_at')
    .eq('id', sessionId)
    .maybeSingle();
  if (!s || s.assessment_type !== test) return { kind: 'missing' };
  if (!(s.status === 'ended' || Date.parse(s.expires_at) + 2000 < Date.now())) return { kind: 'running', testId: s.test_id };
  return { kind: 'over', testId: s.test_id, candidateId: s.candidate_id, paperCode: s.paper_code, submittedAt: s.submitted_for_review_at };
}

/** The attempt's human review row, if the viewer may read one; the caller reads it with its rubric's parser. */
export async function loadReviewRow(client: SupabaseClient, sessionId: string): Promise<unknown> {
  const { data, error } = await client
    .from('evaluations')
    .select('verdict, went_well, focus_on, created_at, updated_at')
    .eq('session_id', sessionId)
    .eq('evaluator', 'human')
    .is('response_id', null)
    .maybeSingle();
  if (error) console.error('loading a review failed', { code: error.code });
  return data;
}
