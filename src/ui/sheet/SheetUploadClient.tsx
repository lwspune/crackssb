'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '../../lib/supabase/browser.ts';
import { requestSheetUpload } from '../../app/actions/uploads.ts';
import { SheetUpload } from './SheetUpload.tsx';

/** Binds SheetUpload to the app: the server action names the path, the signed link takes the photo, the page refreshes. */
export function SheetUploadClient({ sessionId, photos, maxPages }: { sessionId: string; photos: readonly { page: number; url: string }[]; maxPages?: number }) {
  const router = useRouter();
  return (
    <SheetUpload
      sessionId={sessionId}
      photos={photos}
      maxPages={maxPages}
      request={requestSheetUpload}
      upload={async (path, token, photo) => {
        const { error } = await createSupabaseBrowser().storage.from('answer-sheets').uploadToSignedUrl(path, token, photo, { contentType: 'image/jpeg' });
        return { error: error ? { message: error.message } : null };
      }}
      onDone={() => router.refresh()}
    />
  );
}
