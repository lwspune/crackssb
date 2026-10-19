import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { sheetPhotos } from '@/db/admin/uploads.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadPaperResult, loadReviewRow } from '@/lib/paper/data.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { PROMPTS } from '@/sdt/prompts.ts';
import { SDT_HEADINGS, readSdtReview } from '@/sdt/rubric.ts';
import { PaperResult } from '@/ui/paper/PaperResult.tsx';
import { PaperReviewMarks } from '@/ui/paper/PaperReviewMarks.tsx';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { SendForReviewClient } from '@/ui/ppdt/ReviewClient.tsx';
import { SheetPhotos } from '@/ui/sheet/SheetPhotos.tsx';
import { SheetUploadClient } from '@/ui/sheet/SheetUploadClient.tsx';

export const metadata: Metadata = { title: 'SDT result' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One SDT attempt (D40): the sheet's photos, the five prompts, sending for review, each paragraph's mark. */
export default async function SdtResultPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const viewer = await requireViewerAt(`/results/sdt/${session}`);
  if (!UUID.test(session)) notFound();

  const client = await createSupabaseServer();
  const result = await loadPaperResult(client, session, 'sdt');
  if (result.kind === 'missing') notFound();
  if (result.kind === 'running') redirect('/sdt');
  const [photos, review] = await Promise.all([sheetPhotos(client, createSupabaseAdmin(), session), result.submittedAt ? loadReviewRow(client, session).then(readSdtReview) : null]);
  const own = result.candidateId === viewer.id;
  const open = own && !result.submittedAt;

  return (
    <Page>
      <Link href="/results" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Results</Link>
      <PageHeader title="Self Description Test" lede="Photograph your sheet. A mentor reads it beside the prompts." />
      <PaperResult
        heading="The paragraphs"
        items={PROMPTS.map((p) => p.text)}
        paperCode={result.paperCode}
        marks={review?.paragraphs ?? null}
        sheet={open ? <SheetUploadClient sessionId={session} photos={photos} /> : <SheetPhotos photos={photos} />}
        footer={
          review ? (
            <PaperReviewMarks rows={SDT_HEADINGS.map((h) => ({ label: h.label, mark: review.marks[h.key] }))} wentWell={review.wentWell} focusOn={review.focusOn} at={review.at} />
          ) : (
            own && <SendForReviewClient sessionId={session} ready={photos.length > 0} paper hasNarration={false} submittedAt={result.submittedAt} />
          )
        }
      />
    </Page>
  );
}
