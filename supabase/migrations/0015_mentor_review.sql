-- 0015_mentor_review.sql — 2026-10-19. A mentor's review of a PPDT attempt
-- sent for review (D34). A staff review is an `evaluations` row with
-- evaluator 'human' (UI.md §5, D6): the schema has waited for it since 0001.
--
--   evaluations.reviewer_id, updated_at   who marked it last, and when.
--   evaluations_one_human_review          one human review per attempt; a second replaces it.
--   review_attempt   AS THE REVIEWER: staff who may see the candidate, never their own
--                    attempt, only one sent for review, never a staff member's own
--                    practice (D25). Story marks 1-5 on four headings; narration marks
--                    1-5 on three, exactly when there is a narration; a word of feedback.
--   review_queue     SECURITY INVOKER, so row level security still decides what is
--                    seen; it keeps staff attempts out in SQL, not in each page
--                    (SUGGESTIONS.md, "Staff sessions must stay out"). The academy
--                    asked for, plus candidates with no academy — whom only the
--                    owner can see (D34).
--
-- review.db.test.ts is the gate.

ALTER TABLE public.evaluations
  ADD COLUMN reviewer_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN updated_at timestamptz;
CREATE INDEX evaluations_reviewer ON public.evaluations (reviewer_id);
CREATE UNIQUE INDEX evaluations_one_human_review ON public.evaluations (session_id) WHERE evaluator = 'human' AND response_id IS NULL;

-- Exactly these headings, each a whole mark 1 to 5, or NULL. Normalised, so
-- nothing the caller adds is kept.
CREATE FUNCTION private.rubric_marks(p jsonb, p_keys text[]) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  k text;
  v jsonb;
  marks jsonb := '{}'::jsonb;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN RETURN NULL; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p)) <> cardinality(p_keys) THEN RETURN NULL; END IF;
  FOREACH k IN ARRAY p_keys LOOP
    v := p -> k;
    IF v IS NULL OR jsonb_typeof(v) <> 'number' OR (v #>> '{}')::numeric NOT IN (1, 2, 3, 4, 5) THEN RETURN NULL; END IF;
    marks := marks || jsonb_build_object(k, (v #>> '{}')::integer);
  END LOOP;
  RETURN marks;
END $$;
REVOKE ALL ON FUNCTION private.rubric_marks(jsonb, text[]) FROM PUBLIC;

CREATE FUNCTION public.review_attempt(p_session_id uuid, p_story jsonb, p_narration jsonb, p_went_well text, p_focus_on text)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  s public.sessions;
  v_story jsonb;
  v_voice jsonb;
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
  IF s.assessment_type <> 'ppdt' OR s.submitted_for_review_at IS NULL THEN RAISE EXCEPTION 'not_submitted'; END IF;

  v_story := private.rubric_marks(p_story, ARRAY['hero', 'action', 'outcome', 'outlook']);
  IF v_story IS NULL THEN RAISE EXCEPTION 'bad_marks'; END IF;
  IF EXISTS (SELECT 1 FROM public.narrations n WHERE n.session_id = s.id) THEN
    v_voice := private.rubric_marks(p_narration, ARRAY['clarity', 'confidence', 'timing']);
    IF v_voice IS NULL THEN RAISE EXCEPTION 'bad_marks'; END IF;
  ELSIF p_narration IS NOT NULL AND p_narration <> 'null'::jsonb THEN
    RAISE EXCEPTION 'bad_marks';
  END IF;
  IF (v_well IS NULL AND v_focus IS NULL) OR length(v_well) > 1000 OR length(v_focus) > 1000 THEN RAISE EXCEPTION 'bad_comment'; END IF;

  INSERT INTO public.evaluations (session_id, evaluator, verdict, went_well, focus_on, reviewer_id)
  VALUES (s.id, 'human', jsonb_build_object('rubric', 'ppdt-1', 'story', v_story, 'narration', v_voice), v_well, v_focus, me.id)
  ON CONFLICT (session_id) WHERE evaluator = 'human' AND response_id IS NULL
  DO UPDATE SET verdict = EXCLUDED.verdict, went_well = EXCLUDED.went_well, focus_on = EXCLUDED.focus_on,
                reviewer_id = EXCLUDED.reviewer_id, updated_at = now()
  RETURNING coalesce(updated_at, created_at) INTO v_at;
  RETURN v_at;
END $$;

REVOKE ALL ON FUNCTION public.review_attempt(uuid, jsonb, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_attempt(uuid, jsonb, jsonb, text, text) TO authenticated;

CREATE FUNCTION public.review_queue(p_org uuid)
RETURNS TABLE (
  session_id uuid, candidate_id uuid, full_name text, org_id uuid, item_id text, input_mode text,
  submitted_at timestamptz, has_narration boolean, reviewed_at timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT s.id, s.candidate_id, p.full_name, p.org_id, s.item_id, s.input_mode, s.submitted_for_review_at,
         EXISTS (SELECT 1 FROM public.narrations n WHERE n.session_id = s.id),
         (SELECT coalesce(e.updated_at, e.created_at) FROM public.evaluations e
           WHERE e.session_id = s.id AND e.evaluator = 'human' AND e.response_id IS NULL)
  FROM public.sessions s
  JOIN public.profiles p ON p.id = s.candidate_id
  WHERE s.assessment_type = 'ppdt'
    AND s.submitted_for_review_at IS NOT NULL
    AND NOT s.by_staff
    AND s.candidate_id <> (SELECT auth.uid())
    AND (p.org_id = p_org OR p.org_id IS NULL)
  ORDER BY s.submitted_for_review_at;
$$;

REVOKE ALL ON FUNCTION public.review_queue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_queue(uuid) TO authenticated;
