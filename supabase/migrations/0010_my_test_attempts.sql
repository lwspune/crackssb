-- 0010_my_test_attempts.sql — 2026-10-18. The caller's own OIR mock attempts,
-- for the mock list and Results (D32).
--
-- One row per attempt: which mock, when, whether it is over (submitted, or
-- past its deadline), how many questions were answered, and — only once it is
-- over — how many were right. A running attempt gets no score: counting
-- correct answers mid-test would let anyone find a key by changing one answer
-- and watching the count. Keys stay unreadable (0005); this reads them only
-- to count, and only for attempts that are over.
--
-- Own attempts only, staff included (their staff attempts are flagged
-- by_staff, D25). An academy's view of its candidates comes later (D32).
-- mocks.db.test.ts is the gate.

CREATE FUNCTION public.my_test_attempts()
RETURNS TABLE (session_id uuid, test_id text, started_at timestamptz, ended_at timestamptz, over boolean, answered integer, correct integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH mine AS (
    SELECT s.*, (s.status = 'ended' OR now() > s.expires_at + interval '2 seconds') AS is_over
    FROM public.sessions s
    WHERE s.candidate_id = (SELECT auth.uid())
      AND s.test_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.deactivated_at IS NULL)
  )
  SELECT
    m.id,
    m.test_id,
    m.started_at,
    CASE WHEN m.status = 'ended' THEN m.ended_at WHEN m.is_over THEN m.expires_at END,
    m.is_over,
    (SELECT count(*) FROM public.responses r WHERE r.session_id = m.id AND r.response_text <> '')::integer,
    CASE WHEN m.is_over THEN (
      SELECT count(*)
      FROM public.test_items ti
      JOIN public.item_keys k ON k.item_id = ti.item_id
      JOIN public.responses r ON r.session_id = m.id AND r.key = ti.ordinal::text AND r.response_text = k.key
      WHERE ti.test_id = m.test_id
    )::integer END
  FROM mine m
  ORDER BY m.started_at DESC;
$$;

REVOKE ALL ON FUNCTION public.my_test_attempts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_test_attempts() TO authenticated;
