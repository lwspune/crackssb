'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveTatReview } from '../../app/actions/review.ts';
import { createSupabaseBrowser } from '../../lib/supabase/browser.ts';
import type { TatReview } from '../../tat/rubric.ts';
import { createServerStore } from '../runner/server-store.ts';
import type { ServerRecord } from '../runner/server-store.ts';
import { supabaseSessionApi } from '../runner/supabase-api.ts';
import { TatReviewForm } from './TatReviewForm.tsx';
import { TatRunner } from './TatRunner.tsx';
import type { TatSetMeta } from './TatRunner.tsx';

interface Props {
  set: TatSetMeta;
  /** The candidate's live TAT attempt, if any — this set's or another's. */
  initial: ServerRecord | null;
  serverNowMs: number;
}

/** Binds a TAT attempt to the server: its clock, its record, its windows (0017). Over, it goes to the result. */
export function TatClient({ set, initial, serverNowMs }: Props) {
  const router = useRouter();
  const [store] = useState(() => createServerStore(supabaseSessionApi(createSupabaseBrowser()), { initial, serverNowMs }));
  return <TatRunner set={set} store={store} onDone={(record) => router.replace(`/results/tat/${(record as ServerRecord).id}`)} />;
}

/** Binds TatReviewForm to the app: the server action saves, the page refreshes. */
export function TatReviewFormClient({ sessionId, initial }: { sessionId: string; initial: TatReview | null }) {
  const router = useRouter();
  return <TatReviewForm initial={initial} save={(input) => saveTatReview(sessionId, input)} onDone={() => router.refresh()} />;
}
