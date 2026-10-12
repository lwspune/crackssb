# CrackSSB — Roadmap

> Captured 2026-09-19, before any code. Planning artifact, not a contract — revisit when a foundation assumption changes.
>
> **Companion docs:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) — schema, OLQ vector, edge function contracts, seam rules. [`DECISIONS.md`](./DECISIONS.md) — the *why* trail. [`UI.md`](./UI.md) — roles, runner modes, information architecture.

---

## Phase map

| Phase | Scope | Why here |
|---|---|---|
| **0** | PIQ builder, OIR engine, PPDT (typed), medical self-check, OLQ vector v1, mentor review queue | Lowest AI risk, highest certainty, and it targets the gate 65%+ of candidates fail |
| **1** | Full psych suite (TAT, WAT, SRT, SDT) + cross-instrument **consistency engine** | The core differentiator |
| **2** | Lecturette + AI voice interviewer | Direct reuse of the [`English_AI_Tutor`](../English_AI_Tutor/) audio pipeline |
| **3** | Live cohort rooms: GD, PPDT narration, GPE | Hardest operationally (scheduling), so it follows proven value |
| **4** | GTO theory, fitness tracking, conference mock, mentor marketplace, full B2B tenancy | Reuses the [`nda-tracker`](../nda-tracker/) institute model |
| **X** | OCR bake-off + handwriting pipeline | Deferred — slots in whenever the sample corpus exists. See [D3](./DECISIONS.md) |

---

## Phase 0 — sprint order

Test-first throughout: no implementation before a test exists and fails for the right reason.

| Sprint | Deliverable | Gate |
|---|---|---|
| **1** | Next.js scaffold, Supabase auth, tenancy, RLS on every table, `README.md` | RLS test suite: a candidate cannot read another candidate's responses |
| **2** | OIR engine — item bank, booklet assembly, forced timing, `score-oir`, item stats | A full timed mock runs end to end |
| **3** | PIQ builder, `validate-piq`, `generate-piq-questions`, **LLM provider adapter + eval** | Flags fire on a deliberately weak PIQ; provider chosen on measured agreement ([D5](./DECISIONS.md)) |
| **4** | PPDT typed mode — image serve, 30s/1min/4min forced timing, `evaluate-ppdt`, OLQ vector v1 | Entitlement map enforced; canned-response detection verified against templated samples |
| **5** | Candidate dashboard — OLQ profile, session history, `medical-screen` | — |
| **6** | Academy views (batch rollups), mentor review queue, Definition-of-Done pass | Lint passes, tests pass, golden path verified in browser at 375px |

**Sprint 1 also lands the four seam rules** from [`ARCHITECTURE.md`](./ARCHITECTURE.md) section 6. They are the reason Sprint X can be deferred at no cost.

**Mentor review queue ships in Sprint 6**, not Phase 4. Human-in-the-loop is both the quality-control mechanism and the premium tier, and it is nearly free once `evaluations.evaluator` already supports `'human'`.

---

## Sprint X — the deferred OCR work

Blocked only on sample data. Everything else in Phase 0 runs without it.

**Task zero is a bake-off, not a build.** Compare on roughly 40 real sheets:

| Path | Trade-off |
|---|---|
| Google Cloud Vision (`DOCUMENT_TEXT_DETECTION`) | Purpose-built for handwriting; separate OCR and scoring stages; cheap (~$0.0015/page) |
| Azure AI Document Intelligence (read model) | Comparable; better on structured/boxed layouts (WAT and SRT sheets are ruled grids) |
| Vision LLM, one pass (OCR + score together) | Removes a pipeline stage and tolerates noise because the model reads intent; harder to show the candidate what was read |

**Decision rule, fixed before the run:** word error rate, and — weighted higher — *does the scoring verdict change* versus a ground-truth human transcription. OCR that misreads 8% of words but produces the same OLQ verdict is acceptable. OCR that is 97% accurate but drops a negation is not.

**Where the corpus comes from.** Once PPDT typed mode ships in Sprint 4, an optional *"also photograph your sheet"* step writes to `uploads` with `ocr_status = 'pending'` and does no processing at all. That yields messy, genuinely time-pressured handwriting paired with the candidate's own typed transcription as ground truth — a better bake-off dataset than anything assembled by hand, accumulating while the rest gets built. See [D7](./DECISIONS.md).

**Open trade-off, to be settled with data:** if the one-pass vision route wins on accuracy, it costs the candidate-correction UI. Current lean is to keep the correction step regardless — it is both a safeguard and a label source — but that is a decision for the bake-off, not for now.

---

## Dependencies and blockers

| # | Item | Blocks | Status |
|---|---|---|---|
| 1 | Supabase project + Vercel account | Sprint 1 | **Open** |
| 2 | OIR item source decision — author in-house, license, or seed ~150/type and grow | Sprint 2 | **Closed 2026-10-12** — a published book, verbatim, keys derived until the book's key is checked ([D24](./DECISIONS.md)). All eleven chapters seeded: 1,068 verbal items (82 held), open for untimed chapter practice ([D26](./DECISIONS.md)); timed mocks now unblocked; non-verbal still open |
| 3 | Domain validator (ex-GTO / IO / SSB psychologist) to rate a sample set | Sprint 3 eval, and launch credibility | **Open** |
| 4 | LLM API key, provider per [D5](./DECISIONS.md) | Sprint 3 | Not yet needed |
| 5 | Handwriting sample corpus | Sprint X only | Self-harvesting from paper-mode uploads once storage exists ([D22](./DECISIONS.md)) |
| 6 | B2B design partner confirmation (LWS Pune?) | Sprint 6 — real vs. stubbed | **Open** |
| 7 | Brand + domain | Launch | **Open** |

Item 3 does double duty: the validator's ratings are simultaneously the OLQ rubric validation *and* the eval ground truth for provider selection. Same work, two outputs — worth lining up earlier than its sprint position suggests.

---

## The content lift

The schedule risk that is easy to under-budget. Phase 0 needs roughly:

- **400 verbal + 400 non-verbal OIR items** — non-verbal requires figure assets. Unsolved, and likely the longest pole in Phase 0. Authoring this is probably longer than writing the code.
- **40–60 ambiguous PPDT images** — solved. AI-generated, which is legally clean (no scraped SSB slides, see [D8](./DECISIONS.md)) and makes ambiguity a tunable difficulty parameter.

---

## Cost model

Not a constraint at Phase 0 volumes, but tracked per session from day one, following [`costUtils.js`](../English_AI_Tutor/src/lib/costUtils.js).

Indicative: a PPDT evaluation runs roughly 2k input + 800 output tokens. Even on a premium model that is around **$0.012**, and Phase 1's twelve TAT stories land near $0.15 per candidate. Prompt caching (the rubric is byte-identical every call) and batch submission (scoring is not latency-sensitive) both apply and cut it further.

**Cost is not what should decide the provider. Agreement with expert ratings is.** See [D5](./DECISIONS.md).

---

## Deliberately not building

Recorded so these do not get re-litigated each planning session.

- **Simulated GTO physical tasks** (PGT, HGT, FGT, Command Task, Individual Obstacles, Snake Race). Physical and group-dynamic. We teach rules of ground, solution design and fitness prep, and say plainly that it is preparation, not simulation.
- **Recommendation prediction.** We never output "you would be recommended." Not defensible, and it invites exactly the wrong candidate behaviour.
- **Ideal-answer libraries** (model TAT stories, WAT response banks). Templated responses are a leading reason prepared candidates are rejected. We detect them; we do not sell them. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) section 9.
- **Leaderboards.** Same reasoning as [`English_AI_Tutor/CLAUDE.md`](../English_AI_Tutor/CLAUDE.md) — they demotivate the bottom half of a known-peer cohort.

---

## Open questions

Not blocking, but they will need answers before the phase they touch.

1. **Cohort scheduling** (Phase 3) — how do 8–15 candidates in different time zones and batches get matched into a live GD room? This is the hardest operational problem in the roadmap and has no design yet.
2. **Mentor supply** (Phase 4) — a marketplace needs ex-assessors. Sourcing and vetting is a business problem, not a technical one.
3. **Entry-type expansion** — CDS, AFCAT and TES change PIQ fields and every medical rule. Schema is ready; content is not.
4. **Retention policy specifics** — how long do we keep psych responses, and what does candidate-initiated deletion do to `olq_snapshots` and academy batch rollups?
