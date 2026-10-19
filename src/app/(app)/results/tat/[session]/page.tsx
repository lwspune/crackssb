import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { sheetPhotos } from '@/db/admin/uploads.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { loadSet, loadTatResult, loadTatReview } from '@/lib/tat/data.ts';
import { pictureById } from '@/tat/pictures.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { SendForReviewClient } from '@/ui/ppdt/ReviewClient.tsx';
import { SheetPhotos } from '@/ui/sheet/SheetPhotos.tsx';
import { SheetUploadClient } from '@/ui/sheet/SheetUploadClient.tsx';
import { TatResult } from '@/ui/tat/TatResult.tsx';
import { TatReviewMarks } from '@/ui/tat/TatReviewMarks.tsx';

export const metadata: Metadata = { title: 'TAT result' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One TAT attempt (D36, D38): every slide and what is in it, the sheet's photos, sending for review, the marks. */
export default async function TatResultPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const viewer = await requireViewerAt(`/results/tat/${session}`);
  if (!UUID.test(session)) notFound();

  const client = await createSupabaseServer();
  const result = await loadTatResult(client, session);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'running') redirect(`/tat/${result.testId}`);
  const set = await loadSet(client, result.testId);
  if (!set) notFound();
  const pictures = set.slides.flatMap((s) => pictureById(s.id) ?? []);
  // Signed only after row level security let the viewer read the rows (src/db/admin/).
  const [photos, review] = await Promise.all([sheetPhotos(client, createSupabaseAdmin(), session), result.submittedAt ? loadTatReview(client, session) : null]);
  const own = result.candidateId === viewer.id;
  // Adding to it stops once it is sent for review (0014, 0017).
  const open = own && !result.submittedAt;

  return (
    <Page>
      <Link href="/results" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Results</Link>
      <PageHeader title={set.title} lede="Every slide, what is in it, and your sheet beside it." />
      <TatResult
        set={set}
        pictures={pictures}
        paperCode={result.paperCode}
        review={review}
        sheet={open ? <SheetUploadClient sessionId={session} photos={photos} maxPages={8} /> : <SheetPhotos photos={photos} />}
        footer={
          review ? (
            <TatReviewMarks review={review} />
          ) : (
            own && <SendForReviewClient sessionId={session} ready={photos.length > 0} paper hasNarration={false} submittedAt={result.submittedAt} />
          )
        }
      />
    </Page>
  );
}
