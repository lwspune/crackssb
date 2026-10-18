-- 0014_narration_review.sql — 2026-10-18. Narrating a PPDT story and sending
-- the attempt for a mentor's review (D34).
--
--   narrations                  one per attempt: the current take, its type and length.
--   sessions.submitted_for_review_at   set once, by submit_for_review; the attempt is then fixed.
--   begin_narration             as the candidate: their own PPDT, its time over, not
--                               submitted, audio up to a minute — returns a FRESH path.
--   submit_for_review           as the candidate: needs something to review (a story, or a
--                               sheet photo that arrived) and, if a take was begun, that it arrived.
--   begin_sheet_upload          replaced: refuses a submitted attempt, and a retake is a fresh path.
--
-- Why a fresh path each time: a signed upload link stays good for two hours. On a
-- fixed path, with overwrite allowed, a submitted take or photo could be swapped
-- afterwards. Fresh paths and no overwrite (src/db/admin/) mean what a mentor
-- sees is what was submitted. The takes left behind are cleared on submit.
--
-- The bucket is private with no storage policies, as answer-sheets (0001).
-- narration.db.test.ts and uploads.db.test.ts are the gate.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('narrations', 'narrations', false, 5242880, ARRAY['audio/webm', 'audio/mp4', 'audio/ogg'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE public.narrations (
  session_id uuid PRIMARY KEY REFERENCES public.sessions (id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('audio/webm', 'audio/mp4', 'audio/ogg')),
  -- As the browser measured it; the recorder stops itself at the minute.
  duration_ms integer NOT NULL CHECK (duration_ms BETWEEN 1000 AND 65000),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.narrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.narrations FROM anon, authenticated;
GRANT SELECT ON public.narrations TO authenticated;
CREATE POLICY narrations_read ON public.narrations FOR SELECT TO authenticated
  USING ((SELECT private.can_view_session(session_id)));

ALTER TABLE public.sessions ADD COLUMN submitted_for_review_at timestamptz;
CREATE INDEX sessions_for_review ON public.sessions (submitted_for_review_at) WHERE submitted_for_review_at IS NOT NULL;

-- 12 lowercase hex characters: enough that a path cannot be guessed or repeat.
CREATE FUNCTION private.fresh_suffix() RETURNS text
LANGUAGE sql VOLATILE SET search_path = '' AS $$
  SELECT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
$$;
REVOKE ALL ON FUNCTION private.fresh_suffix() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- The candidate's own attempt, still theirs to add to. Shared by the three
-- functions below; not callable by anyone else.
-- ---------------------------------------------------------------------------

CREATE FUNCTION private.my_open_attempt(p_session_id uuid) RETURNS public.sessions
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.sessions;
BEGIN
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id;
  -- Not found and not yours read the same, so the error leaks nothing.
  IF NOT FOUND OR s.candidate_id <> (SELECT auth.uid()) THEN RAISE EXCEPTION 'not_your_session'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = s.candidate_id AND deactivated_at IS NOT NULL) THEN RAISE EXCEPTION 'not_your_session'; END IF;
  IF s.status = 'live' AND now() <= s.expires_at + interval '2 seconds' THEN RAISE EXCEPTION 'not_over'; END IF;
  RETURN s;
END $$;
REVOKE ALL ON FUNCTION private.my_open_attempt(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.begin_sheet_upload(p_session_id uuid, p_page integer)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.sessions;
  v_path text;
BEGIN
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND OR s.candidate_id <> (SELECT auth.uid()) THEN RAISE EXCEPTION 'not_your_session'; END IF;
  IF s.input_mode <> 'paper' THEN RAISE EXCEPTION 'not_paper'; END IF;
  s := private.my_open_attempt(p_session_id);
  IF s.submitted_for_review_at IS NOT NULL THEN RAISE EXCEPTION 'submitted'; END IF;
  IF p_page IS NULL OR p_page < 1 OR p_page > 4 THEN RAISE EXCEPTION 'bad_page'; END IF;

  v_path := s.candidate_id::text || '/' || s.id::text || '/page-' || p_page::text || '-' || private.fresh_suffix() || '.jpg';
  INSERT INTO public.uploads (session_id, storage_path, page_no)
  VALUES (s.id, v_path, p_page)
  ON CONFLICT (session_id, page_no) DO UPDATE
    SET storage_path = EXCLUDED.storage_path, created_at = now(), ocr_status = 'pending', ocr_text = NULL,
        ocr_confidence = NULL, ocr_provider = NULL, ocr_cost_usd = NULL, candidate_corrected = false;
  RETURN v_path;
END $$;

CREATE FUNCTION public.begin_narration(p_session_id uuid, p_mime text, p_duration_ms integer)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.sessions;
  v_path text;
BEGIN
  s := private.my_open_attempt(p_session_id);
  IF s.assessment_type <> 'ppdt' THEN RAISE EXCEPTION 'not_ppdt'; END IF;
  IF s.submitted_for_review_at IS NOT NULL THEN RAISE EXCEPTION 'submitted'; END IF;
  IF p_mime IS NULL OR p_mime NOT IN ('audio/webm', 'audio/mp4', 'audio/ogg')
     OR p_duration_ms IS NULL OR p_duration_ms NOT BETWEEN 1000 AND 65000 THEN
    RAISE EXCEPTION 'bad_audio';
  END IF;

  v_path := s.candidate_id::text || '/' || s.id::text || '/narration-' || private.fresh_suffix();
  INSERT INTO public.narrations (session_id, storage_path, mime_type, duration_ms)
  VALUES (s.id, v_path, p_mime, p_duration_ms)
  ON CONFLICT (session_id) DO UPDATE
    SET storage_path = EXCLUDED.storage_path, mime_type = EXCLUDED.mime_type,
        duration_ms = EXCLUDED.duration_ms, recorded_at = now();
  RETURN v_path;
END $$;

CREATE FUNCTION public.submit_for_review(p_session_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.sessions;
  v_at timestamptz;
BEGIN
  s := private.my_open_attempt(p_session_id);
  IF s.assessment_type <> 'ppdt' THEN RAISE EXCEPTION 'not_ppdt'; END IF;
  -- A retry after a dropped reply is harmless.
  IF s.submitted_for_review_at IS NOT NULL THEN RETURN s.submitted_for_review_at; END IF;

  IF s.input_mode = 'paper' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.uploads u JOIN storage.objects o ON o.bucket_id = 'answer-sheets' AND o.name = u.storage_path
      WHERE u.session_id = s.id
    ) THEN RAISE EXCEPTION 'nothing_to_review'; END IF;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.responses r WHERE r.session_id = s.id AND r.key LIKE '%:write' AND btrim(r.response_text) <> ''
  ) THEN RAISE EXCEPTION 'nothing_to_review';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.narrations n WHERE n.session_id = s.id
      AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'narrations' AND o.name = n.storage_path)
  ) THEN RAISE EXCEPTION 'no_recording'; END IF;

  UPDATE public.sessions SET submitted_for_review_at = now() WHERE id = s.id RETURNING submitted_for_review_at INTO v_at;
  RETURN v_at;
END $$;

REVOKE ALL ON FUNCTION public.begin_narration(uuid, text, integer), public.submit_for_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_narration(uuid, text, integer), public.submit_for_review(uuid) TO authenticated;
