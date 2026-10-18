-- 0009_oir_mocks.sql — 2026-10-18. OIR mocks (D32): fixed booklets, timed on
-- the server, keys only after the attempt.
--
--   tests        a mock: its length and time limit. Rows come from
--                content/oir-mocks.json through `npm run tests:seed`.
--   test_items   its questions, in booklet order.
--   sessions     gain test_id: an 'oir' session is always an attempt at one mock.
--
-- ONCE SAT, FIXED. A mock nobody has started can still be corrected; once any
-- session exists for it, its questions, length and time limit cannot change
-- and it cannot be removed — "Mock 3" must mean the same questions to
-- everyone who took it. A question any mock uses cannot be switched off.
--
-- Mocks are practice (D32): no percentile, unlimited retakes, and every
-- question stays in chapter practice too. Answers come back from
-- test_result() only once the attempt is over, so a mock stays a real timed run.
-- src/db/__tests__/mocks.db.test.ts is the gate.

INSERT INTO public.instrument_timings (assessment_type, mode, item_count, time_limit_seconds) VALUES ('oir', 'booklet', 40, 1200);

CREATE TABLE public.tests (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(id) <= 80),
  assessment_type text NOT NULL REFERENCES public.instrument_timings (assessment_type),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 80),
  item_count integer NOT NULL CHECK (item_count BETWEEN 1 AND 200),
  time_limit_seconds integer NOT NULL CHECK (time_limit_seconds BETWEEN 60 AND 10800),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.test_items (
  test_id text NOT NULL REFERENCES public.tests (id) ON DELETE RESTRICT,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  item_id text NOT NULL REFERENCES public.items (id) ON DELETE RESTRICT,
  PRIMARY KEY (test_id, ordinal),
  UNIQUE (test_id, item_id)
);
CREATE INDEX test_items_item ON public.test_items (item_id);

ALTER TABLE public.sessions
  ADD COLUMN test_id text REFERENCES public.tests (id) ON DELETE RESTRICT,
  ADD CONSTRAINT sessions_oir_is_a_test CHECK ((assessment_type = 'oir') = (test_id IS NOT NULL));
CREATE INDEX sessions_test ON public.sessions (test_id);

-- ---------------------------------------------------------------------------
-- Once sat, fixed.
-- ---------------------------------------------------------------------------
-- The guards run as their owner (SECURITY DEFINER), so they hold for every
-- writer, the seeding service role included, without granting it the private schema.

CREATE FUNCTION private.test_is_sat(p_test text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.sessions WHERE test_id = p_test);
$$;

CREATE FUNCTION private.guard_test() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF private.test_is_sat(OLD.id) AND (TG_OP = 'DELETE'
      OR NEW.id <> OLD.id OR NEW.assessment_type <> OLD.assessment_type
      OR NEW.item_count <> OLD.item_count OR NEW.time_limit_seconds <> OLD.time_limit_seconds) THEN
    RAISE EXCEPTION 'test_fixed';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION private.guard_test_items() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND private.test_is_sat(OLD.test_id) THEN RAISE EXCEPTION 'test_fixed'; END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF private.test_is_sat(NEW.test_id) THEN RAISE EXCEPTION 'test_fixed'; END IF;
    IF NEW.ordinal >= (SELECT item_count FROM public.tests WHERE id = NEW.test_id) THEN RAISE EXCEPTION 'bad_ordinal'; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.items i JOIN public.item_keys k ON k.item_id = i.id
      WHERE i.id = NEW.item_id AND i.active AND i.assessment_type IN ('oir_verbal', 'oir_nonverbal')
    ) THEN
      RAISE EXCEPTION 'bad_item';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION private.guard_item_in_test() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.active AND NOT NEW.active AND EXISTS (SELECT 1 FROM public.test_items WHERE item_id = OLD.id) THEN
    RAISE EXCEPTION 'item_in_test';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tests_fixed BEFORE UPDATE OR DELETE ON public.tests FOR EACH ROW EXECUTE FUNCTION private.guard_test();
CREATE TRIGGER test_items_fixed BEFORE INSERT OR UPDATE OR DELETE ON public.test_items FOR EACH ROW EXECUTE FUNCTION private.guard_test_items();
CREATE TRIGGER items_in_test BEFORE UPDATE OF active ON public.items FOR EACH ROW EXECUTE FUNCTION private.guard_item_in_test();

-- ---------------------------------------------------------------------------
-- Reading: any signed-in user sees the mocks and their order (the questions
-- themselves are already readable, 0005; keys never are).
-- ---------------------------------------------------------------------------

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tests, public.test_items FROM anon, authenticated;
GRANT SELECT ON public.tests, public.test_items TO authenticated;
CREATE POLICY tests_read ON public.tests FOR SELECT TO authenticated USING (true);
CREATE POLICY test_items_read ON public.test_items FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- Starting a mock. The same checks as start_session (0006), the deadline from
-- the mock, and one live mock at a time (sessions_one_live, per assessment
-- type). A stale live attempt — past its deadline — is closed, not a block.
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.start_test(p_test_id text)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  t public.tests;
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

  SELECT * INTO t FROM public.tests WHERE id = p_test_id;
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

-- ---------------------------------------------------------------------------
-- Saving an answer: as 0001, plus — for a mock — the question must be in it
-- and the answer A–D or blank (blank clears it).
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
  -- Forced sequence keys are bare item numbers; phased keys arrive with stimulus → write.
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

-- ---------------------------------------------------------------------------
-- The result: every question with the answer chosen, its key and rule — only
-- once the attempt is over (submitted, or past its deadline), and only to
-- someone who may see the candidate (themselves, their academy's staff, the
-- superadmin: can_view_person). Keys stay unreadable otherwise (0005).
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.test_result(p_session_id uuid)
RETURNS TABLE (ordinal integer, item_id text, chosen text, key text, rule text, reasoning_type text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.sessions;
BEGIN
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND OR s.test_id IS NULL OR NOT private.can_view_person(s.candidate_id) THEN RAISE EXCEPTION 'not_your_session'; END IF;
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

REVOKE ALL ON FUNCTION public.start_test(text), public.test_result(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_test(text), public.test_result(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.test_is_sat(text), private.guard_test(), private.guard_test_items(), private.guard_item_in_test() FROM PUBLIC, anon, authenticated;
