-- 0011_tests_fk_index.sql — 2026-10-18. The one foreign key 0009 left unindexed
-- (tests.assessment_type → instrument_timings). access.db.test.ts requires an
-- index on every foreign key, so cascades and joins never scan.

CREATE INDEX tests_assessment_type ON public.tests (assessment_type);
