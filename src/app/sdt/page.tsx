import type { Metadata } from 'next';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { sdtBooklet } from '@/ui/paper/booklets.ts';
import { PaperScreen } from '@/ui/paper/PaperScreen.tsx';
import { loadLiveSession } from '@/ui/runner/supabase-api.ts';

/** SDT (D40): five paragraphs in fifteen minutes, on paper. Outside the (app) group: a test renders with no shell (UI.md §4). */

export const metadata: Metadata = { title: 'SDT' };

/** The candidate's live SDT attempt, if any, and the server's clock at this moment. */
async function arrival() {
  const initial = await loadLiveSession(await createSupabaseServer(), 'sdt');
  return { initial, serverNowMs: Date.now() };
}

export default async function SdtPage() {
  await requireViewerAt('/sdt');
  const { initial, serverNowMs } = await arrival();
  return <PaperScreen booklet={sdtBooklet()} initial={initial} serverNowMs={serverNowMs} />;
}
