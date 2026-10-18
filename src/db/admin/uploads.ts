import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Photos of a paper answer sheet (D22, D34). The private `answer-sheets`
 * bucket has no storage policies (0001): a photo goes up, and is read, only
 * through short-lived signed links the server issues.
 *
 * AUTHORIZATION FIRST, AS THE CALLER: begin_sheet_upload (0013) decides, as the
 * signed-in candidate, whether this page of this attempt may be uploaded, and
 * names the one path it may go to. Reads go through the caller's row level
 * security on `uploads` (can_view_person) before any link is signed.
 *
 * Not "server-only": the database tests import it. Called from Server Actions
 * and Server Components.
 */

export const SHEET_BUCKET = 'answer-sheets';
/** Long enough to look at a result; short enough that a copied link soon dies. */
const READ_SECONDS = 10 * 60;

export type IssuedUpload = { readonly kind: 'ok'; readonly path: string; readonly token: string } | { readonly kind: 'forbidden' } | { readonly kind: 'failed' };

export async function issueSheetUpload(caller: SupabaseClient, service: SupabaseClient, input: { sessionId: string; page: number }): Promise<IssuedUpload> {
  const { data: path, error } = await caller.rpc('begin_sheet_upload', { p_session_id: input.sessionId, p_page: input.page });
  if (error || typeof path !== 'string') return { kind: 'forbidden' };
  const signed = await service.storage.from(SHEET_BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (signed.error || !signed.data) {
    console.error('issueSheetUpload: no upload link', { message: signed.error?.message });
    return { kind: 'failed' };
  }
  return { kind: 'ok', path, token: signed.data.token };
}

/** The attempt's sheet photos the caller may see, page by page, as short-lived links. */
export async function sheetPhotos(caller: SupabaseClient, service: SupabaseClient, sessionId: string): Promise<{ page: number; url: string }[]> {
  const { data: rows, error } = await caller.from('uploads').select('page_no, storage_path').eq('session_id', sessionId).order('page_no');
  if (error || !rows || rows.length === 0) return [];
  const signed = await service.storage.from(SHEET_BUCKET).createSignedUrls(rows.map((r) => r.storage_path), READ_SECONDS);
  if (signed.error || !signed.data) {
    console.error('sheetPhotos: no read links', { message: signed.error?.message });
    return [];
  }
  // A page whose photo never arrived (begun, then abandoned) has no object to sign: leave it out.
  return rows.flatMap((r, i) => (signed.data[i]?.signedUrl ? [{ page: r.page_no, url: signed.data[i].signedUrl }] : []));
}
