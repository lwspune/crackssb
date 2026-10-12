-- 0004_create_academy.sql — 2026-10-12. Only a superadmin creates an academy;
-- the rule is here, so the /admin page holds no privilege of its own.
-- people.db.test.ts: the superadmin can, an academy owner, mentor or
-- candidate cannot, and a taken short name is refused.

CREATE FUNCTION public.create_academy(p_name text, p_slug text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'superadmin') THEN
    RAISE EXCEPTION 'not_superadmin';
  END IF;
  BEGIN
    INSERT INTO public.organisations (name, slug, type) VALUES (btrim(p_name), p_slug, 'academy') RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'slug_taken';
  END;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.create_academy(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_academy(text, text) TO authenticated;
