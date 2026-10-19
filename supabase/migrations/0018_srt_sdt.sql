-- 0018_srt_sdt.sql — 2026-10-19. SRT (D39) and SDT (D40), on paper (D38).
--
--   instrument_timings 'srt'   a booklet: sixty situations in 30 minutes, any order.
--   instrument_timings 'sdt'   free-write: five paragraphs in 15 minutes. A plain start_session.
--   an SRT set is a `tests` row, like a TAT set (0017): fixed once sat (0009).
--                              sessions_set_is_a_test now covers srt; guard_test_items takes SRT
--                              situations into an SRT set.
--   start_srt                  as start_tat: typed or paper, the length from the timings.
--   save_response              the A-D rule is an OIR mock's alone: an SRT set takes a sentence.
--   submit_for_review          SRT and SDT too; typed, any answer counts (their keys are bare numbers).
--   review_srt                 AS THE REVIEWER, the checks of review_attempt (0015): how many were
--                              answered (0-60) and practical, quick, complete, each 1-5.
--   review_sdt                 the same checks: each of the five paragraphs 1-5 or none (not
--                              written), at least one, and honest, consistent, each 1-5.
--   review_queue               PPDT, TAT, SRT and SDT.
--
-- Photos: up to four pages for each (begin_sheet_upload, unchanged). No total and no band (D15).
-- srt-sdt.db.test.ts is the gate.

INSERT INTO public.instrument_timings (assessment_type, mode, item_count, time_limit_seconds) VALUES
  ('srt', 'booklet', 60, 1800),
  ('sdt', 'free_write', 5, 900);

ALTER TABLE public.sessions
  DROP CONSTRAINT sessions_set_is_a_test,
  ADD CONSTRAINT sessions_set_is_a_test CHECK ((assessment_type IN ('oir', 'tat', 'srt')) = (test_id IS NOT NULL));

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
    IF v_type IN ('tat', 'srt') THEN
      IF NOT EXISTS (SELECT 1 FROM public.items i WHERE i.id = NEW.item_id AND i.active AND i.assessment_type = v_type) THEN
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

CREATE FUNCTION public.start_srt(p_test_id text, p_input_mode text DEFAULT 'paper', p_paper_code text DEFAULT NULL)
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

  SELECT * INTO t FROM public.tests WHERE id = p_test_id AND assessment_type = 'srt';
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_test'; END IF;
  SELECT * INTO tm FROM public.instrument_timings WHERE assessment_type = 'srt';
  IF t.item_count <> tm.item_count
     OR (SELECT count(*) FROM public.test_items WHERE test_id = t.id) <> tm.item_count THEN
    RAISE EXCEPTION 'test_incomplete';
  END IF;

  UPDATE public.sessions SET status = 'ended', ended_at = expires_at, ended_by = 'expiry'
  WHERE candidate_id = me.id AND assessment_type = 'srt' AND status = 'live'
    AND expires_at < now() - interval '2 seconds';

  BEGIN
    INSERT INTO public.sessions (candidate_id, assessment_type, test_id, input_mode, paper_code, started_at, expires_at, by_staff)
    VALUES (me.id, 'srt', t.id, p_input_mode, p_paper_code, now(), now() + make_interval(secs => tm.time_limit_seconds), me.role <> 'candidate')
    RETURNING * INTO s;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'session_live';
  END;
  RETURN s;
END $$;

REVOKE ALL ON FUNCTION public.start_srt(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_srt(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_response(p_session_id uuid, p_key text, p_text text, p_final boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  grace constant interval := interval '2 seconds';
  s public.sessions;
  t public.instrument_timings;
  v_item integer;
  v_count integer;
  v_phase text;
  v_match text[];
  v_item_start timestamptz;
  v_open timestamptz;
  v_close timestamptz;
  v_rows integer;
BEGIN
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  -- Not found and not yours read the same, so the error leaks nothing.
  IF NOT FOUND OR s.candidate_id <> (SELECT auth.uid()) THEN RAISE EXCEPTION 'not_your_session'; END IF;
  IF s.status <> 'live' THEN RAISE EXCEPTION 'session_ended'; END IF;
  IF s.input_mode = 'paper' THEN RAISE EXCEPTION 'paper_session'; END IF;
  IF p_text IS NULL OR length(p_text) > 4000 THEN RAISE EXCEPTION 'too_long'; END IF;

  SELECT * INTO t FROM public.instrument_timings WHERE assessment_type = s.assessment_type;

  IF t.mode = 'stimulus_write' THEN
    v_match := regexp_match(p_key, '^([0-9]{1,3}):(note|write)$');
    IF v_match IS NULL THEN RAISE EXCEPTION 'bad_key'; END IF;
    v_item := v_match[1]::integer;
    v_phase := v_match[2];
    IF v_item >= t.item_count OR (v_phase = 'note' AND t.note_seconds IS NULL) THEN RAISE EXCEPTION 'bad_key'; END IF;
    v_item_start := s.started_at + make_interval(secs => v_item * (t.show_seconds + COALESCE(t.note_seconds, 0) + t.write_seconds));
    IF v_phase = 'note' THEN
      v_open := v_item_start + make_interval(secs => t.show_seconds);
      v_close := v_open + make_interval(secs => t.note_seconds);
    ELSE
      v_open := v_item_start + make_interval(secs => t.show_seconds + COALESCE(t.note_seconds, 0));
      v_close := v_open + make_interval(secs => t.write_seconds);
    END IF;
  ELSE
    -- Forced sequence and booklet keys are bare item numbers.
    IF p_key !~ '^[0-9]{1,3}$' THEN RAISE EXCEPTION 'bad_key'; END IF;
    v_item := p_key::integer;
    -- An OIR mock takes A-D for its own questions; an SRT set takes a sentence, by the timings' count (0018).
    IF s.test_id IS NOT NULL AND s.assessment_type = 'oir' THEN
      SELECT item_count INTO v_count FROM public.tests WHERE id = s.test_id;
      IF v_item >= v_count THEN RAISE EXCEPTION 'bad_key'; END IF;
      IF p_text NOT IN ('', 'A', 'B', 'C', 'D') THEN RAISE EXCEPTION 'bad_answer'; END IF;
    ELSIF v_item >= t.item_count THEN
      RAISE EXCEPTION 'bad_key';
    END IF;

    IF t.mode = 'forced_sequence' THEN
      v_open := s.started_at + make_interval(secs => v_item * t.seconds_per_item);
      v_close := v_open + make_interval(secs => t.seconds_per_item);
    ELSE
      v_open := s.started_at;
      v_close := s.expires_at;
    END IF;
  END IF;

  IF now() < v_open - grace THEN RAISE EXCEPTION 'item_not_open'; END IF;

  IF now() > v_close + grace THEN
    -- Late, the only write is the engine's seal: a blank for an item never answered.
    IF p_text = '' AND p_final AND NOT EXISTS (SELECT 1 FROM public.responses WHERE session_id = s.id AND key = p_key) THEN
      INSERT INTO public.responses (session_id, key, item, response_text, source, final)
      VALUES (s.id, p_key, v_item, '', 'typed', true);
      RETURN;
    END IF;
    RAISE EXCEPTION 'item_closed';
  END IF;

  INSERT INTO public.responses (session_id, key, item, response_text, source, final)
  VALUES (s.id, p_key, v_item, p_text, 'typed', p_final)
  ON CONFLICT (session_id, key) DO UPDATE
    SET response_text = EXCLUDED.response_text, final = EXCLUDED.final, saved_at = now()
    WHERE public.responses.final = false;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'item_sealed'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.submit_for_review(p_session_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.sessions;
  v_at timestamptz;
BEGIN
  s := private.my_open_attempt(p_session_id);
  IF s.assessment_type NOT IN ('ppdt', 'tat', 'srt', 'sdt') THEN RAISE EXCEPTION 'not_ppdt'; END IF;
  -- A retry after a dropped reply is harmless.
  IF s.submitted_for_review_at IS NOT NULL THEN RETURN s.submitted_for_review_at; END IF;

  IF s.input_mode = 'paper' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.uploads u JOIN storage.objects o ON o.bucket_id = 'answer-sheets' AND o.name = u.storage_path
      WHERE u.session_id = s.id
    ) THEN RAISE EXCEPTION 'nothing_to_review'; END IF;
  ELSIF NOT EXISTS (
    -- A story for PPDT and TAT; for SRT and SDT any answer (their keys are bare numbers).
    SELECT 1 FROM public.responses r WHERE r.session_id = s.id AND btrim(r.response_text) <> ''
      AND (r.key LIKE '%:write' OR s.assessment_type IN ('srt', 'sdt'))
  ) THEN RAISE EXCEPTION 'nothing_to_review';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.narrations n WHERE n.session_id = s.id
      AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'narrations' AND o.name = n.storage_path)
  ) THEN RAISE EXCEPTION 'no_recording'; END IF;

  UPDATE public.sessions SET submitted_for_review_at = now() WHERE id = s.id RETURNING submitted_for_review_at INTO v_at;
  RETURN v_at;
END $$;

CREATE FUNCTION public.review_srt(p_session_id uuid, p_answered integer, p_marks jsonb, p_went_well text, p_focus_on text)
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
  IF s.assessment_type <> 'srt' OR s.submitted_for_review_at IS NULL THEN RAISE EXCEPTION 'not_submitted'; END IF;

  IF p_answered IS NULL OR p_answered NOT BETWEEN 0 AND 60 THEN RAISE EXCEPTION 'bad_marks'; END IF;
  v_marks := private.rubric_marks(p_marks, ARRAY['practical', 'quick', 'complete']);
  IF v_marks IS NULL THEN RAISE EXCEPTION 'bad_marks'; END IF;
  IF (v_well IS NULL AND v_focus IS NULL) OR length(v_well) > 1000 OR length(v_focus) > 1000 THEN RAISE EXCEPTION 'bad_comment'; END IF;

  INSERT INTO public.evaluations (session_id, evaluator, verdict, went_well, focus_on, reviewer_id)
  VALUES (s.id, 'human', jsonb_build_object('rubric', 'srt-1', 'answered', p_answered, 'marks', v_marks), v_well, v_focus, me.id)
  ON CONFLICT (session_id) WHERE evaluator = 'human' AND response_id IS NULL
  DO UPDATE SET verdict = EXCLUDED.verdict, went_well = EXCLUDED.went_well, focus_on = EXCLUDED.focus_on,
                reviewer_id = EXCLUDED.reviewer_id, updated_at = now()
  RETURNING coalesce(updated_at, created_at) INTO v_at;
  RETURN v_at;
END $$;

-- Five paragraphs, each a whole mark 1-5 or null (not written), at least one marked; normalised.
CREATE FUNCTION private.sdt_paragraphs(p jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  e jsonb;
  v_out jsonb := '[]'::jsonb;
  v_marked integer := 0;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'array' OR jsonb_array_length(p) <> 5 THEN RETURN NULL; END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(p) LOOP
    IF jsonb_typeof(e) = 'null' THEN
      v_out := v_out || jsonb_build_array(NULL);
    ELSIF jsonb_typeof(e) = 'number' AND (e #>> '{}')::numeric IN (1, 2, 3, 4, 5) THEN
      v_out := v_out || jsonb_build_array((e #>> '{}')::integer);
      v_marked := v_marked + 1;
    ELSE
      RETURN NULL;
    END IF;
  END LOOP;
  IF v_marked = 0 THEN RETURN NULL; END IF;
  RETURN v_out;
END $$;
REVOKE ALL ON FUNCTION private.sdt_paragraphs(jsonb) FROM PUBLIC;

CREATE FUNCTION public.review_sdt(p_session_id uuid, p_paragraphs jsonb, p_marks jsonb, p_went_well text, p_focus_on text)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  s public.sessions;
  v_paragraphs jsonb;
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
  IF s.assessment_type <> 'sdt' OR s.submitted_for_review_at IS NULL THEN RAISE EXCEPTION 'not_submitted'; END IF;

  v_paragraphs := private.sdt_paragraphs(p_paragraphs);
  v_marks := private.rubric_marks(p_marks, ARRAY['honest', 'consistent']);
  IF v_paragraphs IS NULL OR v_marks IS NULL THEN RAISE EXCEPTION 'bad_marks'; END IF;
  IF (v_well IS NULL AND v_focus IS NULL) OR length(v_well) > 1000 OR length(v_focus) > 1000 THEN RAISE EXCEPTION 'bad_comment'; END IF;

  INSERT INTO public.evaluations (session_id, evaluator, verdict, went_well, focus_on, reviewer_id)
  VALUES (s.id, 'human', jsonb_build_object('rubric', 'sdt-1', 'paragraphs', v_paragraphs, 'marks', v_marks), v_well, v_focus, me.id)
  ON CONFLICT (session_id) WHERE evaluator = 'human' AND response_id IS NULL
  DO UPDATE SET verdict = EXCLUDED.verdict, went_well = EXCLUDED.went_well, focus_on = EXCLUDED.focus_on,
                reviewer_id = EXCLUDED.reviewer_id, updated_at = now()
  RETURNING coalesce(updated_at, created_at) INTO v_at;
  RETURN v_at;
END $$;

REVOKE ALL ON FUNCTION public.review_srt(uuid, integer, jsonb, text, text), public.review_sdt(uuid, jsonb, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_srt(uuid, integer, jsonb, text, text), public.review_sdt(uuid, jsonb, jsonb, text, text) TO authenticated;

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
  WHERE s.assessment_type IN ('ppdt', 'tat', 'srt', 'sdt')
    AND s.submitted_for_review_at IS NOT NULL
    AND NOT s.by_staff
    AND s.candidate_id <> (SELECT auth.uid())
    AND (p.org_id = p_org OR p.org_id IS NULL)
  ORDER BY s.submitted_for_review_at;
$$;
