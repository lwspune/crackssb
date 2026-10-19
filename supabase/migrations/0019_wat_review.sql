-- 0019_wat_review.sql — 2026-10-19. WAT review (D41), on paper (D38).
--
--   submit_for_review   WAT too; typed (hidden, D38), any answer counts (its keys are bare numbers).
--   review_wat          AS THE REVIEWER, the checks of review_srt (0018): how many of the sixty words
--                       were answered (0-60) and positive, practical, own voice, each 1-5.
--   review_queue        PPDT, TAT, SRT, SDT and WAT.
--
-- Photos: up to four pages (begin_sheet_upload, unchanged). No total and no band (D15).
-- wat-review.db.test.ts is the gate.

CREATE OR REPLACE FUNCTION public.submit_for_review(p_session_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.sessions;
  v_at timestamptz;
BEGIN
  s := private.my_open_attempt(p_session_id);
  IF s.assessment_type NOT IN ('ppdt', 'tat', 'srt', 'sdt', 'wat') THEN RAISE EXCEPTION 'not_ppdt'; END IF;
  -- A retry after a dropped reply is harmless.
  IF s.submitted_for_review_at IS NOT NULL THEN RETURN s.submitted_for_review_at; END IF;

  IF s.input_mode = 'paper' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.uploads u JOIN storage.objects o ON o.bucket_id = 'answer-sheets' AND o.name = u.storage_path
      WHERE u.session_id = s.id
    ) THEN RAISE EXCEPTION 'nothing_to_review'; END IF;
  ELSIF NOT EXISTS (
    -- A story for PPDT and TAT; for SRT, SDT and WAT any answer (their keys are bare numbers).
    SELECT 1 FROM public.responses r WHERE r.session_id = s.id AND btrim(r.response_text) <> ''
      AND (r.key LIKE '%:write' OR s.assessment_type IN ('srt', 'sdt', 'wat'))
  ) THEN RAISE EXCEPTION 'nothing_to_review';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.narrations n WHERE n.session_id = s.id
      AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'narrations' AND o.name = n.storage_path)
  ) THEN RAISE EXCEPTION 'no_recording'; END IF;

  UPDATE public.sessions SET submitted_for_review_at = now() WHERE id = s.id RETURNING submitted_for_review_at INTO v_at;
  RETURN v_at;
END $$;

CREATE FUNCTION public.review_wat(p_session_id uuid, p_answered integer, p_marks jsonb, p_went_well text, p_focus_on text)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  s public.sessions;
  v_marks jsonb;
  v_well text := nullif(btrim(coalesce(p_went_well, '')), '');
  v_focus text := nullif(btrim(coalesce(p_focus_on, '')), '');
  v_at timestamptz;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = (SELECT auth.uid());
  IF NOT FOUND OR me.deactivated_at IS NOT NULL OR me.role NOT IN ('mentor', 'org_admin', 'superadmin') THEN RAISE EXCEPTION 'not_staff'; END IF;
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id;
  -- Not found and not yours to see read the same.
  IF NOT FOUND OR NOT private.can_view_person(s.candidate_id) THEN RAISE EXCEPTION 'not_found'; END IF;
  IF s.candidate_id = me.id THEN RAISE EXCEPTION 'own_attempt'; END IF;
  IF s.by_staff THEN RAISE EXCEPTION 'staff_attempt'; END IF;
  IF s.assessment_type <> 'wat' OR s.submitted_for_review_at IS NULL THEN RAISE EXCEPTION 'not_submitted'; END IF;

  IF p_answered IS NULL OR p_answered NOT BETWEEN 0 AND 60 THEN RAISE EXCEPTION 'bad_marks'; END IF;
  v_marks := private.rubric_marks(p_marks, ARRAY['positive', 'practical', 'own']);
  IF v_marks IS NULL THEN RAISE EXCEPTION 'bad_marks'; END IF;
  IF (v_well IS NULL AND v_focus IS NULL) OR length(v_well) > 1000 OR length(v_focus) > 1000 THEN RAISE EXCEPTION 'bad_comment'; END IF;

  INSERT INTO public.evaluations (session_id, evaluator, verdict, went_well, focus_on, reviewer_id)
  VALUES (s.id, 'human', jsonb_build_object('rubric', 'wat-1', 'answered', p_answered, 'marks', v_marks), v_well, v_focus, me.id)
  ON CONFLICT (session_id) WHERE evaluator = 'human' AND response_id IS NULL
  DO UPDATE SET verdict = EXCLUDED.verdict, went_well = EXCLUDED.went_well, focus_on = EXCLUDED.focus_on,
                reviewer_id = EXCLUDED.reviewer_id, updated_at = now()
  RETURNING coalesce(updated_at, created_at) INTO v_at;
  RETURN v_at;
END $$;

REVOKE ALL ON FUNCTION public.review_wat(uuid, integer, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_wat(uuid, integer, jsonb, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_queue(p_org uuid)
RETURNS TABLE (
  session_id uuid, candidate_id uuid, full_name text, org_id uuid, assessment_type text, item_id text, test_id text, input_mode text,
  submitted_at timestamptz, has_narration boolean, reviewed_at timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT s.id, s.candidate_id, p.full_name, p.org_id, s.assessment_type, s.item_id, s.test_id, s.input_mode, s.submitted_for_review_at,
         EXISTS (SELECT 1 FROM public.narrations n WHERE n.session_id = s.id),
         (SELECT coalesce(e.updated_at, e.created_at) FROM public.evaluations e
           WHERE e.session_id = s.id AND e.evaluator = 'human' AND e.response_id IS NULL)
  FROM public.sessions s
  JOIN public.profiles p ON p.id = s.candidate_id
  WHERE s.assessment_type IN ('ppdt', 'tat', 'srt', 'sdt', 'wat')
    AND s.submitted_for_review_at IS NOT NULL
    AND NOT s.by_staff
    AND s.candidate_id <> (SELECT auth.uid())
    AND (p.org_id = p_org OR p.org_id IS NULL)
  ORDER BY s.submitted_for_review_at;
$$;
