'use server';

import { issueSheetUpload } from '@/db/admin/uploads.ts';
import { getViewer } from '@/lib/auth/viewer.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import type { UploadRequest } from '@/ui/sheet/SheetUpload.tsx';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A signed link for one page of a paper answer sheet (D34). The database decides, as the candidate (0013). */
export async function requestSheetUpload(sessionId: string, page: number): Promise<UploadRequest> {
  if (!(await getViewer())) return { kind: 'forbidden' };
  if (!UUID.test(sessionId) || !Number.isInteger(page)) return { kind: 'forbidden' };
  return issueSheetUpload(await createSupabaseServer(), createSupabaseAdmin(), { sessionId, page });
}
