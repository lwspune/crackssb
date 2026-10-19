import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Reads for WAT results (D38), as the signed-in user: the viewer's attempts,
 * and one attempt — on paper its code, typed its responses. Row level
 * security decides what is visible.
 *
 * Server-only: called from Server Components with the user's client.
 */

export interface WatAttempt {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly over: boolean;
  readonly input: 'typed' | 'paper';
}

/** The viewer's WAT attempts, newest first. */
export async function loadWatAttempts(client: SupabaseClient, viewerId: string): Promise<WatAttempt[]> {
  const { data, error } = await client
    .from('sessions')
    .select('id, started_at, expires_at, status, input_mode')
    .eq('assessment_type', 'wat')
    .eq('candidate_id', viewerId)
    .order('started_at', { ascending: false });
  if (error) {
    console.error('loading WAT attempts failed', { code: error.code });
    throw new Error('Could not load your attempts');
  }
  const now = Date.now();
  return data.map((s) => ({
    sessionId: s.id,
    startedAt: s.started_at,
    over: s.status === 'ended' || Date.parse(s.expires_at) + 2000 < now,
    input: s.input_mode === 'paper' ? 'paper' : 'typed',
  }));
}

export type LoadedWatResult =
  | { readonly kind: 'missing' }
  | { readonly kind: 'running' }
  | { readonly kind: 'over'; readonly candidateId: string; readonly paperCode: string | null; readonly responses: Record<string, string> | null };

/** One WAT attempt: missing when there is none the viewer may see, running while its clock runs. */
export async function loadWatResult(client: SupabaseClient, sessionId: string): Promise<LoadedWatResult> {
  const { data: s } = await client.from('sessions').select('assessment_type, candidate_id, status, expires_at, input_mode, paper_code').eq('id', sessionId).maybeSingle();
  if (!s || s.assessment_type !== 'wat') return { kind: 'missing' };
  if (!(s.status === 'ended' || Date.parse(s.expires_at) + 2000 < Date.now())) return { kind: 'running' };
  if (s.input_mode === 'paper') return { kind: 'over', candidateId: s.candidate_id, paperCode: s.paper_code, responses: null };
  const { data: rows } = await client.from('responses').select('key, response_text').eq('session_id', sessionId);
  return { kind: 'over', candidateId: s.candidate_id, paperCode: null, responses: Object.fromEntries((rows ?? []).map((r) => [r.key, r.response_text])) };
}
