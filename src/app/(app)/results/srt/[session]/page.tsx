import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { sheetPhotos } from '@/db/admin/uploads.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadPaperResult, loadReviewRow, loadSrtSet } from '@/lib/paper/data.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { SRT_HEADINGS, readSrtReview } from '@/srt/rubric.ts';
import { PaperResult } from '@/ui/paper/PaperResult.tsx';
import { PaperReviewMarks } from '@/ui/paper/PaperReviewMarks.tsx';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { SendForReviewClient } from '@/ui/ppdt/ReviewClient.tsx';
import { SheetPhotos } from '@/ui/sheet/SheetPhotos.tsx';
import { SheetUploadClient } from '@/ui/sheet/SheetUploadClient.tsx';

export const metadata: Metadata = { title: 'SRT result' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One SRT attempt (D39): the sheet's photos, the sixty situations to check them against, sending for review, the marks. */
export default async function SrtResultPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const viewer = await requireViewerAt(`/results/srt/${session}`);
  if (!UUID.test(session)) notFound();

  const client = await createSupabaseServer();
  const result = await loadPaperResult(client, session, 'srt');
  if (result.kind === 'missing') notFound();
  if (result.kind === 'running') redirect(`/srt/${result.testId}`);
  const set = result.testId ? await loadSrtSet(client, result.testId) : null;
  if (!set) notFound();
  // Signed only after row level security let the viewer read the rows (src/db/admin/).
  const [photos, review] = await Promise.all([sheetPhotos(client, createSupabaseAdmin(), session), result.submittedAt ? loadReviewRow(client, session).then(readSrtReview) : null]);
  const own = result.candidateId === viewer.id;
  // Adding to it stops once it is sent for review (0014, 0018).
  const open = own && !result.submittedAt;

  return (
    <Page>
      <Link href="/results" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Results</Link>
      <PageHeader title={set.title} lede="Photograph your sheet, then check it against the situations." />
      <PaperResult
        heading="The situations"
        items={set.situations}
        paperCode={result.paperCode}
        sheet={open ? <SheetUploadClient sessionId={session} photos={photos} /> : <SheetPhotos photos={photos} />}
        footer={
          review ? (
            <PaperReviewMarks
              summary={`${review.answered} of ${set.situations.length} situations answered.`}
              rows={SRT_HEADINGS.map((h) => ({ label: h.label, mark: review.marks[h.key] }))}
              wentWell={review.wentWell}
              focusOn={review.focusOn}
              at={review.at}
            />
          ) : (
            own && <SendForReviewClient sessionId={session} ready={photos.length > 0} paper hasNarration={false} submittedAt={result.submittedAt} />
          )
        }
      />
    </Page>
  );
}
