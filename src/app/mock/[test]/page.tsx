import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadMock, MOCK_ID } from '@/lib/mocks/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { MockScreen } from '@/ui/mock/MockScreen.tsx';
import { loadLiveSession } from '@/ui/runner/supabase-api.ts';

/** An OIR mock (D32). Outside the (app) group: a test renders with no shell (UI.md §4). */

type Params = Promise<{ test: string }>;

/** The candidate's live OIR attempt, if any, and the server's clock at this moment. */
async function arrival(client: Awaited<ReturnType<typeof createSupabaseServer>>) {
  // An attempt already running (this tab reloaded, another phone) resumes where the server's clock is.
  const initial = await loadLiveSession(client, 'oir');
  return { initial, serverNowMs: Date.now() };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { test } = await params;
  const n = MOCK_ID.test(test) ? Number(test.slice(-2)) : null;
  return { title: n ? `OIR Mock ${n}` : 'OIR mock' };
}

export default async function MockPage({ params }: { params: Params }) {
  const { test } = await params;
  await requireViewerAt(`/mock/${test}`);
  if (!MOCK_ID.test(test)) notFound();
  const client = await createSupabaseServer();
  const found = await loadMock(client, test);
  if (!found) notFound();
  const { initial, serverNowMs } = await arrival(client);
  return <MockScreen mock={found.mock} items={found.items} initial={initial} serverNowMs={serverNowMs} />;
}
