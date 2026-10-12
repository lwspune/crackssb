-- 0001_tenancy_sessions_uploads.sql — Sprint 1 (ROADMAP), 2026-10-12.
--
-- Tenancy, test sessions on the server's clock, answers, evaluations, and the
-- answer-sheet uploads seam (ARCHITECTURE.md §4, §6). The access rules are the
-- Sprint 1 gate and live HERE, not in the app: src/db/__tests__/access.db.test.ts
-- runs them as real signed-in users through the public key.
--
-- RULES THE DATABASE ENFORCES
--   * Who sees what: a candidate sees only their own rows; a mentor or
--     org_admin sees their own academy's candidates; a superadmin sees all.
--     The anonymous role sees nothing.
--   * Nobody signed in writes a table directly. Sessions, answers and endings
--     go through start_session / save_response / end_session, which check
--     ownership, timing and consent. Profiles and organisations are written
--     by the service role only (accounts are created by script — manual logins).
--   * The clock is the server's (UI.md §3.2): start_session stamps now() and
--     fixes expires_at from instrument_timings; save_response refuses an
--     answer outside its word's window (2 s grace for the network). A closed
--     window may only be sealed blank, never written into or overwritten.
--   * A candidate under 18 cannot start a test without recorded guardian
--     consent (DPDP Act).
--   * Paper sessions (D22) carry a code from the handwriting-safe alphabet and
--     take no typed answers.
--   * One live session per candidate per test.
--
-- SCANS. Private bucket `answer-sheets` with no storage policies: uploads go
-- through signed links issued server-side (Question_Bank 0153's pattern), and
-- only the service role reads. The bucket repeats the size and type limits.

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------

-- Helpers live in `private`, which the API does not expose (only `public` is).
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TYPE public.app_role AS ENUM ('candidate', 'mentor', 'org_admin', 'superadmin');

CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80),
  type text NOT NULL CHECK (type IN ('academy', 'individual')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'candidate',
  -- RESTRICT: an academy is never deleted out from under its people.
  org_id uuid REFERENCES public.organisations (id) ON DELETE RESTRICT,
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 120),
  dob date CHECK (dob >= DATE '1940-01-01'),
  guardian_consent_at timestamptz,
  entry_types text[] NOT NULL DEFAULT ARRAY['nda'],
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Staff belong to an academy; candidates may be solo (B2C); superadmin is the platform.
  CONSTRAINT profiles_staff_have_org CHECK (role IN ('candidate', 'superadmin') OR org_id IS NOT NULL)
);
CREATE INDEX profiles_org ON public.profiles (org_id);

CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  target_ssb_window text CHECK (target_ssb_window IS NULL OR length(btrim(target_ssb_window)) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX batches_org ON public.batches (org_id);

CREATE TABLE public.batch_members (
  batch_id uuid NOT NULL REFERENCES public.batches (id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, candidate_id)
);
CREATE INDEX batch_members_candidate ON public.batch_members (candidate_id);

-- A batch holds only candidates, and only its own academy's.
CREATE FUNCTION private.batch_member_check() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.batches b ON b.id = NEW.batch_id
    WHERE p.id = NEW.candidate_id AND p.role = 'candidate' AND p.org_id = b.org_id
  ) THEN
    RAISE EXCEPTION 'batch_member_invalid' USING DETAIL = 'A batch member must be a candidate of the batch''s academy.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER batch_members_valid BEFORE INSERT OR UPDATE ON public.batch_members
  FOR EACH ROW EXECUTE FUNCTION private.batch_member_check();

-- ---------------------------------------------------------------------------
-- Timings — the server's copy of INSTRUMENT_CONFIGS (src/runner/modes.ts).
-- access.db.test.ts fails if the two ever disagree.
-- ---------------------------------------------------------------------------

CREATE TABLE public.instrument_timings (
  assessment_type text PRIMARY KEY CHECK (assessment_type ~ '^[a-z_]+$'),
  mode text NOT NULL CHECK (mode IN ('forced_sequence', 'stimulus_write', 'booklet', 'free_write')),
  item_count integer NOT NULL CHECK (item_count > 0),
  seconds_per_item integer CHECK (seconds_per_item > 0),
  time_limit_seconds integer CHECK (time_limit_seconds > 0),
  CONSTRAINT instrument_timings_shape CHECK (
    (mode = 'forced_sequence' AND seconds_per_item IS NOT NULL AND time_limit_seconds IS NULL)
    OR (mode IN ('booklet', 'free_write') AND time_limit_seconds IS NOT NULL AND seconds_per_item IS NULL)
    OR (mode = 'stimulus_write')
  )
);
INSERT INTO public.instrument_timings (assessment_type, mode, item_count, seconds_per_item) VALUES ('wat', 'forced_sequence', 60, 15);

-- ---------------------------------------------------------------------------
-- Sessions, answers, evaluations
-- ---------------------------------------------------------------------------

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  assessment_type text NOT NULL REFERENCES public.instrument_timings (assessment_type),
  input_mode text NOT NULL DEFAULT 'typed' CHECK (input_mode IN ('typed', 'paper')),
  paper_code text CHECK (paper_code ~ '^[ACDEFGHJKMNPQRTUVWXY34679]{3}-[ACDEFGHJKMNPQRTUVWXY34679]{3}$'),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  ended_at timestamptz,
  ended_by text CHECK (ended_by IN ('submit', 'expiry', 'abandon')),
  proctor_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  cost_usd numeric NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  CONSTRAINT sessions_paper_has_code CHECK ((input_mode = 'paper') = (paper_code IS NOT NULL)),
  CONSTRAINT sessions_window CHECK (expires_at > started_at),
  CONSTRAINT sessions_state CHECK (
    (status = 'live' AND ended_at IS NULL AND ended_by IS NULL)
    OR (status = 'ended' AND ended_at IS NOT NULL AND ended_by IS NOT NULL)
  )
);
CREATE INDEX sessions_candidate ON public.sessions (candidate_id, started_at DESC);
CREATE UNIQUE INDEX sessions_one_live ON public.sessions (candidate_id, assessment_type) WHERE status = 'live';

CREATE TABLE public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  -- The engine's key (src/runner/engine.ts keyFor): "12", or "3:write" for stimulus → write.
  key text NOT NULL CHECK (key ~ '^[0-9]{1,3}(:(show|note|write))?$'),
  item integer NOT NULL CHECK (item >= 0),
  response_text text NOT NULL DEFAULT '' CHECK (length(response_text) <= 4000),
  -- Seam rule 1: never defaulted away. Paper answers arrive later as 'handwritten_ocr'.
  source text NOT NULL CHECK (source IN ('typed', 'handwritten_ocr')),
  final boolean NOT NULL DEFAULT false,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, key)
);

CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  response_id uuid REFERENCES public.responses (id) ON DELETE CASCADE,
  evaluator text NOT NULL CHECK (evaluator IN ('ai', 'human')),
  model text,
  olq_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  verdict jsonb,
  went_well text,
  focus_on text,
  tip text,
  confidence numeric CHECK (confidence BETWEEN 0 AND 1),
  input_tokens integer CHECK (input_tokens >= 0),
  output_tokens integer CHECK (output_tokens >= 0),
  cost_usd numeric NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evaluations_ai_names_model CHECK (evaluator = 'human' OR model IS NOT NULL)
);
CREATE INDEX evaluations_session ON public.evaluations (session_id);

-- Seam rule 2: exists from Sprint 1 although nothing writes it until uploads ship (D22).
CREATE TABLE public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  page_no smallint NOT NULL CHECK (page_no BETWEEN 1 AND 40),
  ocr_status text NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'done', 'failed')),
  ocr_provider text,
  ocr_text text,
  ocr_confidence numeric CHECK (ocr_confidence BETWEEN 0 AND 1),
  ocr_cost_usd numeric CHECK (ocr_cost_usd >= 0),
  candidate_corrected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, page_no)
);

-- ---------------------------------------------------------------------------
-- Private helpers for the policies.
-- SECURITY DEFINER so a policy can read profiles without recursing into
-- profiles' own policy; each pins search_path and qualifies every name.
-- ---------------------------------------------------------------------------

CREATE FUNCTION private.is_superadmin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'superadmin');
$$;

CREATE FUNCTION private.my_org() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

-- Self, a superadmin, or staff of the candidate's own academy.
CREATE FUNCTION private.can_view_person(p_person uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_person = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = (SELECT auth.uid())
        AND (
          me.role = 'superadmin'
          OR (me.role IN ('mentor', 'org_admin') AND me.org_id IS NOT NULL
              AND me.org_id = (SELECT them.org_id FROM public.profiles them WHERE them.id = p_person))
        )
    );
$$;

CREATE FUNCTION private.can_view_session(p_session uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = p_session AND private.can_view_person(s.candidate_id));
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

-- ---------------------------------------------------------------------------
-- Row level security. Read policies only: every write is a function below or
-- the service role. Table grants match — the anonymous role gets nothing, a
-- signed-in user gets SELECT and nothing else.
-- ---------------------------------------------------------------------------

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_timings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.organisations, public.profiles, public.batches, public.batch_members, public.instrument_timings,
  public.sessions, public.responses, public.evaluations, public.uploads FROM anon, authenticated;
GRANT SELECT ON public.organisations, public.profiles, public.batches, public.batch_members, public.instrument_timings,
  public.sessions, public.responses, public.evaluations, public.uploads TO authenticated;

CREATE POLICY organisations_read ON public.organisations FOR SELECT TO authenticated
  USING (id = (SELECT private.my_org()) OR (SELECT private.is_superadmin()));
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT private.can_view_person(id)));
CREATE POLICY batches_read ON public.batches FOR SELECT TO authenticated
  USING (org_id = (SELECT private.my_org()) OR (SELECT private.is_superadmin()));
CREATE POLICY batch_members_read ON public.batch_members FOR SELECT TO authenticated
  USING ((SELECT private.can_view_person(candidate_id)));
CREATE POLICY instrument_timings_read ON public.instrument_timings FOR SELECT TO authenticated USING (true);
CREATE POLICY sessions_read ON public.sessions FOR SELECT TO authenticated
  USING ((SELECT private.can_view_person(candidate_id)));
CREATE POLICY responses_read ON public.responses FOR SELECT TO authenticated
  USING ((SELECT private.can_view_session(session_id)));
CREATE POLICY evaluations_read ON public.evaluations FOR SELECT TO authenticated
  USING ((SELECT private.can_view_session(session_id)));
CREATE POLICY uploads_read ON public.uploads FOR SELECT TO authenticated
  USING ((SELECT private.can_view_session(session_id)));

-- ---------------------------------------------------------------------------
-- The only write paths for a signed-in user. Errors are stable codes the
-- client maps to copy: not_a_candidate, dob_required, consent_required,
-- unknown_instrument, session_live, not_your_session, session_ended,
-- paper_session, bad_key, too_long, item_not_open, item_closed, item_sealed,
-- not_expired, bad_ending.
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.start_session(p_assessment_type text, p_input_mode text DEFAULT 'typed', p_paper_code text DEFAULT NULL)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  t public.instrument_timings;
  s public.sessions;
  v_length interval;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = (SELECT auth.uid());
  IF NOT FOUND OR me.role <> 'candidate' THEN RAISE EXCEPTION 'not_a_candidate'; END IF;
  IF me.dob IS NULL THEN RAISE EXCEPTION 'dob_required'; END IF;
  IF date_part('year', age(current_date, me.dob)) < 18 AND me.guardian_consent_at IS NULL THEN
    RAISE EXCEPTION 'consent_required';
  END IF;

  SELECT * INTO t FROM public.instrument_timings WHERE assessment_type = p_assessment_type;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_instrument'; END IF;

  -- A session whose clock ran out while the candidate was away is over; record it so.
  UPDATE public.sessions SET status = 'ended', ended_at = expires_at, ended_by = 'expiry'
  WHERE candidate_id = me.id AND assessment_type = p_assessment_type AND status = 'live'
    AND expires_at < now() - interval '2 seconds';

  v_length := CASE t.mode
    WHEN 'forced_sequence' THEN make_interval(secs => t.item_count * t.seconds_per_item)
    ELSE make_interval(secs => t.time_limit_seconds)
  END;

  BEGIN
    INSERT INTO public.sessions (candidate_id, assessment_type, input_mode, paper_code, started_at, expires_at)
    VALUES (me.id, p_assessment_type, p_input_mode, p_paper_code, now(), now() + v_length)
    RETURNING * INTO s;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'session_live';
  END;
  RETURN s;
END $$;

CREATE FUNCTION public.save_response(p_session_id uuid, p_key text, p_text text, p_final boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  grace constant interval := interval '2 seconds';
  s public.sessions;
  t public.instrument_timings;
  v_item integer;
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
  IF v_item >= t.item_count THEN RAISE EXCEPTION 'bad_key'; END IF;

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

CREATE FUNCTION public.end_session(p_session_id uuid, p_ended_by text)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.sessions;
BEGIN
  IF p_ended_by NOT IN ('submit', 'expiry', 'abandon') THEN RAISE EXCEPTION 'bad_ending'; END IF;
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR s.candidate_id <> (SELECT auth.uid()) THEN RAISE EXCEPTION 'not_your_session'; END IF;
  IF s.status <> 'live' THEN RAISE EXCEPTION 'session_ended'; END IF;
  IF p_ended_by = 'expiry' AND now() < s.expires_at - interval '2 seconds' THEN RAISE EXCEPTION 'not_expired'; END IF;

  UPDATE public.sessions SET status = 'ended', ended_at = now(), ended_by = p_ended_by
  WHERE id = s.id RETURNING * INTO s;
  RETURN s;
END $$;

REVOKE ALL ON FUNCTION public.start_session(text, text, text), public.save_response(uuid, text, text, boolean),
  public.end_session(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_session(text, text, text), public.save_response(uuid, text, text, boolean),
  public.end_session(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Answer-sheet scans (D22). No storage policies: signed links only.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('answer-sheets', 'answer-sheets', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
