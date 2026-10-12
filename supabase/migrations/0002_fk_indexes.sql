-- 0002_fk_indexes.sql — 2026-10-12.
--
-- The performance advisor found two foreign keys without a covering index
-- after 0001. Both are indexed here, and a probe makes the rule permanent:
-- src/db/__tests__/access.db.test.ts calls unindexed_foreign_keys() and fails
-- on any row, so a future migration cannot reintroduce the gap.

CREATE INDEX evaluations_response ON public.evaluations (response_id);
CREATE INDEX sessions_assessment_type ON public.sessions (assessment_type);

-- Foreign keys in `public` whose columns are not the leading columns of some index.
CREATE FUNCTION public.unindexed_foreign_keys()
RETURNS TABLE (table_name text, constraint_name text)
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT c.conrelid::regclass::text, c.conname::text
  FROM pg_catalog.pg_constraint c
  WHERE c.contype = 'f'
    AND c.connamespace = 'public'::regnamespace
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_index i
      WHERE i.indrelid = c.conrelid
        AND (SELECT array_agg(k ORDER BY k) FROM unnest((i.indkey::int2[])[0:cardinality(c.conkey) - 1]) k)
          = (SELECT array_agg(k ORDER BY k) FROM unnest(c.conkey) k)
    )
  ORDER BY 1, 2;
$$;

-- A probe for tests and operators, not for the app.
REVOKE ALL ON FUNCTION public.unindexed_foreign_keys() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unindexed_foreign_keys() TO service_role;
