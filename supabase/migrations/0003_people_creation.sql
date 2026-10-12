-- 0003_people_creation.sql — 2026-10-12. Staff create logins in the app.
--
-- WHO MAY CREATE WHOM is decided here, by can_create_person(), which the
-- server calls AS THE SIGNED-IN USER before it touches the service role:
--   superadmin  → anyone; staff need an academy, a superadmin has none
--   org_admin   → candidates and mentors, in their own academy only
--   mentor      → candidates, in their own academy only
--   candidate   → no one
-- src/db/__tests__/people.db.test.ts runs the whole matrix.
--
-- profiles.email is a copy of the login's email, written once by the service
-- role at creation, so staff can list their people under row level security
-- (auth.users is not readable through the API). created_by and
-- guardian_consent_recorded_by say who did it — an audit, not a permission.

ALTER TABLE public.profiles
  ADD COLUMN email text,
  ADD COLUMN created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN guardian_consent_recorded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

UPDATE public.profiles p SET email = lower(u.email) FROM auth.users u WHERE u.id = p.id;

ALTER TABLE public.profiles
  ALTER COLUMN email SET NOT NULL,
  ADD CONSTRAINT profiles_email_shape CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254);

CREATE UNIQUE INDEX profiles_email ON public.profiles (email);
CREATE INDEX profiles_created_by ON public.profiles (created_by);
CREATE INDEX profiles_consent_recorded_by ON public.profiles (guardian_consent_recorded_by);

CREATE FUNCTION public.can_create_person(p_role public.app_role, p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE((
    SELECT CASE me.role
      WHEN 'superadmin' THEN
        CASE
          WHEN p_role IN ('mentor', 'org_admin') THEN p_org IS NOT NULL
          WHEN p_role = 'superadmin' THEN p_org IS NULL
          ELSE true
        END
      WHEN 'org_admin' THEN p_role IN ('candidate', 'mentor') AND p_org IS NOT NULL AND p_org = me.org_id
      WHEN 'mentor' THEN p_role = 'candidate' AND p_org IS NOT NULL AND p_org = me.org_id
      ELSE false
    END
    FROM public.profiles me
    WHERE me.id = (SELECT auth.uid())
  ), false);
$$;

REVOKE ALL ON FUNCTION public.can_create_person(public.app_role, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_create_person(public.app_role, uuid) TO authenticated;
