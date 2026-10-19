import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { narrationOf } from '@/db/admin/narration.ts';
import { sheetPhotos } from '@/db/admin/uploads.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadPpdtResult } from '@/lib/ppdt/data.ts';
import { loadAttemptOwner, loadReview } from '@/lib/review/data.ts';
import { loadSet, loadTatResult, loadTatReview } from '@/lib/tat/data.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { EMPTY_NOTE, parseNote } from '@/ppdt/note.ts';
import { pictureById } from '@/ppdt/pictures.ts';
import { sampleFor } from '@/ppdt/samples.ts';
import { pictureById as tatPicture } from '@/tat/pictures.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { PpdtResult } from '@/ui/ppdt/PpdtResult.tsx';
import { NarrationClient } from '@/ui/ppdt/ReviewClient.tsx';
import { ReviewFormClient } from '@/ui/review/ReviewFormClient.tsx';
import { SheetPhotos } from '@/ui/sheet/SheetPhotos.tsx';
import { TatReviewFormClient } from '@/ui/tat/TatClient.tsx';
import { TatResult } from '@/ui/tat/TatResult.tsx';

export const metadata: Metadata = { title: 'Review' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marking one attempt: PPDT (D34) — what the candidate saw and did, the narration, the rubric — or TAT (D36), story by story. */
export default async function ReviewAttemptPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const viewer = await requireViewerAt(`/staff/review/${session}`);
  if (!UUID.test(session)) notFound();

  const client = await createSupabaseServer();
  const tat = await loadTatResult(client, session);
  if (tat.kind !== 'missing') return <TatReview session={session} viewerId={viewer.id} result={tat} />;
  const [result, owner] = await Promise.all([loadPpdtResult(client, session), loadAttemptOwner(client, session)]);
  // Only an attempt sent for review, never a staff member's own (review_attempt refuses the same, 0015).
  if (result.kind !== 'over' || !result.submittedAt || !owner || owner.byStaff || result.candidateId === viewer.id) notFound();
  const picture = pictureById(result.itemId);
  if (!picture) notFound();

  const service = createSupabaseAdmin();
  const [photos, narration, review] = await Promise.all([
    result.paperCode ? sheetPhotos(client, service, session) : [],
    narrationOf(client, service, session),
    loadReview(client, session),
  ]);

  return (
    <Page>
      <Link href="/staff/review" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Review queue</Link>
      <PageHeader title={owner.name} lede={`PPDT · Picture ${Number(picture.id.slice(-2))} · ${result.paperCode ? 'on paper' : 'typed'}`} />
      <PpdtResult
        forStaff
        picture={picture}
        note={result.paperCode ? null : result.note ? parseNote(result.note) : EMPTY_NOTE}
        story={result.story}
        paperCode={result.paperCode}
        sample={sampleFor(picture.id)}
        sheet={<SheetPhotos photos={photos} />}
        review={
          <>
            <NarrationClient sessionId={session} narration={narration} locked />
            <ReviewFormClient sessionId={session} hasNarration={narration !== null} initial={review} />
          </>
        }
      />
    </Page>
  );
}

/** A TAT attempt sent for review (D36): every slide and what is in it, the sheet's photos, a mark per story. */
async function TatReview({ session, viewerId, result }: { session: string; viewerId: string; result: Awaited<ReturnType<typeof loadTatResult>> }) {
  const client = await createSupabaseServer();
  const owner = await loadAttemptOwner(client, session);
  // Only an attempt sent for review, never a staff member's own (review_tat refuses the same, 0017).
  if (result.kind !== 'over' || !result.submittedAt || !owner || owner.byStaff || result.candidateId === viewerId) notFound();
  const set = await loadSet(client, result.testId);
  if (!set) notFound();
  const [photos, review] = await Promise.all([sheetPhotos(client, createSupabaseAdmin(), session), loadTatReview(client, session)]);
  return (
    <Page>
      <Link href="/staff/review" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Review queue</Link>
      <PageHeader title={owner.name} lede={`${set.title} · on paper`} />
      <TatResult
        forStaff
        set={set}
        pictures={set.slides.flatMap((s) => tatPicture(s.id) ?? [])}
        paperCode={result.paperCode}
        sheet={<SheetPhotos photos={photos} />}
        footer={<TatReviewFormClient sessionId={session} initial={review} />}
      />
    </Page>
  );
}
