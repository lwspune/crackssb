import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadPicture, PICTURE_ID } from '@/lib/ppdt/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { PpdtScreen } from '@/ui/ppdt/PpdtScreen.tsx';
import { loadLiveSession } from '@/ui/runner/supabase-api.ts';

/** A PPDT attempt at one picture (D33). Outside the (app) group: a test renders with no shell (UI.md §4). */

export const metadata: Metadata = { title: 'PPDT' };

type Params = Promise<{ id: string }>;

/** The candidate's live PPDT attempt, if any, and the server's clock at this moment. */
async function arrival(client: Awaited<ReturnType<typeof createSupabaseServer>>) {
  const initial = await loadLiveSession(client, 'ppdt');
  return { initial, serverNowMs: Date.now() };
}

export default async function PicturePage({ params }: { params: Params }) {
  const { id } = await params;
  await requireViewerAt(`/picture/${id}`);
  if (!PICTURE_ID.test(id)) notFound();
  const client = await createSupabaseServer();
  const picture = await loadPicture(client, id);
  if (!picture) notFound();
  const { initial, serverNowMs } = await arrival(client);
  return <PpdtScreen picture={picture} initial={initial} serverNowMs={serverNowMs} />;
}
