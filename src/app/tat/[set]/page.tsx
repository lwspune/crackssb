import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { SET_ID, loadSet } from '@/lib/tat/data.ts';
import { TatScreen } from '@/ui/tat/TatScreen.tsx';
import { loadLiveSession } from '@/ui/runner/supabase-api.ts';

/** A TAT attempt at one set (D36). Outside the (app) group: a test renders with no shell (UI.md §4). */

export const metadata: Metadata = { title: 'TAT' };

/** The candidate's live TAT attempt, if any, and the server's clock at this moment. */
async function arrival(client: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const initial = await loadLiveSession(client, 'tat');
  return { initial, serverNowMs: Date.now() };
}

export default async function TatSetPage({ params }: { params: Promise<{ set: string }> }) {
  const { set: id } = await params;
  await requireViewerAt(`/tat/${id}`);
  if (!SET_ID.test(id)) notFound();
  const client = await createSupabaseServer();
  const set = await loadSet(client, id);
  if (!set || set.slides.length !== 12) notFound();
  const { initial, serverNowMs } = await arrival(client);
  return <TatScreen set={set} initial={initial} serverNowMs={serverNowMs} />;
}
