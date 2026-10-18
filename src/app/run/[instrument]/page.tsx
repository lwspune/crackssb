import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { loadLiveSession } from '@/ui/runner/supabase-api.ts';
import { entryById } from '@/ui/catalog.ts';
import { RUNNABLE } from '@/ui/runner/registry.ts';
import { RunnerScreen } from '@/ui/runner/RunnerScreen.tsx';
import type { RunnerInstrument } from '@/runner/modes.ts';

/** The runner route sits outside the (app) group, so it renders with no shell (UI.md §4). */

/** What the runner arrives with: the live session, if any, and the server's clock at this moment. */
async function arrival(instrument: RunnerInstrument) {
  const initial = await loadLiveSession(await createSupabaseServer(), instrument);
  return { initial, serverNowMs: Date.now() };
}

type Params = Promise<{ instrument: string }>;

function runnable(id: string): id is RunnerInstrument {
  return Object.hasOwn(RUNNABLE, id);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { instrument } = await params;
  return { title: entryById(instrument)?.short ?? 'Test' };
}

export default async function RunPage({ params }: { params: Params }) {
  const { instrument } = await params;
  await requireViewerAt(`/run/${instrument}`);
  if (!runnable(instrument)) notFound();
  // A test chosen elsewhere first (OIR mocks, D32) begins there.
  const start = RUNNABLE[instrument]?.start;
  if (start) redirect(start);
  const title = entryById(instrument)?.name ?? instrument;
  // A session already running (this tab reloaded, or another phone) resumes where the server's clock is.
  const { initial, serverNowMs } = await arrival(instrument);
  return <RunnerScreen instrument={instrument} title={title} initial={initial} serverNowMs={serverNowMs} />;
}
