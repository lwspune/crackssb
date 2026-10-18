-- 0013_sheet_uploads.sql — 2026-10-18. Photographing a paper answer sheet
-- (D22, D34): the write path into `uploads`, which has waited since 0001.
--
-- begin_sheet_upload(session, page), called AS THE CANDIDATE, decides whether
-- that page may be uploaded — their own attempt, on paper, its time over,
-- page 1 to 4 — records it, and returns the one storage path it may go to:
-- <candidate>/<session>/page-<n>.jpg. The server then signs an upload link
-- for exactly that path (src/db/admin/uploads.ts). A second photo of the same
-- page is a retake: the same path, and the page waits to be read again.
--
-- The bucket keeps its 0001 shape: private, no storage policies, signed links
-- only. Reads stay under uploads_read (can_view_session).
-- uploads.db.test.ts is the gate.

CREATE FUNCTION public.begin_sheet_upload(p_session_id uuid, p_page integer)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.sessions;
  v_path text;
BEGIN
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id;
  -- Not found and not yours read the same, so the error leaks nothing.
  IF NOT FOUND OR s.candidate_id <> (SELECT auth.uid()) THEN RAISE EXCEPTION 'not_your_session'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = s.candidate_id AND deactivated_at IS NOT NULL) THEN RAISE EXCEPTION 'not_your_session'; END IF;
  IF s.input_mode <> 'paper' THEN RAISE EXCEPTION 'not_paper'; END IF;
  IF s.status = 'live' AND now() <= s.expires_at + interval '2 seconds' THEN RAISE EXCEPTION 'not_over'; END IF;
  IF p_page IS NULL OR p_page < 1 OR p_page > 4 THEN RAISE EXCEPTION 'bad_page'; END IF;

  v_path := s.candidate_id::text || '/' || s.id::text || '/page-' || p_page::text || '.jpg';
  INSERT INTO public.uploads (session_id, storage_path, page_no)
  VALUES (s.id, v_path, p_page)
  ON CONFLICT (session_id, page_no) DO UPDATE
    SET created_at = now(), ocr_status = 'pending', ocr_text = NULL, ocr_confidence = NULL,
        ocr_provider = NULL, ocr_cost_usd = NULL, candidate_corrected = false;
  RETURN v_path;
END $$;

REVOKE ALL ON FUNCTION public.begin_sheet_upload(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_sheet_upload(uuid, integer) TO authenticated;
