import type { SupabaseClient } from '@supabase/supabase-js';
import type { OirPayload } from '../../items/bank.ts';
import type { PracticeItem } from '../../ui/practice/PracticeRunner.tsx';
import type { MockMeta } from '../../ui/mock/BookletRunner.tsx';
import { toPracticeItem } from '../practice/data.ts';
import type { Attempt, ResultRow } from '../../oir/mock-result.ts';

/**
 * Reads for OIR mocks (D32), as the signed-in user. Mocks and their question
 * order are readable by anyone signed in, as are the questions (0005, 0009);
 * keys never are — only test_result returns them, once an attempt is over.
 *
 * Server-only: called from Server Components with the user's client.
 */

export const MOCK_ID = /^oir-mock-\d{2}$/;

/** Every OIR mock, in order. */
export async function loadMocks(client: SupabaseClient): Promise<MockMeta[]> {
  const { data, error } = await client.from('tests').select('id, title, item_count, time_limit_seconds').like('id', 'oir-mock-%').order('id');
  if (error) {
    console.error('loading the mocks failed', { code: error.code });
    throw new Error('Could not load the mocks');
  }
  return data.map((t) => ({ id: t.id, title: t.title, itemCount: t.item_count, timeLimitSeconds: t.time_limit_seconds }));
}

/** One mock and its questions in booklet order, keyless — or null if there is no such mock. */
export async function loadMock(client: SupabaseClient, id: string): Promise<{ mock: MockMeta; items: PracticeItem[] } | null> {
  const { data: t, error } = await client.from('tests').select('id, title, item_count, time_limit_seconds').eq('id', id).maybeSingle();
  if (error) {
    console.error('loading a mock failed', { code: error.code });
    throw new Error('Could not load the mock');
  }
  if (!t) return null;

  const { data: order, error: orderError } = await client.from('test_items').select('ordinal, item_id').eq('test_id', id).order('ordinal');
  if (orderError) {
    console.error('loading a mock’s questions failed', { code: orderError.code });
    throw new Error('Could not load the mock');
  }
  const { data: rows, error: itemsError } = await client.from('items').select('id, payload').in('id', order.map((o) => o.item_id));
  if (itemsError) {
    console.error('loading a mock’s questions failed', { code: itemsError.code });
    throw new Error('Could not load the mock');
  }
  const byId = new Map((rows as { id: string; payload: Omit<OirPayload, 'key'> }[]).map((r) => [r.id, r]));
  const items = order.map((o) => byId.get(o.item_id));
  // A question the reader cannot see would leave a hole in the booklet; the database keeps a mock's questions active (0009).
  if (items.some((i) => !i) || items.length !== t.item_count) throw new Error(`Mock ${id} is incomplete`);

  return {
    mock: { id: t.id, title: t.title, itemCount: t.item_count, timeLimitSeconds: t.time_limit_seconds },
    items: (items as { id: string; payload: Omit<OirPayload, 'key'> }[]).map(toPracticeItem),
  };
}

/** The viewer's own mock attempts, newest first, scored only once over (my_test_attempts, 0010). */
export async function loadAttempts(client: SupabaseClient): Promise<Attempt[]> {
  const { data, error } = await client.rpc('my_test_attempts');
  if (error) {
    console.error('loading mock attempts failed', { code: error.code });
    throw new Error('Could not load your attempts');
  }
  return (data as { session_id: string; test_id: string; started_at: string; ended_at: string | null; over: boolean; answered: number; correct: number | null }[]).map((a) => ({
    sessionId: a.session_id,
    testId: a.test_id,
    startedAt: a.started_at,
    endedAt: a.ended_at,
    over: a.over,
    answered: a.answered,
    correct: a.correct,
  }));
}

export type LoadedResult =
  | { readonly kind: 'missing' }
  | { readonly kind: 'running'; readonly testId: string }
  | {
      readonly kind: 'over';
      readonly mock: MockMeta;
      readonly items: readonly PracticeItem[];
      readonly rows: readonly ResultRow[];
      /** Seconds from start to submission (or the deadline). */
      readonly secondsUsed: number;
    };

/**
 * One attempt's result. Missing when there is no such attempt or the viewer
 * may not see it (row level security and test_result decide); running while
 * its clock still runs — test_result refuses keys until then.
 */
export async function loadResult(client: SupabaseClient, sessionId: string): Promise<LoadedResult> {
  const { data: s } = await client.from('sessions').select('test_id, started_at, ended_at, expires_at, status').eq('id', sessionId).maybeSingle();
  if (!s?.test_id) return { kind: 'missing' };

  const { data: rows, error } = await client.rpc('test_result', { p_session_id: sessionId });
  if (error) {
    if (/session_live/.test(error.message)) return { kind: 'running', testId: s.test_id };
    if (/not_your_session/.test(error.message)) return { kind: 'missing' };
    console.error('loading a mock result failed', { code: error.code });
    throw new Error('Could not load the result');
  }
  const found = await loadMock(client, s.test_id);
  if (!found) return { kind: 'missing' };
  const end = Date.parse(s.status === 'ended' && s.ended_at ? s.ended_at : s.expires_at);
  const secondsUsed = Math.max(0, Math.min(found.mock.timeLimitSeconds, Math.round((end - Date.parse(s.started_at)) / 1000)));
  return { kind: 'over', mock: found.mock, items: found.items, rows: rows as ResultRow[], secondsUsed };
}
