'use client';

import { useRouter } from 'next/navigation';
import { saveWatReview } from '../../app/actions/review.ts';
import type { WatReview } from '../../wat/rubric.ts';
import { WatReviewForm } from './WatReviewForm.tsx';

/** The WAT review form (D41), bound to its server action; the page refreshes after a save. */
export function WatReviewFormClient({ sessionId, initial }: { sessionId: string; initial: WatReview | null }) {
  const router = useRouter();
  return <WatReviewForm initial={initial} save={(input) => saveWatReview(sessionId, input)} onDone={() => router.refresh()} />;
}
