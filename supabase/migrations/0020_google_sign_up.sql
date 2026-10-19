-- 0020_google_sign_up.sql — 2026-10-19. Students sign up with Google (D42).
--
--   profiles.joined_via          'staff' (made by staff or the script, every profile until now) or 'google'.
--                                Written once, here or by insertAccount; no write path changes it.
--   private.before_user_created  the auth server's Before User Created hook. Lets through a Google sign-up
--                                and a login staff made (app_metadata.joined_via = 'staff': only the service
--                                role can write app_metadata). Refuses every other sign-up, above all an
--                                email and password from the public key.
--   private.profile_for_google   a new Google user becomes a candidate with no academy (solo, B2C), named as
--                                Google names them. No date of birth: they sit tests as adults (D37, D42).
--
-- The hook is switched on in the auth settings (hook_before_user_created_*), not here.
-- signup.db.test.ts is the gate.

ALTER TABLE public.profiles
  ADD COLUMN joined_via text NOT NULL DEFAULT 'staff' CONSTRAINT profiles_joined_via CHECK (joined_via IN ('staff', 'google'));

CREATE FUNCTION private.before_user_created(event jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  IF event->'user'->'app_metadata'->>'provider' = 'google'
     OR event->'user'->'app_metadata'->>'joined_via' = 'staff' THEN
    RETURN '{}'::jsonb;
  END IF;
  RETURN jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Sign up with Google, or ask your academy for a login.'));
END $$;

REVOKE EXECUTE ON FUNCTION private.before_user_created(jsonb) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION private.before_user_created(jsonb) TO supabase_auth_admin;

CREATE FUNCTION private.profile_for_google() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.raw_app_meta_data->>'provider' IS DISTINCT FROM 'google' THEN RETURN NEW; END IF;
  INSERT INTO public.profiles (id, email, role, org_id, full_name, joined_via)
  VALUES (
    NEW.id,
    lower(NEW.email),
    'candidate',
    NULL,
    left(coalesce(
      nullif(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(NEW.raw_user_meta_data->>'name'), ''),
      nullif(split_part(NEW.email, '@', 1), ''),
      'Student'), 120),
    'google');
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION private.profile_for_google() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profile_for_google AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.profile_for_google();
