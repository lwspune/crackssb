import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { SRT_SET_ID, loadSrtSet } from '@/lib/paper/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { srtBooklet } from '@/ui/paper/booklets.ts';
import { PaperScreen } from '@/ui/paper/PaperScreen.tsx';
import { loadLiveSession } from '@/ui/runner/supabase-api.ts';

/** An SRT attempt at one set (D39). Outside the (app) group: a test renders with no shell (UI.md §4). */

export const metadata: Metadata = { title: 'SRT' };

/** The candidate's live SRT attempt, if any, and the server's clock at this moment. */
async function arrival(client: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const initial = await loadLiveSession(client, 'srt');
  return { initial, serverNowMs: Date.now() };
}

export default async function SrtSetPage({ params }: { params: Promise<{ set: string }> }) {
  const { set: id } = await params;
  await requireViewerAt(`/srt/${id}`);
  if (!SRT_SET_ID.test(id)) notFound();
  const client = await createSupabaseServer();
  const set = await loadSrtSet(client, id);
  if (!set || set.situations.length !== 60) notFound();
  const { initial, serverNowMs } = await arrival(client);
  return <PaperScreen booklet={srtBooklet(set)} initial={initial} serverNowMs={serverNowMs} />;
}
