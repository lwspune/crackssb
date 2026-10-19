import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionRow, SoloPerson } from '../../admin/candidates.ts';
import { summarise } from '../../oir/mock-result.ts';
import type { Attempt, ResultRow } from '../../oir/mock-result.ts';
import { allPages } from '../supabase/pages.ts';

/**
 * Reads for the owner's view of candidates with no academy (D42), as the
 * signed-in user: row level security lets the superadmin read every profile
 * and session (can_view_person) and an academy's staff only their own, so
 * staff get none of these. Server-only.
 */

/** Every candidate with no academy. */
export async function loadSoloCandidates(client: SupabaseClient): Promise<SoloPerson[]> {
  const rows = await allPages<{ id: string; full_name: string; email: string | null; joined_via: 'staff' | 'google'; created_at: string; deactivated_at: string | null }>(
    'the candidates',
    (from, to) =>
      client
        .from('profiles')
        .select('id, full_name, email, joined_via, created_at, deactivated_at')
        .eq('role', 'candidate')
        .is('org_id', null)
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to),
  );
  return rows.map((r) => ({ id: r.id, fullName: r.full_name, email: r.email, joinedVia: r.joined_via, joinedAt: r.created_at, deactivated: r.deactivated_at !== null }));
}

/** Every attempt by a candidate with no academy: whose, which test, when. */
export async function loadSoloSessions(client: SupabaseClient): Promise<SessionRow[]> {
  const rows = await allPages<{ candidate_id: string; assessment_type: string; started_at: string }>('their attempts', (from, to) =>
    client
      .from('sessions')
      .select('candidate_id, assessment_type, started_at, profiles!inner(org_id, role)')
      .is('profiles.org_id', null)
      .eq('profiles.role', 'candidate')
      .order('started_at')
      .order('id')
      .range(from, to),
  );
  return rows.map((r) => ({ candidateId: r.candidate_id, type: r.assessment_type, startedAt: r.started_at }));
}

/**
 * One candidate's mock attempts, newest first, each scored once it is over.
 * my_test_attempts (0010) is the caller's own only, and keys are never
 * readable, so each finished attempt is scored from test_result, which lets
 * the superadmin read any attempt that is over.
 */
export async function loadMockAttemptsOf(client: SupabaseClient, candidateId: string): Promise<Attempt[]> {
  const { data, error } = await client
    .from('sessions')
    .select('id, test_id, started_at, ended_at, expires_at, status')
    .eq('candidate_id', candidateId)
    .not('test_id', 'is', null)
    .eq('assessment_type', 'oir')
    .order('started_at', { ascending: false });
  if (error) {
    console.error('loading a candidate’s mocks failed', { code: error.code });
    throw new Error('Could not load their mocks');
  }
  const now = Date.now();
  return Promise.all(
    data.map(async (s): Promise<Attempt> => {
      const over = s.status === 'ended' || Date.parse(s.expires_at) + 2000 < now;
      const base = { sessionId: s.id, testId: s.test_id as string, startedAt: s.started_at, endedAt: s.status === 'ended' ? s.ended_at : over ? s.expires_at : null, over };
      if (!over) return { ...base, answered: 0, correct: null };
      const { data: rows, error: resultError } = await client.rpc('test_result', { p_session_id: s.id });
      if (resultError) {
        console.error('scoring a candidate’s mock failed', { code: resultError.code });
        throw new Error('Could not load their mocks');
      }
      const summary = summarise(rows as ResultRow[]);
      return { ...base, answered: summary.answered, correct: summary.correct };
    }),
  );
}
