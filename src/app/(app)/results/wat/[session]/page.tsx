import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { sheetPhotos } from '@/db/admin/uploads.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { loadReviewRow } from '@/lib/paper/data.ts';
import { loadWatResult } from '@/lib/wat/data.ts';
import { PaperReviewMarks } from '@/ui/paper/PaperReviewMarks.tsx';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { SendForReviewClient } from '@/ui/ppdt/ReviewClient.tsx';
import { WAT_WORDS } from '@/ui/runner/content.ts';
import { SheetPhotos } from '@/ui/sheet/SheetPhotos.tsx';
import { SheetUploadClient } from '@/ui/sheet/SheetUploadClient.tsx';
import { WatResult } from '@/ui/wat/WatResult.tsx';
import { WAT_HEADINGS, WORDS_MAX, readWatReview } from '@/wat/rubric.ts';

export const metadata: Metadata = { title: 'WAT result' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One WAT attempt (D38): on paper, the sheet's photos and the words to check them against; sending for review and the marks (D41). */
export default async function WatResultPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const viewer = await requireViewerAt(`/results/wat/${session}`);
  if (!UUID.test(session)) notFound();

  const client = await createSupabaseServer();
  const result = await loadWatResult(client, session);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'running') redirect('/run/wat');
  // Signed only after row level security let the viewer read the rows (src/db/admin/).
  const [photos, review] = await Promise.all([
    result.paperCode ? sheetPhotos(client, createSupabaseAdmin(), session) : [],
    result.submittedAt ? loadReviewRow(client, session).then(readWatReview) : null,
  ]);
  const own = result.candidateId === viewer.id;
  // Adding to it stops once it is sent for review (0014, 0019).
  const open = own && !result.submittedAt;

  return (
    <Page>
      <Link href="/results" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Results</Link>
      <PageHeader title="Word Association Test" lede={result.paperCode ? 'Photograph your sheet, then check it against the words.' : 'Your responses, word by word.'} />
      <WatResult
        words={WAT_WORDS}
        paperCode={result.paperCode}
        responses={result.responses}
        sheet={open ? <SheetUploadClient sessionId={session} photos={photos} /> : <SheetPhotos photos={photos} />}
        footer={
          review ? (
            <PaperReviewMarks
              summary={`${review.answered} of ${WORDS_MAX} words answered.`}
              rows={WAT_HEADINGS.map((h) => ({ label: h.label, mark: review.marks[h.key] }))}
              wentWell={review.wentWell}
              focusOn={review.focusOn}
              at={review.at}
            />
          ) : (
            own && (
              <SendForReviewClient
                sessionId={session}
                ready={result.paperCode ? photos.length > 0 : result.responses !== null && Object.values(result.responses).some((t) => t.trim() !== '')}
                paper={result.paperCode !== null}
                hasNarration={false}
                submittedAt={result.submittedAt}
              />
            )
          )
        }
      />
    </Page>
  );
}
