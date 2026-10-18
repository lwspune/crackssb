import type { SupabaseClient } from '@supabase/supabase-js';
import type { PpdtAttempt } from '../../ppdt/attempts.ts';
import type { PpdtPictureMeta } from '../../ui/ppdt/PpdtRunner.tsx';

/**
 * Reads for PPDT (D33), as the signed-in user. The pictures are `items` rows
 * any signed-in user may read (0005); attempts are sessions under row level
 * security, filtered to the viewer — staff would otherwise get their academy's.
 *
 * Server-only: called from Server Components with the user's client.
 */

export const PICTURE_ID = /^ppdt-\d{2}$/;

type Row = { id: string; payload: { title: string; image: string; difficulty: PpdtPictureMeta['difficulty'] } };
const toMeta = ({ id, payload }: Row): PpdtPictureMeta => ({ id, title: payload.title, image: payload.image, difficulty: payload.difficulty });

export async function loadPictures(client: SupabaseClient): Promise<PpdtPictureMeta[]> {
  const { data, error } = await client.from('items').select('id, payload').eq('assessment_type', 'ppdt').order('id');
  if (error) {
    console.error('loading the PPDT pictures failed', { code: error.code });
    throw new Error('Could not load the pictures');
  }
  return (data as Row[]).map(toMeta);
}

export async function loadPicture(client: SupabaseClient, id: string): Promise<PpdtPictureMeta | null> {
  const { data, error } = await client.from('items').select('id, payload').eq('assessment_type', 'ppdt').eq('id', id).maybeSingle();
  if (error) {
    console.error('loading a PPDT picture failed', { code: error.code });
    throw new Error('Could not load the picture');
  }
  return data ? toMeta(data as Row) : null;
}

/** The viewer's own PPDT attempts, newest first. */
export async function loadPpdtAttempts(client: SupabaseClient, viewerId: string): Promise<PpdtAttempt[]> {
  const { data, error } = await client
    .from('sessions')
    .select('id, item_id, started_at, expires_at, status, input_mode')
    .eq('assessment_type', 'ppdt')
    .eq('candidate_id', viewerId)
    .order('started_at', { ascending: false });
  if (error) {
    console.error('loading PPDT attempts failed', { code: error.code });
    throw new Error('Could not load your attempts');
  }
  const now = Date.now();
  return data.map((s) => ({
    sessionId: s.id,
    itemId: s.item_id,
    startedAt: s.started_at,
    over: s.status === 'ended' || Date.parse(s.expires_at) + 2000 < now,
    input: s.input_mode === 'paper' ? 'paper' : 'typed',
  }));
}

export type LoadedPpdtResult =
  | { readonly kind: 'missing' }
  | { readonly kind: 'running'; readonly itemId: string }
  | { readonly kind: 'over'; readonly itemId: string; readonly candidateId: string; readonly note: string | null; readonly story: string | null; readonly paperCode: string | null };

/**
 * One PPDT attempt, for its result. Missing when there is no such attempt or
 * row level security hides it; running while its clock runs (the answers are
 * the candidate's own, but the result waits for the end, as at the SSB).
 */
export async function loadPpdtResult(client: SupabaseClient, sessionId: string): Promise<LoadedPpdtResult> {
  const { data: s } = await client.from('sessions').select('item_id, candidate_id, status, expires_at, input_mode, paper_code').eq('id', sessionId).maybeSingle();
  if (!s?.item_id) return { kind: 'missing' };
  const over = s.status === 'ended' || Date.parse(s.expires_at) + 2000 < Date.now();
  if (!over) return { kind: 'running', itemId: s.item_id };
  if (s.input_mode === 'paper') return { kind: 'over', itemId: s.item_id, candidateId: s.candidate_id, note: null, story: null, paperCode: s.paper_code };
  const { data: rows, error } = await client.from('responses').select('key, response_text').eq('session_id', sessionId);
  if (error) {
    console.error('loading a PPDT result failed', { code: error.code });
    throw new Error('Could not load the result');
  }
  const text = (key: string) => rows.find((r) => r.key === key)?.response_text ?? null;
  return { kind: 'over', itemId: s.item_id, candidateId: s.candidate_id, note: text('0:note'), story: text('0:write'), paperCode: null };
}
