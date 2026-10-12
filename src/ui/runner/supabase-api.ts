import type { SupabaseClient } from '@supabase/supabase-js';
import type { RunnerInstrument } from '../../runner/modes.ts';
import type { ServerRecord, SessionApi } from './server-store.ts';

/**
 * The real SessionApi: start_session / save_response / end_session (0001),
 * called as the signed-in candidate. Row level security means every read
 * here can only ever see the candidate's own sessions.
 */

/** Every code the session functions raise. Anything else (a fetch that never completed) is 'network'. */
const SERVER_CODES = /\b(not_a_candidate|dob_required|consent_required|unknown_instrument|session_live|not_your_session|session_ended|paper_session|bad_key|too_long|item_not_open|item_closed|item_sealed|not_expired|bad_ending)\b/;

function codeOf(error: { message?: string } | null): string | null {
  if (!error) return null;
  return SERVER_CODES.exec(error.message ?? '')?.[1] ?? 'network';
}

/** The candidate's live session for this test, with what they have saved so far — or null. */
export async function loadLiveSession(client: SupabaseClient, instrument: RunnerInstrument): Promise<ServerRecord | null> {
  const { data: s, error } = await client
    .from('sessions')
    .select('id, input_mode, paper_code, started_at')
    .eq('assessment_type', instrument)
    .eq('status', 'live')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('loading the live session failed', { code: error.code });
    return null;
  }
  if (!s) return null;
  const { data: rows } = await client.from('responses').select('key, response_text').eq('session_id', s.id);
  const saved: Record<string, string> = {};
  for (const r of rows ?? []) saved[r.key] = r.response_text;
  return {
    id: s.id,
    instrument,
    input: s.input_mode === 'paper' ? 'paper' : 'typed',
    code: s.paper_code,
    startedAtMs: Date.parse(s.started_at),
    saved,
    endedBy: null,
  };
}

export function supabaseSessionApi(client: SupabaseClient): SessionApi {
  return {
    async start(instrument, input, code) {
      const { data, error } = await client.rpc('start_session', { p_assessment_type: instrument, p_input_mode: input, p_paper_code: code });
      if (error || !data) return { error: codeOf(error) ?? 'network' };
      return { id: data.id, startedAtMs: Date.parse(data.started_at) };
    },
    async save(id, key, text, final) {
      const { error } = await client.rpc('save_response', { p_session_id: id, p_key: key, p_text: text, p_final: final });
      return { error: codeOf(error) };
    },
    async end(id, endedBy) {
      const { error } = await client.rpc('end_session', { p_session_id: id, p_ended_by: endedBy });
      return { error: codeOf(error) };
    },
    loadLive: (instrument) => loadLiveSession(client, instrument),
  };
}
