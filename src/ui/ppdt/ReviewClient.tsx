'use client';

import { useRouter } from 'next/navigation';
import { requestNarrationUpload, sendForReview } from '../../app/actions/narration.ts';
import { createSupabaseBrowser } from '../../lib/supabase/browser.ts';
import { NarrationRecorder } from './NarrationRecorder.tsx';
import { SendForReview } from './SendForReview.tsx';

/** Binds NarrationRecorder to the app: the server action names the path, the signed link takes the take, the page refreshes. */
export function NarrationClient({ sessionId, narration, locked }: { sessionId: string; narration: { url: string; durationMs: number } | null; locked: boolean }) {
  const router = useRouter();
  return (
    <NarrationRecorder
      sessionId={sessionId}
      narration={narration}
      locked={locked}
      request={requestNarrationUpload}
      upload={async (path, token, take, mime) => {
        const { error } = await createSupabaseBrowser().storage.from('narrations').uploadToSignedUrl(path, token, take, { contentType: mime });
        return { error: error ? { message: error.message } : null };
      }}
      onDone={() => router.refresh()}
    />
  );
}

export function SendForReviewClient(props: { sessionId: string; ready: boolean; paper: boolean; hasNarration: boolean; submittedAt: string | null }) {
  const router = useRouter();
  const { sessionId, ...rest } = props;
  return <SendForReview {...rest} submit={() => sendForReview(sessionId)} onDone={() => router.refresh()} />;
}
