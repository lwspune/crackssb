-- 0016_optional_dob.sql — 2026-10-19. A date of birth is optional (D37).
--
-- Left blank, it is simply not known, and the candidate sits tests as an
-- adult would; the owner's call. A known under-18 still needs a guardian's
-- consent first. Every way into a test makes the same check, so each is
-- re-created here with only that check changed: start_session (0006),
-- answer_practice (0007), start_test (0009), start_ppdt (0012). update_person
-- (0008) no longer refuses a blank date of birth. dob_required is no longer raised.
--
-- dob.db.test.ts and manage.db.test.ts are the gate.

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
  -- A date of birth is optional (D37): only a known under-18 needs a guardian's consent.
  IF me.role = 'candidate' AND me.dob IS NOT NULL
     AND date_part('year', age(current_date, me.dob)) < 18 AND me.guardian_consent_at IS NULL THEN
    RAISE EXCEPTION 'consent_required';
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

CREATE OR REPLACE FUNCTION public.answer_practice(p_item_id text, p_chosen text)
RETURNS TABLE (correct boolean, key text, rule text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  v_chosen text := upper(coalesce(p_chosen, ''));
  v_key text;
  v_rule text;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = (SELECT auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'not_a_candidate'; END IF;
  -- A date of birth is optional (D37): only a known under-18 needs a guardian's consent.
  IF me.role = 'candidate' AND me.dob IS NOT NULL
     AND date_part('year', age(current_date, me.dob)) < 18 AND me.guardian_consent_at IS NULL THEN
    RAISE EXCEPTION 'consent_required';
  END IF;

  IF v_chosen NOT IN ('A', 'B', 'C', 'D') THEN RAISE EXCEPTION 'bad_choice'; END IF;

  -- Only an active, keyed multiple-choice item can be practised.
  SELECT k.key, k.rule INTO v_key, v_rule
  FROM public.items i JOIN public.item_keys k ON k.item_id = i.id
  WHERE i.id = p_item_id AND i.active AND i.assessment_type IN ('oir_verbal', 'oir_nonverbal');
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_item'; END IF;

  INSERT INTO public.practice_answers (candidate_id, item_id, chosen, correct, by_staff)
  VALUES (me.id, p_item_id, v_chosen, v_chosen = v_key, me.role <> 'candidate');

  RETURN QUERY SELECT v_chosen = v_key, v_key, v_rule;
END $$;

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

CREATE OR REPLACE FUNCTION public.start_ppdt(p_item_id text, p_input_mode text DEFAULT 'typed', p_paper_code text DEFAULT NULL)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  t public.instrument_timings;
  s public.sessions;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = (SELECT auth.uid());
  IF NOT FOUND OR me.deactivated_at IS NOT NULL THEN RAISE EXCEPTION 'not_a_candidate'; END IF;
  -- A date of birth is optional (D37): only a known under-18 needs a guardian's consent.
  IF me.role = 'candidate' AND me.dob IS NOT NULL
     AND date_part('year', age(current_date, me.dob)) < 18 AND me.guardian_consent_at IS NULL THEN
    RAISE EXCEPTION 'consent_required';
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

CREATE OR REPLACE FUNCTION public.update_person(p_target uuid, p_full_name text, p_dob date, p_phone text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.can_manage_person(p_target, 'edit') THEN RAISE EXCEPTION 'not_allowed'; END IF;
  UPDATE public.profiles SET full_name = btrim(p_full_name), dob = p_dob, phone = p_phone WHERE id = p_target;
END $$;
