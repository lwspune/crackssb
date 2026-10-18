import type { SupabaseClient } from '@supabase/supabase-js';
import { readReview } from '../../ppdt/rubric.ts';
import type { Review } from '../../ppdt/rubric.ts';
import type { QueueRow } from '../../ui/review/ReviewQueue.tsx';

/**
 * Reads for mentor review (D34), as the signed-in user. The queue goes through
 * review_queue (0015), which keeps staff attempts out; a review is the
 * attempt's one `evaluations` row with evaluator 'human', under row level
 * security (can_view_session) — the candidate reads their own.
 *
 * Server-only: called from Server Components with the user's client.
 */

type QueueDbRow = {
  session_id: string;
  full_name: string;
  item_id: string;
  input_mode: string;
  submitted_at: string;
  has_narration: boolean;
  reviewed_at: string | null;
};

/** The academy's attempts sent for review, and candidates with no academy (only the owner sees those). */
export async function loadQueue(client: SupabaseClient, org: string | null): Promise<QueueRow[]> {
  const { data, error } = await client.rpc('review_queue', { p_org: org });
  if (error) {
    console.error('loading the review queue failed', { code: error.code });
    throw new Error('Could not load the review queue');
  }
  return (data as QueueDbRow[]).map((r) => ({
    sessionId: r.session_id,
    name: r.full_name,
    picture: Number(r.item_id.slice(-2)),
    input: r.input_mode === 'paper' ? 'paper' : 'typed',
    submittedAt: r.submitted_at,
    hasNarration: r.has_narration,
    reviewedAt: r.reviewed_at,
  }));
}

/** The attempt's review, if there is one the viewer may read. */
export async function loadReview(client: SupabaseClient, sessionId: string): Promise<Review | null> {
  const { data, error } = await client
    .from('evaluations')
    .select('verdict, went_well, focus_on, created_at, updated_at')
    .eq('session_id', sessionId)
    .eq('evaluator', 'human')
    .is('response_id', null)
    .maybeSingle();
  if (error) console.error('loading a review failed', { code: error.code });
  return readReview(data);
}

/** Who took an attempt, and whether it was a staff member's own practice (D25). */
export async function loadAttemptOwner(client: SupabaseClient, sessionId: string): Promise<{ name: string; byStaff: boolean } | null> {
  const { data } = await client.from('sessions').select('by_staff, profiles!sessions_candidate_id_fkey(full_name)').eq('id', sessionId).maybeSingle();
  if (!data) return null;
  const person = data.profiles as unknown as { full_name: string } | null;
  return { name: person?.full_name ?? '—', byStaff: data.by_staff };
}
