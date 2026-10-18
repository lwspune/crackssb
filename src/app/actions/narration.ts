'use server';

import { issueNarrationUpload, submitForReview } from '@/db/admin/narration.ts';
import { getViewer } from '@/lib/auth/viewer.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import type { SendResult } from '@/ui/ppdt/SendForReview.tsx';
import type { UploadRequest } from '@/ui/sheet/SheetUpload.tsx';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A signed link for one take of a PPDT narration (D34). The database decides, as the candidate (0014). */
export async function requestNarrationUpload(sessionId: string, mime: string, durationMs: number): Promise<UploadRequest> {
  if (!(await getViewer())) return { kind: 'forbidden' };
  if (!UUID.test(sessionId) || typeof mime !== 'string' || !Number.isInteger(durationMs)) return { kind: 'forbidden' };
  return issueNarrationUpload(await createSupabaseServer(), createSupabaseAdmin(), { sessionId, mime, durationMs });
}

/** Send a PPDT attempt for review; the database fixes it (0014). */
export async function sendForReview(sessionId: string): Promise<SendResult> {
  if (!(await getViewer())) return { kind: 'refused', reason: 'not_your_session' };
  if (!UUID.test(sessionId)) return { kind: 'refused', reason: 'not_your_session' };
  return submitForReview(await createSupabaseServer(), createSupabaseAdmin(), sessionId);
}
