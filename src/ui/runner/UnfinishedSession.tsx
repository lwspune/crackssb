import Link from 'next/link';
import type { RunnerInstrument } from '../../runner/modes.ts';
import { createSupabaseServer } from '../../lib/supabase/server.ts';
import { entryById } from '../catalog.ts';
import { ArrowIcon } from '../icons.tsx';

/** The candidate's live session, and whether its clock is still running. */
async function unfinished(): Promise<{ instrument: RunnerInstrument; running: boolean; testId: string | null; itemId: string | null } | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from('sessions')
    .select('assessment_type, expires_at, test_id, item_id')
    .eq('status', 'live')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { instrument: data.assessment_type as RunnerInstrument, running: Date.parse(data.expires_at) > Date.now(), testId: data.test_id, itemId: data.item_id };
}

/**
 * Home's "what is unfinished" (UI.md §5.1). A session the candidate walked
 * away from is still running on the server — the clock never pauses — so
 * Home says so, on whichever device they come back to. Server-rendered; row
 * level security returns only the candidate's own sessions.
 */
export async function UnfinishedSession() {
  const found = await unfinished();
  if (!found) return null;
  const { instrument, running, testId, itemId } = found;
  // An OIR mock (D32) or a PPDT picture (D33) is named and resumed by itself, not the instrument.
  const name = testId ? `OIR Mock ${Number(testId.slice(-2))}` : itemId ? `PPDT picture ${Number(itemId.slice(-2))}` : entryById(instrument)?.short ?? instrument;
  const href = testId ? `/mock/${testId}` : itemId ? `/picture/${itemId}` : `/run/${instrument}`;

  return (
    <Link
      href={href}
      className="lift mb-6 flex items-center justify-between gap-4 rounded-xl border border-brand-accent/40 bg-accent px-5 py-4 text-accent-foreground"
    >
      <span>
        <span className="block font-semibold">
          {running ? `Your ${name} is still running` : `Your ${name} timed out while you were away`}
        </span>
        <span className="block text-sm text-muted-foreground">
          {running ? 'The clock did not stop.' : 'Your answers were kept.'}
        </span>
      </span>
      <ArrowIcon className="shrink-0 text-brand-accent" />
    </Link>
  );
}
