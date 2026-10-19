-- 0017_tat.sql — 2026-10-19. TAT (D36): sets of eleven pictures and a blank,
-- 30 s to look and 4 min to write each, back to back, typed or on paper; a
-- mentor marks each story.
--
--   instrument_timings 'tat'  twelve slides × (30 s show + 240 s write); save_response
--                             (0012) already keeps one window per slide.
--   a TAT set is a `tests` row, like an OIR mock (0009): once anyone has sat it,
--                             it cannot change. sessions_oir_is_a_test becomes
--                             sessions_set_is_a_test (an oir or tat session is always at one).
--   guard_test_items          a mock takes keyed OIR questions; a set takes TAT pictures.
--   start_test                OIR only. start_tat starts a set, typed or on paper (D22).
--   test_result, my_test_attempts  OIR only, so a TAT attempt never shows as a mock.
--   begin_sheet_upload        up to eight pages for TAT (twelve stories), four otherwise.
--   submit_for_review         TAT too. There is no narration: begin_narration stays PPDT's.
--   review_tat                AS THE REVIEWER, the same checks as review_attempt (0015):
--                             twelve stories, each a whole mark 1-5 or none (not written),
--                             at least one marked, each with a note of up to 300 characters.
--   review_queue              PPDT and TAT, with the type and set of each.
--
-- tat.db.test.ts is the gate.

INSERT INTO public.instrument_timings (assessment_type, mode, item_count, show_seconds, note_seconds, write_seconds)
VALUES ('tat', 'stimulus_write', 12, 30, NULL, 240);

ALTER TABLE public.sessions
  DROP CONSTRAINT sessions_oir_is_a_test,
  ADD CONSTRAINT sessions_set_is_a_test CHECK ((assessment_type IN ('oir', 'tat')) = (test_id IS NOT NULL));

CREATE OR REPLACE FUNCTION private.guard_test_items() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_type text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND private.test_is_sat(OLD.test_id) THEN RAISE EXCEPTION 'test_fixed'; END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF private.test_is_sat(NEW.test_id) THEN RAISE EXCEPTION 'test_fixed'; END IF;
    IF NEW.ordinal >= (SELECT item_count FROM public.tests WHERE id = NEW.test_id) THEN RAISE EXCEPTION 'bad_ordinal'; END IF;
    SELECT assessment_type INTO v_type FROM public.tests WHERE id = NEW.test_id;
    IF v_type = 'tat' THEN
      IF NOT EXISTS (SELECT 1 FROM public.items i WHERE i.id = NEW.item_id AND i.active AND i.assessment_type = 'tat') THEN
        RAISE EXCEPTION 'bad_item';
      END IF;
    ELSIF NOT EXISTS (
      SELECT 1 FROM public.items i JOIN public.item_keys k ON k.item_id = i.id
      WHERE i.id = NEW.item_id AND i.active AND i.assessment_type IN ('oir_verbal', 'oir_nonverbal')
    ) THEN
      RAISE EXCEPTION 'bad_item';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- Starting. start_test is for OIR mocks only; start_tat runs the same checks
-- as start_ppdt (0012), takes its length from the timings, and refuses a set
-- that is not exactly twelve slides of the timings' length.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.start_test(p_test_id text)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  t public.tests;
  s public.sessions;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = (SELECT auth.uid());
  IF NOT FOUND OR me.deactivated_at IS NOT NULL THEN RAISE EXCEPTION 'not_a_candidate'; END IF;
  -- A date of birth is optional (D37): only a known under-18 needs a guardian's consent.
  IF me.role = 'candidate' AND me.dob IS NOT NULL
     AND date_part('year', age(current_date, me.dob)) < 18 AND me.guardian_consent_at IS NULL THEN
    RAISE EXCEPTION 'consent_required';
  END IF;

  SELECT * INTO t FROM public.tests WHERE id = p_test_id AND assessment_type = 'oir';
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_test'; END IF;
  IF (SELECT count(*) FROM public.test_items WHERE test_id = t.id) <> t.item_count THEN RAISE EXCEPTION 'test_incomplete'; END IF;

  UPDATE public.sessions SET status = 'ended', ended_at = expires_at, ended_by = 'expiry'
  WHERE candidate_id = me.id AND assessment_type = t.assessment_type AND status = 'live'
    AND expires_at < now() - interval '2 seconds';

  BEGIN
    INSERT INTO public.sessions (candidate_id, assessment_type, test_id, input_mode, started_at, expires_at, by_staff)
    VALUES (me.id, t.assessment_type, t.id, 'typed', now(), now() + make_interval(secs => t.time_limit_seconds), me.role <> 'candidate')
    RETURNING * INTO s;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'session_live';
  END;
  RETURN s;
END $$;

CREATE FUNCTION public.start_tat(p_test_id text, p_input_mode text DEFAULT 'typed', p_paper_code text DEFAULT NULL)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  t public.tests;
  tm public.instrument_timings;
  s public.sessions;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = (SELECT auth.uid());
  IF NOT FOUND OR me.deactivated_at IS NOT NULL THEN RAISE EXCEPTION 'not_a_candidate'; END IF;
  -- A date of birth is optional (D37): only a known under-18 needs a guardian's consent.
  IF me.role = 'candidate' AND me.dob IS NOT NULL
     AND date_part('year', age(current_date, me.dob)) < 18 AND me.guardian_consent_at IS NULL THEN
    RAISE EXCEPTION 'consent_required';
  END IF;

  SELECT * INTO t FROM public.tests WHERE id = p_test_id AND assessment_type = 'tat';
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_test'; END IF;
  SELECT * INTO tm FROM public.instrument_timings WHERE assessment_type = 'tat';
  IF t.item_count <> tm.item_count
     OR (SELECT count(*) FROM public.test_items WHERE test_id = t.id) <> tm.item_count THEN
    RAISE EXCEPTION 'test_incomplete';
  END IF;

  UPDATE public.sessions SET status = 'ended', ended_at = expires_at, ended_by = 'expiry'
  WHERE candidate_id = me.id AND assessment_type = 'tat' AND status = 'live'
    AND expires_at < now() - interval '2 seconds';

  BEGIN
    INSERT INTO public.sessions (candidate_id, assessment_type, test_id, input_mode, paper_code, started_at, expires_at, by_staff)
    VALUES (me.id, 'tat', t.id, p_input_mode, p_paper_code, now(),
      now() + make_interval(secs => tm.item_count * (tm.show_seconds + tm.write_seconds)),
      me.role <> 'candidate')
    RETURNING * INTO s;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'session_live';
  END;
  RETURN s;
END $$;

REVOKE ALL ON FUNCTION public.start_tat(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_tat(text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- OIR's reads stay OIR's.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.test_result(p_session_id uuid)
RETURNS TABLE (ordinal integer, item_id text, chosen text, key text, rule text, reasoning_type text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.sessions;
BEGIN
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND OR s.assessment_type <> 'oir' OR NOT private.can_view_person(s.candidate_id) THEN RAISE EXCEPTION 'not_your_session'; END IF;
  IF s.status = 'live' AND now() <= s.expires_at + interval '2 seconds' THEN RAISE EXCEPTION 'session_live'; END IF;

  RETURN QUERY
    SELECT ti.ordinal, ti.item_id, COALESCE(r.response_text, ''), k.key, k.rule, i.payload ->> 'reasoningType'
    FROM public.test_items ti
    JOIN public.items i ON i.id = ti.item_id
    JOIN public.item_keys k ON k.item_id = ti.item_id
    LEFT JOIN public.responses r ON r.session_id = s.id AND r.key = ti.ordinal::text
    WHERE ti.test_id = s.test_id
    ORDER BY ti.ordinal;
END $$;

CREATE OR REPLACE FUNCTION public.my_test_attempts()
RETURNS TABLE (session_id uuid, test_id text, started_at timestamptz, ended_at timestamptz, over boolean, answered integer, correct integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH mine AS (
    SELECT s.*, (s.status = 'ended' OR now() > s.expires_at + interval '2 seconds') AS is_over
    FROM public.sessions s
    WHERE s.candidate_id = (SELECT auth.uid())
      AND s.assessment_type = 'oir'
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.deactivated_at IS NULL)
  )
  SELECT
    m.id,
    m.test_id,
    m.started_at,
    CASE WHEN m.status = 'ended' THEN m.ended_at WHEN m.is_over THEN m.expires_at END,
    m.is_over,
    (SELECT count(*) FROM public.responses r WHERE r.session_id = m.id AND r.response_text <> '')::integer,
    CASE WHEN m.is_over THEN (
      SELECT count(*)
      FROM public.test_items ti
      JOIN public.item_keys k ON k.item_id = ti.item_id
      JOIN public.responses r ON r.session_id = m.id AND r.key = ti.ordinal::text AND r.response_text = k.key
      WHERE ti.test_id = m.test_id
    )::integer END
  FROM mine m
  ORDER BY m.started_at DESC;
$$;

-- ---------------------------------------------------------------------------
-- Paper and review.
-- ---------------------------------------------------------------------------

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
  IF p_page IS NULL OR p_page < 1 OR p_page > (CASE WHEN s.assessment_type = 'tat' THEN 8 ELSE 4 END) THEN RAISE EXCEPTION 'bad_page'; END IF;

  v_path := s.candidate_id::text || '/' || s.id::text || '/page-' || p_page::text || '-' || private.fresh_suffix() || '.jpg';
  INSERT INTO public.uploads (session_id, storage_path, page_no)
  VALUES (s.id, v_path, p_page)
  ON CONFLICT (session_id, page_no) DO UPDATE
    SET storage_path = EXCLUDED.storage_path, created_at = now(), ocr_status = 'pending', ocr_text = NULL,
        ocr_confidence = NULL, ocr_provider = NULL, ocr_cost_usd = NULL, candidate_corrected = false;
  RETURN v_path;
END $$;

CREATE OR REPLACE FUNCTION public.submit_for_review(p_session_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.sessions;
  v_at timestamptz;
BEGIN
  s := private.my_open_attempt(p_session_id);
  IF s.assessment_type NOT IN ('ppdt', 'tat') THEN RAISE EXCEPTION 'not_ppdt'; END IF;
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

-- Twelve stories, each {mark: 1-5 or null, note: text or null}, normalised;
-- NULL when the list is anything else or no story is marked.
CREATE FUNCTION private.tat_marks(p jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  e jsonb;
  v_mark jsonb;
  v_note jsonb;
  v_out jsonb := '[]'::jsonb;
  v_marked integer := 0;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'array' OR jsonb_array_length(p) <> 12 THEN RETURN NULL; END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(p) LOOP
    IF jsonb_typeof(e) <> 'object' OR EXISTS (SELECT 1 FROM jsonb_object_keys(e) k WHERE k NOT IN ('mark', 'note')) THEN RETURN NULL; END IF;
    v_mark := coalesce(e -> 'mark', 'null'::jsonb);
    v_note := coalesce(e -> 'note', 'null'::jsonb);
    IF jsonb_typeof(v_mark) = 'number' THEN
      IF (v_mark #>> '{}')::numeric NOT IN (1, 2, 3, 4, 5) THEN RETURN NULL; END IF;
      v_marked := v_marked + 1;
      v_mark := to_jsonb((v_mark #>> '{}')::integer);
    ELSIF jsonb_typeof(v_mark) <> 'null' THEN
      RETURN NULL;
    END IF;
    IF jsonb_typeof(v_note) = 'string' THEN
      IF length(v_note #>> '{}') > 300 THEN RETURN NULL; END IF;
      v_note := CASE WHEN btrim(v_note #>> '{}') = '' THEN 'null'::jsonb ELSE to_jsonb(btrim(v_note #>> '{}')) END;
    ELSIF jsonb_typeof(v_note) <> 'null' THEN
      RETURN NULL;
    END IF;
    v_out := v_out || jsonb_build_array(jsonb_build_object('mark', v_mark, 'note', v_note));
  END LOOP;
  IF v_marked = 0 THEN RETURN NULL; END IF;
  RETURN v_out;
END $$;
REVOKE ALL ON FUNCTION private.tat_marks(jsonb) FROM PUBLIC;

CREATE FUNCTION public.review_tat(p_session_id uuid, p_stories jsonb, p_went_well text, p_focus_on text)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  s public.sessions;
  v_stories jsonb;
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
  IF s.assessment_type <> 'tat' OR s.submitted_for_review_at IS NULL THEN RAISE EXCEPTION 'not_submitted'; END IF;

  v_stories := private.tat_marks(p_stories);
  IF v_stories IS NULL THEN RAISE EXCEPTION 'bad_marks'; END IF;
  IF (v_well IS NULL AND v_focus IS NULL) OR length(v_well) > 1000 OR length(v_focus) > 1000 THEN RAISE EXCEPTION 'bad_comment'; END IF;

  INSERT INTO public.evaluations (session_id, evaluator, verdict, went_well, focus_on, reviewer_id)
  VALUES (s.id, 'human', jsonb_build_object('rubric', 'tat-1', 'stories', v_stories), v_well, v_focus, me.id)
  ON CONFLICT (session_id) WHERE evaluator = 'human' AND response_id IS NULL
  DO UPDATE SET verdict = EXCLUDED.verdict, went_well = EXCLUDED.went_well, focus_on = EXCLUDED.focus_on,
                reviewer_id = EXCLUDED.reviewer_id, updated_at = now()
  RETURNING coalesce(updated_at, created_at) INTO v_at;
  RETURN v_at;
END $$;

REVOKE ALL ON FUNCTION public.review_tat(uuid, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_tat(uuid, jsonb, text, text) TO authenticated;

-- The queue gains the type and the set; a changed return type means drop and create.
DROP FUNCTION public.review_queue(uuid);
CREATE FUNCTION public.review_queue(p_org uuid)
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
  WHERE s.assessment_type IN ('ppdt', 'tat')
    AND s.submitted_for_review_at IS NOT NULL
    AND NOT s.by_staff
    AND s.candidate_id <> (SELECT auth.uid())
    AND (p.org_id = p_org OR p.org_id IS NULL)
  ORDER BY s.submitted_for_review_at;
$$;

REVOKE ALL ON FUNCTION public.review_queue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_queue(uuid) TO authenticated;
