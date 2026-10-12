-- 0005_items.sql — 2026-10-12. The item bank (ARCHITECTURE.md §4) and its
-- answer keys, in two tables so the rule about who reads what is one GRANT.
--
--   items       the question: stem, options, direction. Any signed-in user
--               reads active items (decided 2026-10-12: the bank is open to
--               every account, as PYQ Vault's is to its readers).
--   item_keys   the answer. No grant and no policy: only the service role
--               reads it, so a candidate cannot look up the key mid-test.
--               Booklets go out keyless already (src/items/bank.ts
--               assembleBooklet); this makes the database agree.
--
-- An item may never carry its key in `payload` (CHECK below): src/items/oir/
-- check.ts splitKey moves it out before any write, and this is the backstop.
--
-- key_basis records where a key came from: 'derived' (worked out here),
-- 'book' (the source's printed key), 'derived_and_book' (both, and they agree).
-- A disagreement is resolved before the row says 'derived_and_book'.
--
-- item_stats (sitting grain, D19) waits until there are sittings to measure.
-- items.db.test.ts is the gate.

CREATE TABLE public.items (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  assessment_type text NOT NULL CHECK (assessment_type IN ('oir_verbal', 'oir_nonverbal', 'ppdt', 'tat', 'wat', 'srt', 'sdt')),
  difficulty smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  payload jsonb NOT NULL CONSTRAINT items_payload_keyless CHECK (jsonb_typeof(payload) = 'object' AND NOT (payload ? 'key')),
  asset_path text,
  active boolean NOT NULL DEFAULT true,
  source text NOT NULL CHECK (length(source) > 0),
  -- Where in the source: 'ch11 p41 q13'. Free text; the source decides its own scheme.
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX items_active_by_type ON public.items (assessment_type) WHERE active;

CREATE TABLE public.item_keys (
  item_id text PRIMARY KEY REFERENCES public.items (id) ON DELETE CASCADE,
  key text NOT NULL CHECK (key IN ('A', 'B', 'C', 'D')),
  key_basis text NOT NULL CHECK (key_basis IN ('derived', 'book', 'derived_and_book')),
  -- The rule in words, so a disputed key can be argued with.
  rule text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_keys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.items, public.item_keys FROM anon, authenticated;
GRANT SELECT ON public.items TO authenticated;

CREATE POLICY items_read ON public.items FOR SELECT TO authenticated USING (active);
