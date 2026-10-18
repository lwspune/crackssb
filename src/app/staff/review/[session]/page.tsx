import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { narrationOf } from '@/db/admin/narration.ts';
import { sheetPhotos } from '@/db/admin/uploads.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadPpdtResult } from '@/lib/ppdt/data.ts';
import { loadAttemptOwner, loadReview } from '@/lib/review/data.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { EMPTY_NOTE, parseNote } from '@/ppdt/note.ts';
import { pictureById } from '@/ppdt/pictures.ts';
import { sampleFor } from '@/ppdt/samples.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { PpdtResult } from '@/ui/ppdt/PpdtResult.tsx';
import { NarrationClient } from '@/ui/ppdt/ReviewClient.tsx';
import { ReviewFormClient } from '@/ui/review/ReviewFormClient.tsx';
import { SheetPhotos } from '@/ui/sheet/SheetPhotos.tsx';

export const metadata: Metadata = { title: 'Review' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marking one PPDT attempt (D34): what the candidate saw and did, the narration, and the rubric. */
export default async function ReviewAttemptPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const viewer = await requireViewerAt(`/staff/review/${session}`);
  if (!UUID.test(session)) notFound();

  const client = await createSupabaseServer();
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
