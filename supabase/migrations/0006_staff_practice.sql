-- 0006_staff_practice.sql — 2026-10-12. Layered access (D25).
--
-- Staff and the superadmin can open the student app and take tests as
-- themselves, to experience what candidates do. Their sessions are flagged
-- `by_staff`, set HERE from the caller's role — never by the caller — so
-- student results and item statistics (D19) leave them out.
--
-- Unchanged for everyone: the server clock, the answer windows, one live
-- session per test. Unchanged for candidates: a date of birth is required and
-- an under-18 needs recorded guardian consent. Staff are adults on the
-- platform's side; neither check applies to them.
--
-- access.db.test.ts: a mentor and the superadmin can start a WAT, flagged;
-- a candidate's session is not; a candidate cannot set the flag.

ALTER TABLE public.sessions ADD COLUMN by_staff boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.start_session(p_assessment_type text, p_input_mode text DEFAULT 'typed', p_paper_code text DEFAULT NULL)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  t public.instrument_timings;
  s public.sessions;
  v_length interval;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = (SELECT auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'not_a_candidate'; END IF;
  IF me.role = 'candidate' THEN
    IF me.dob IS NULL THEN RAISE EXCEPTION 'dob_required'; END IF;
    IF date_part('year', age(current_date, me.dob)) < 18 AND me.guardian_consent_at IS NULL THEN
      RAISE EXCEPTION 'consent_required';
    END IF;
  END IF;

  SELECT * INTO t FROM public.instrument_timings WHERE assessment_type = p_assessment_type;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_instrument'; END IF;

  UPDATE public.sessions SET status = 'ended', ended_at = expires_at, ended_by = 'expiry'
  WHERE candidate_id = me.id AND assessment_type = p_assessment_type AND status = 'live'
    AND expires_at < now() - interval '2 seconds';

  v_length := CASE t.mode
    WHEN 'forced_sequence' THEN make_interval(secs => t.item_count * t.seconds_per_item)
    ELSE make_interval(secs => t.time_limit_seconds)
  END;

  BEGIN
    INSERT INTO public.sessions (candidate_id, assessment_type, input_mode, paper_code, started_at, expires_at, by_staff)
    VALUES (me.id, p_assessment_type, p_input_mode, p_paper_code, now(), now() + v_length, me.role <> 'candidate')
    RETURNING * INTO s;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'session_live';
  END;
  RETURN s;
END $$;
