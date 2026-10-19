-- 0021_google_profile_on_update.sql — 2026-10-19. The Google profile trigger (0020) also fires on an update (D42).
--
-- The auth server may write app_metadata after the user row is inserted (the admin API does: the row goes in
-- as `email`, and `google` follows as an update). So the profile is made the first time the user reads as a
-- Google user, insert or update, and only if they have none: a login staff made that later links Google keeps
-- its profile exactly as it is.
-- signup.db.test.ts is the gate.

CREATE OR REPLACE FUNCTION private.profile_for_google() RETURNS trigger
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
    'google')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER profile_for_google ON auth.users;
CREATE TRIGGER profile_for_google AFTER INSERT OR UPDATE OF raw_app_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.profile_for_google();
