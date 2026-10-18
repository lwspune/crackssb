-- 0008_manage_people.sql — 2026-10-18. Staff manage the people they can add (D31).
--
-- WHO MAY MANAGE WHOM is decided here, by can_manage_person(target, action),
-- which the server calls AS THE SIGNED-IN USER before it touches the service
-- role — the 0003 pattern. It mirrors who may create whom:
--   superadmin  → anyone but a superadmin: edit, password, deactivate, delete;
--                 and role (mentor ↔ academy owner)
--   org_admin   → candidates and mentors in their own academy: edit, password, deactivate, delete
--   mentor      → candidates in their own academy: edit, password
--   candidate   → no one
-- Nobody manages themselves here (their own password is changed through the
-- auth server, with the current one). 'delete' also needs the login unused:
-- never signed in, no sessions, no practice — how a mistyped email is undone.
-- src/db/__tests__/manage.db.test.ts runs the whole matrix.
--
-- A SWITCHED-OFF login (deactivated_at) is refused by the database itself:
-- the private helpers below give it no rows, and can_create_person and
-- can_manage_person say no. The server also bans it at the auth server, which
-- stops sign-in; this covers the token it already holds.
--
-- phone is optional, one shape only: `+` and digits (src/lib/phone.ts makes
-- it), which is what a WhatsApp link needs.

ALTER TABLE public.profiles
  ADD COLUMN phone text CONSTRAINT profiles_phone_shape CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  ADD COLUMN deactivated_at timestamptz,
  ADD COLUMN deactivated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD CONSTRAINT profiles_deactivated_by_needs_at CHECK (deactivated_by IS NULL OR deactivated_at IS NOT NULL);

CREATE INDEX profiles_deactivated_by ON public.profiles (deactivated_by);

-- ---------------------------------------------------------------------------
-- A switched-off caller reads nothing. Same signatures as 0001, so every
-- policy that uses them picks this up; grants are kept by OR REPLACE.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.is_superadmin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'superadmin' AND deactivated_at IS NULL);
$$;

CREATE OR REPLACE FUNCTION private.my_org() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT org_id FROM public.profiles WHERE id = (SELECT auth.uid()) AND deactivated_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION private.can_view_person(p_person uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = (SELECT auth.uid())
      AND me.deactivated_at IS NULL
      AND (
        p_person = me.id
        OR me.role = 'superadmin'
        OR (me.role IN ('mentor', 'org_admin') AND me.org_id IS NOT NULL
            AND me.org_id = (SELECT them.org_id FROM public.profiles them WHERE them.id = p_person))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_create_person(p_role public.app_role, p_org uuid)
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
    WHERE me.id = (SELECT auth.uid()) AND me.deactivated_at IS NULL
  ), false);
$$;

-- ---------------------------------------------------------------------------
-- The rule.
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.can_manage_person(p_target uuid, p_action text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me public.profiles;
  them public.profiles;
  same_academy boolean;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = (SELECT auth.uid());
  SELECT * INTO them FROM public.profiles WHERE id = p_target;
  IF me.id IS NULL OR them.id IS NULL OR me.id = them.id OR me.deactivated_at IS NOT NULL OR them.role = 'superadmin' THEN
    RETURN false;
  END IF;

  IF p_action = 'role' THEN
    RETURN me.role = 'superadmin' AND them.role IN ('mentor', 'org_admin');
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('edit', 'password', 'deactivate', 'delete') THEN
    RETURN false;
  END IF;

  same_academy := me.org_id IS NOT NULL AND them.org_id IS NOT NULL AND me.org_id = them.org_id;
  IF NOT (
    me.role = 'superadmin'
    OR (me.role = 'org_admin' AND same_academy AND them.role IN ('candidate', 'mentor'))
    OR (me.role = 'mentor' AND same_academy AND them.role = 'candidate' AND p_action IN ('edit', 'password'))
  ) THEN
    RETURN false;
  END IF;

  IF p_action = 'delete' THEN
    RETURN NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = them.id AND u.last_sign_in_at IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM public.sessions s WHERE s.candidate_id = them.id)
      AND NOT EXISTS (SELECT 1 FROM public.practice_answers a WHERE a.candidate_id = them.id);
  END IF;
  RETURN true;
END $$;

-- ---------------------------------------------------------------------------
-- The profile writes, made as the caller. The login itself (password, ban,
-- removal) is the service role's, after can_manage_person says yes.
-- Errors are stable codes: not_allowed, dob_required.
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.update_person(p_target uuid, p_full_name text, p_dob date, p_phone text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.can_manage_person(p_target, 'edit') THEN RAISE EXCEPTION 'not_allowed'; END IF;
  IF p_dob IS NULL AND (SELECT role FROM public.profiles WHERE id = p_target) = 'candidate' THEN
    RAISE EXCEPTION 'dob_required';
  END IF;
  UPDATE public.profiles SET full_name = btrim(p_full_name), dob = p_dob, phone = p_phone WHERE id = p_target;
END $$;

CREATE FUNCTION public.record_guardian_consent(p_target uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.can_manage_person(p_target, 'edit') THEN RAISE EXCEPTION 'not_allowed'; END IF;
  UPDATE public.profiles
    SET guardian_consent_at = now(), guardian_consent_recorded_by = (SELECT auth.uid())
    WHERE id = p_target AND role = 'candidate' AND guardian_consent_at IS NULL;
END $$;

CREATE FUNCTION public.set_person_role(p_target uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_role NOT IN ('mentor', 'org_admin') OR NOT public.can_manage_person(p_target, 'role') THEN RAISE EXCEPTION 'not_allowed'; END IF;
  UPDATE public.profiles SET role = p_role WHERE id = p_target;
END $$;

CREATE FUNCTION public.set_person_active(p_target uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_active IS NULL OR NOT public.can_manage_person(p_target, 'deactivate') THEN RAISE EXCEPTION 'not_allowed'; END IF;
  IF p_active THEN
    UPDATE public.profiles SET deactivated_at = NULL, deactivated_by = NULL WHERE id = p_target;
  ELSE
    UPDATE public.profiles SET deactivated_at = now(), deactivated_by = (SELECT auth.uid())
      WHERE id = p_target AND deactivated_at IS NULL;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.can_manage_person(uuid, text), public.update_person(uuid, text, date, text),
  public.record_guardian_consent(uuid), public.set_person_role(uuid, public.app_role), public.set_person_active(uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_person(uuid, text), public.update_person(uuid, text, date, text),
  public.record_guardian_consent(uuid), public.set_person_role(uuid, public.app_role), public.set_person_active(uuid, boolean)
  TO authenticated;
