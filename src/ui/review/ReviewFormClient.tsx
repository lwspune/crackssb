'use client';

import { useRouter } from 'next/navigation';
import { saveReview } from '../../app/actions/review.ts';
import type { Review } from '../../ppdt/rubric.ts';
import { ReviewForm } from './ReviewForm.tsx';

/** Binds ReviewForm to the app: the server action saves, the page refreshes. */
export function ReviewFormClient({ sessionId, hasNarration, initial }: { sessionId: string; hasNarration: boolean; initial: Review | null }) {
  const router = useRouter();
  return <ReviewForm hasNarration={hasNarration} initial={initial} save={(input) => saveReview(sessionId, input)} onDone={() => router.refresh()} />;
}
