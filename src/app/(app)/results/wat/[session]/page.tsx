import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { sheetPhotos } from '@/db/admin/uploads.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { loadWatResult } from '@/lib/wat/data.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { WAT_WORDS } from '@/ui/runner/content.ts';
import { SheetPhotos } from '@/ui/sheet/SheetPhotos.tsx';
import { SheetUploadClient } from '@/ui/sheet/SheetUploadClient.tsx';
import { WatResult } from '@/ui/wat/WatResult.tsx';

export const metadata: Metadata = { title: 'WAT result' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One WAT attempt (D38): on paper, the sheet's photos and the words to check them against. */
export default async function WatResultPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const viewer = await requireViewerAt(`/results/wat/${session}`);
  if (!UUID.test(session)) notFound();

  const client = await createSupabaseServer();
  const result = await loadWatResult(client, session);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'running') redirect('/run/wat');
  // Signed only after row level security let the viewer read the rows (src/db/admin/).
  const photos = result.paperCode ? await sheetPhotos(client, createSupabaseAdmin(), session) : [];
  const own = result.candidateId === viewer.id;

  return (
    <Page>
      <Link href="/results" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Results</Link>
      <PageHeader title="Word Association Test" lede={result.paperCode ? 'Photograph your sheet, then check it against the words.' : 'Your responses, word by word.'} />
      <WatResult
        words={WAT_WORDS}
        paperCode={result.paperCode}
        responses={result.responses}
        sheet={own ? <SheetUploadClient sessionId={session} photos={photos} /> : <SheetPhotos photos={photos} />}
      />
    </Page>
  );
}
