import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { sheetPhotos } from '@/db/admin/uploads.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadPpdtResult } from '@/lib/ppdt/data.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { EMPTY_NOTE, parseNote } from '@/ppdt/note.ts';
import { pictureById } from '@/ppdt/pictures.ts';
import { sampleFor } from '@/ppdt/samples.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { PpdtResult } from '@/ui/ppdt/PpdtResult.tsx';
import { SheetPhotos } from '@/ui/sheet/SheetPhotos.tsx';
import { SheetUploadClient } from '@/ui/sheet/SheetUploadClient.tsx';

export const metadata: Metadata = { title: 'PPDT result' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One PPDT attempt (D33): the picture, its ground truth, the candidate's answers, quick checks and a sample. */
export default async function PpdtResultPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const viewer = await requireViewerAt(`/results/ppdt/${session}`);
  if (!UUID.test(session)) notFound();

  const client = await createSupabaseServer();
  const result = await loadPpdtResult(client, session);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'running') redirect(`/picture/${result.itemId}`);
  const picture = pictureById(result.itemId);
  if (!picture) notFound();
  // Signed only after row level security let the viewer read the rows (src/db/admin/uploads.ts).
  const photos = result.paperCode ? await sheetPhotos(client, createSupabaseAdmin(), session) : [];
  const own = result.candidateId === viewer.id;

  return (
    <Page>
      <Link href="/results" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Results</Link>
      <PageHeader title={`PPDT · Picture ${Number(picture.id.slice(-2))}`} lede="The picture, what is in it, and your answers beside it." />
      <PpdtResult
        picture={picture}
        note={result.paperCode ? null : result.note ? parseNote(result.note) : EMPTY_NOTE}
        story={result.story}
        paperCode={result.paperCode}
        sample={sampleFor(picture.id)}
        sheet={own ? <SheetUploadClient sessionId={session} photos={photos} /> : <SheetPhotos photos={photos} />}
      />
    </Page>
  );
}
