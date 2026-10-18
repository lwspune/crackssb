-- 0012_ppdt.sql — 2026-10-18. PPDT, written portion (D33): one picture,
-- 30 s to look, 1 min for the character box, 4 min for the story.
--
--   instrument_timings  gains the phase lengths of a stimulus → write test.
--   sessions.item_id    the picture an attempt is at; a 'ppdt' session always has one.
--   start_ppdt          start an attempt at a picture, typed or on paper (D22).
--   save_response       takes '<item>:note' and '<item>:write', each only inside
--                       its own window; nothing while the picture shows.
--
-- The pictures are `items` rows of type 'ppdt' (npm run ppdt:seed). Their
-- ground truth is not secret — it is the feedback — and lives with the
-- content (content/ppdt/pictures.json). ppdt.db.test.ts is the gate.

ALTER TABLE public.instrument_timings
  ADD COLUMN show_seconds integer CHECK (show_seconds > 0),
  ADD COLUMN note_seconds integer CHECK (note_seconds > 0),
  ADD COLUMN write_seconds integer CHECK (write_seconds > 0),
  DROP CONSTRAINT instrument_timings_shape,
  ADD CONSTRAINT instrument_timings_shape CHECK (
    (mode = 'forced_sequence' AND seconds_per_item IS NOT NULL AND time_limit_seconds IS NULL
      AND show_seconds IS NULL AND note_seconds IS NULL AND write_seconds IS NULL)
    OR (mode IN ('booklet', 'free_write') AND time_limit_seconds IS NOT NULL AND seconds_per_item IS NULL
      AND show_seconds IS NULL AND note_seconds IS NULL AND write_seconds IS NULL)
    OR (mode = 'stimulus_write' AND show_seconds IS NOT NULL AND write_seconds IS NOT NULL
      AND seconds_per_item IS NULL AND time_limit_seconds IS NULL)
  );

INSERT INTO public.instrument_timings (assessment_type, mode, item_count, show_seconds, note_seconds, write_seconds)
VALUES ('ppdt', 'stimulus_write', 1, 30, 60, 240);

ALTER TABLE public.sessions
  ADD COLUMN item_id text REFERENCES public.items (id) ON DELETE RESTRICT,
  ADD CONSTRAINT sessions_ppdt_has_picture CHECK ((assessment_type = 'ppdt') = (item_id IS NOT NULL));
CREATE INDEX sessions_item ON public.sessions (item_id);

-- ---------------------------------------------------------------------------
-- Starting. The same checks as start_session (0006); the length from the
-- phases; one live PPDT at a time, a stale one closed rather than a block.
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.start_ppdt(p_item_id text, p_input_mode text DEFAULT 'typed', p_paper_code text DEFAULT NULL)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  t public.instrument_timings;
  s public.sessions;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = (SELECT auth.uid());
  IF NOT FOUND OR me.deactivated_at IS NOT NULL THEN RAISE EXCEPTION 'not_a_candidate'; END IF;
  IF me.role = 'candidate' THEN
    IF me.dob IS NULL THEN RAISE EXCEPTION 'dob_required'; END IF;
    IF date_part('year', age(current_date, me.dob)) < 18 AND me.guardian_consent_at IS NULL THEN
      RAISE EXCEPTION 'consent_required';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.items WHERE id = p_item_id AND assessment_type = 'ppdt' AND active) THEN
    RAISE EXCEPTION 'unknown_item';
  END IF;
  SELECT * INTO t FROM public.instrument_timings WHERE assessment_type = 'ppdt';

  UPDATE public.sessions SET status = 'ended', ended_at = expires_at, ended_by = 'expiry'
  WHERE candidate_id = me.id AND assessment_type = 'ppdt' AND status = 'live'
    AND expires_at < now() - interval '2 seconds';

  BEGIN
    INSERT INTO public.sessions (candidate_id, assessment_type, item_id, input_mode, paper_code, started_at, expires_at, by_staff)
    VALUES (me.id, 'ppdt', p_item_id, p_input_mode, p_paper_code, now(),
      now() + make_interval(secs => t.item_count * (t.show_seconds + COALESCE(t.note_seconds, 0) + t.write_seconds)),
      me.role <> 'candidate')
    RETURNING * INTO s;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'session_live';
  END;
  RETURN s;
END $$;

-- ---------------------------------------------------------------------------
-- Saving: as 0009, plus stimulus → write. An item there runs show, (note),
-- write back to back; its keys are '<item>:note' and '<item>:write', and each
-- opens only in its own window.
-- ---------------------------------------------------------------------------

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
    IF s.test_id IS NOT NULL THEN
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

REVOKE ALL ON FUNCTION public.start_ppdt(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_ppdt(text, text, text) TO authenticated;
