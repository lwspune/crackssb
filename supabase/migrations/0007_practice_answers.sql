-- 0007_practice_answers.sql — 2026-10-12. Chapter practice (D26).
--
-- Untimed practice on the OIR bank, one question at a time: the candidate
-- answers, and only then is told the key and the rule behind it. Every answer
-- is kept, so progress survives and "retry the ones I got wrong" works.
--
--   practice_answers   one row per answer, retries included. Read as sessions
--                      are: yourself, your academy's staff, the superadmin.
--   answer_practice    the only write path, and the only way a signed-in user
--                      ever sees a key — for the one item just answered.
--
-- Not a session: practice has no clock and shows correctness at once, which
-- the Booklet contract forbids for a test (UI.md §3.1). So these answers never
-- feed item statistics as sittings (D19). `by_staff` is set here from the
-- caller's role, as on sessions (0006, D25).
--
-- The consent rule is start_session's: an under-18 candidate needs recorded
-- guardian consent before anything they answer is stored.
--
-- practice.db.test.ts is the gate.

CREATE TABLE public.practice_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  item_id text NOT NULL REFERENCES public.items (id) ON DELETE CASCADE,
  chosen text NOT NULL CHECK (chosen IN ('A', 'B', 'C', 'D')),
  correct boolean NOT NULL,
  by_staff boolean NOT NULL DEFAULT false,
  answered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX practice_answers_candidate ON public.practice_answers (candidate_id, item_id, answered_at DESC);
CREATE INDEX practice_answers_item ON public.practice_answers (item_id);

ALTER TABLE public.practice_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.practice_answers FROM anon, authenticated;
GRANT SELECT ON public.practice_answers TO authenticated;
CREATE POLICY practice_answers_read ON public.practice_answers FOR SELECT TO authenticated
  USING ((SELECT private.can_view_person(candidate_id)));

-- Errors: not_a_candidate, dob_required, consent_required, bad_choice, unknown_item.
CREATE FUNCTION public.answer_practice(p_item_id text, p_chosen text)
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
  IF me.role = 'candidate' THEN
    IF me.dob IS NULL THEN RAISE EXCEPTION 'dob_required'; END IF;
    IF date_part('year', age(current_date, me.dob)) < 18 AND me.guardian_consent_at IS NULL THEN
      RAISE EXCEPTION 'consent_required';
    END IF;
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

REVOKE ALL ON FUNCTION public.answer_practice(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_practice(text, text) TO authenticated;
