import type { SupabaseClient } from '@supabase/supabase-js';
import type { PpdtAttempt } from '../../ppdt/attempts.ts';
import { readTatReview } from '../../tat/rubric.ts';
import type { TatReview } from '../../tat/rubric.ts';
import type { TatSetMeta } from '../../ui/tat/TatRunner.tsx';

/**
 * Reads for TAT (D36), as the signed-in user. A set is a `tests` row any
 * signed-in user may read (0009), its slides `items` rows; attempts are
 * sessions under row level security, filtered to the viewer — staff would
 * otherwise get their academy's.
 *
 * Server-only: called from Server Components with the user's client.
 */

export const SET_ID = /^tat-set-\d{2}$/;

type SetRow = {
  id: string;
  title: string;
  test_items: { ordinal: number; items: { id: string; payload: { title: string; image: string | null } } }[];
};

const toMeta = (r: SetRow): TatSetMeta => ({
  id: r.id,
  title: r.title,
  slides: [...r.test_items].sort((a, b) => a.ordinal - b.ordinal).map((t) => ({ id: t.items.id, image: t.items.payload.image, title: t.items.payload.title })),
});

const SELECT = 'id, title, test_items(ordinal, items(id, payload))';

export async function loadSets(client: SupabaseClient): Promise<TatSetMeta[]> {
  const { data, error } = await client.from('tests').select(SELECT).eq('assessment_type', 'tat').order('id');
  if (error) {
    console.error('loading the TAT sets failed', { code: error.code });
    throw new Error('Could not load the sets');
  }
  return (data as unknown as SetRow[]).map(toMeta);
}

export async function loadSet(client: SupabaseClient, id: string): Promise<TatSetMeta | null> {
  const { data, error } = await client.from('tests').select(SELECT).eq('assessment_type', 'tat').eq('id', id).maybeSingle();
  if (error) {
    console.error('loading a TAT set failed', { code: error.code });
    throw new Error('Could not load the set');
  }
  return data ? toMeta(data as unknown as SetRow) : null;
}

/** The viewer's TAT attempts, newest first; `itemId` is the set, so PPDT's standings read them unchanged. */
export async function loadTatAttempts(client: SupabaseClient, viewerId: string): Promise<PpdtAttempt[]> {
  const { data, error } = await client
    .from('sessions')
    .select('id, test_id, started_at, expires_at, status, input_mode')
    .eq('assessment_type', 'tat')
    .eq('candidate_id', viewerId)
    .order('started_at', { ascending: false });
  if (error) {
    console.error('loading TAT attempts failed', { code: error.code });
    throw new Error('Could not load your attempts');
  }
  const now = Date.now();
  return data.map((s) => ({
    sessionId: s.id,
    itemId: s.test_id,
    startedAt: s.started_at,
    over: s.status === 'ended' || Date.parse(s.expires_at) + 2000 < now,
    input: s.input_mode === 'paper' ? 'paper' : 'typed',
  }));
}

export type LoadedTatResult =
  | { readonly kind: 'missing' }
  | { readonly kind: 'running'; readonly testId: string }
  | { readonly kind: 'over'; readonly testId: string; readonly candidateId: string; readonly paperCode: string | null; readonly submittedAt: string | null };

/** One TAT attempt, for its result: missing when there is none the viewer may see, running while its clock runs. */
export async function loadTatResult(client: SupabaseClient, sessionId: string): Promise<LoadedTatResult> {
  const { data: s } = await client
    .from('sessions')
    .select('assessment_type, test_id, candidate_id, status, expires_at, paper_code, submitted_for_review_at')
    .eq('id', sessionId)
    .maybeSingle();
  if (!s || s.assessment_type !== 'tat' || !s.test_id) return { kind: 'missing' };
  const over = s.status === 'ended' || Date.parse(s.expires_at) + 2000 < Date.now();
  if (!over) return { kind: 'running', testId: s.test_id };
  return { kind: 'over', testId: s.test_id, candidateId: s.candidate_id, paperCode: s.paper_code, submittedAt: s.submitted_for_review_at };
}

/** The attempt's TAT review, if there is one the viewer may read. */
export async function loadTatReview(client: SupabaseClient, sessionId: string): Promise<TatReview | null> {
  const { data, error } = await client
    .from('evaluations')
    .select('verdict, went_well, focus_on, created_at, updated_at')
    .eq('session_id', sessionId)
    .eq('evaluator', 'human')
    .is('response_id', null)
    .maybeSingle();
  if (error) console.error('loading a TAT review failed', { code: error.code });
  return readTatReview(data);
}
