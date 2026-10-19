'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveSdtReview, saveSrtReview } from '../../app/actions/review.ts';
import { createSupabaseBrowser } from '../../lib/supabase/browser.ts';
import type { SdtReview } from '../../sdt/rubric.ts';
import type { SrtReview } from '../../srt/rubric.ts';
import { createServerStore } from '../runner/server-store.ts';
import type { ServerRecord } from '../runner/server-store.ts';
import { supabaseSessionApi } from '../runner/supabase-api.ts';
import { PaperBookletRunner } from './PaperBookletRunner.tsx';
import type { PaperBooklet } from './PaperBookletRunner.tsx';
import { SdtReviewForm } from './SdtReviewForm.tsx';
import { SrtReviewForm } from './SrtReviewForm.tsx';

/** Binds an SRT or SDT attempt to the server: its clock, its record (0018). Over, it goes to the result. */
export function PaperClient({ booklet, initial, serverNowMs }: { booklet: PaperBooklet; initial: ServerRecord | null; serverNowMs: number }) {
  const router = useRouter();
  const [store] = useState(() => createServerStore(supabaseSessionApi(createSupabaseBrowser()), { initial, serverNowMs }));
  return <PaperBookletRunner booklet={booklet} store={store} onDone={(record) => router.replace(`/results/${booklet.instrument}/${(record as ServerRecord).id}`)} />;
}

/** The review forms, bound to their server actions; the page refreshes after a save. */
export function SrtReviewFormClient({ sessionId, initial }: { sessionId: string; initial: SrtReview | null }) {
  const router = useRouter();
  return <SrtReviewForm initial={initial} save={(input) => saveSrtReview(sessionId, input)} onDone={() => router.refresh()} />;
}

export function SdtReviewFormClient({ sessionId, prompts, initial }: { sessionId: string; prompts: readonly string[]; initial: SdtReview | null }) {
  const router = useRouter();
  return <SdtReviewForm prompts={prompts} initial={initial} save={(input) => saveSdtReview(sessionId, input)} onDone={() => router.refresh()} />;
}
