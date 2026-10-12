# CrackSSB — Architecture

> **Status:** Pre-implementation. This document describes the *intended* architecture, agreed 2026-09-19, before Sprint 1. It becomes narrative onboarding (with a code map) once code exists.
>
> **Companion docs:** [`ROADMAP.md`](./ROADMAP.md) — phases, sprint order, gates, blockers. [`DECISIONS.md`](./DECISIONS.md) — the long-form *why* trail. [`UI.md`](./UI.md) — roles, runner modes, information architecture.

---

## 1. What CrackSSB is

An online portal for **SSB (Services Selection Board)** preparation — the 5-day officer-selection process for the Indian Armed Forces (NDA, CDS, AFCAT, TES, NCC Special Entry, TGC, SSC Tech, INET).

Two audiences from day one:

- **B2C** — individual candidates preparing for a board date.
- **B2B** — coaching academies running batches, with mentor and org-admin roles.

**Launch entry type: NDA.** The schema is multi-entry throughout; only content and medical rules are NDA-specific at launch.

---

## 2. The process we are modelling

Three assessors — **Psychologist**, **GTO**, **Interviewing Officer** — score the same candidate independently against 15 Officer Like Qualities, then reconcile in Conference. Roughly 25–35% of candidates clear Day 1 screening; about 5% of those reporting are finally recommended.

| Stage | Components | Our coverage |
|---|---|---|
| **Screening (Day 1)** | OIR (verbal + non-verbal), PPDT (picture 30s, 1 min perception, 4 min story), PPDT narration + group discussion | OIR and PPDT written portion: **Phase 0**. Narration/GD: Phase 3 (live cohort) |
| **Psychology (Day 2 am)** | TAT (12 slides, 30s/4min), WAT (60 words, 15s each), SRT (60 situations, 30 min), SDT (5 paragraphs, 15 min) | **Phase 1** |
| **GTO (Days 2–3)** | GD x2, GPE, PGT, HGT, Lecturette, IO (10 obstacles / 3 min), Command Task, Snake Race, FGT | GPE + GD: Phase 3. Lecturette: Phase 2. Physical tasks: theory only, Phase 4 |
| **Interview** | PIQ-driven, 40–90 min | PIQ: **Phase 0**. AI interviewer: Phase 2 |
| **Conference** | 1–3 min before the board | Phase 4 |

**Explicitly out of scope, permanently:** PGT, HGT, FGT, Command Task, Individual Obstacles and Snake Race as *simulations*. These are physical and group-dynamic; we teach rules of ground, solution design and fitness preparation, and we say so plainly rather than implying simulation.

---

## 3. The core modelling decision — the OLQ vector

Every evaluation in the system, in every phase, emits scores against the same 15 dimensions. This is the spine; nothing else in the schema is as load-bearing.

| Factor | OLQs |
|---|---|
| **I — Planning & Organising** | Effective Intelligence, Reasoning Ability, Organising Ability, Power of Expression |
| **II — Social Adjustment** | Social Adaptability, Cooperation, Sense of Responsibility |
| **III — Social Effectiveness** | Initiative, Self Confidence, Speed of Decision, Ability to Influence the Group, Liveliness |
| **IV — Dynamic** | Determination, Courage, Stamina |

Three rules, enforced in code:

### 3.1 Partial vectors only

Each instrument declares which OLQs it is *entitled* to observe, in a static entitlement map. OIR may score Effective Intelligence and Reasoning Ability — nothing else. PPDT covers roughly eight. An evaluation returning an OLQ outside its entitlement is rejected at the boundary, not filtered downstream.

Instruments scoring qualities they cannot observe is how systems like this turn into noise.

### 3.2 Scores carry evidence

1–9 scale, mirroring assessor practice. Every score carries its justification so feedback is traceable and a human reviewer can audit it:

```json
{
  "reasoning_ability": {
    "score": 6,
    "confidence": 0.7,
    "evidence": ["Story resolved the central conflict but ignored the second character entirely"]
  }
}
```

### 3.3 Rollups are confidence-weighted

`olq_snapshots` aggregates partial vectors across sessions into a rolling profile. That table *is* the Phase 1 consistency engine — the differentiator is that TAT, WAT, SRT, SDT and PIQ must describe the same person, and contradictions between them are the finding, not an error.

---

## 4. Schema

Deliberately **generic across assessment types**, so Phases 1–4 add rows, not migrations.

### Tenancy

```
organisations   id, name, slug, type('academy'|'individual')
profiles        id -> auth.users, role('candidate'|'mentor'|'org_admin'|'superadmin'),
                org_id (nullable -> B2C), full_name, dob, phone, entry_types[]
batches         id, org_id, name, target_ssb_window
batch_members   batch_id, candidate_id
```

### Assessment core — one shape for every instrument, now and later

```
items        id, assessment_type, difficulty, payload jsonb, asset_path, active, source
item_stats   item_id, session_id, seen, attempted, correct, choice_counts jsonb,
             disc_top_correct, disc_top_n, disc_bottom_correct, disc_bottom_n,
             key_at_measurement, measured_at   -- SITTING grain; pooled at read (D19)
sessions     id, candidate_id, assessment_type, started_at, submitted_at,
             time_limit_seconds, status, proctor_flags jsonb, cost_usd
responses    id, session_id, item_id, ordinal, response_text,
             response_media_path, elapsed_ms, source('typed'|'handwritten_ocr')
evaluations  id, session_id, response_id, evaluator('ai'|'human'), model,
             olq_scores jsonb, verdict jsonb, went_well, focus_on, tip,
             confidence, input_tokens, output_tokens
uploads      id, session_id, storage_path, page_no, ocr_status, ocr_provider,
             ocr_text, ocr_confidence, ocr_cost_usd, candidate_corrected bool
```

`assessment_type` values, all phases: `oir_verbal`, `oir_nonverbal`, `ppdt`, `tat`, `wat`, `srt`, `sdt`, `lecturette`, `interview`, `gpe`, `gd`.

### Phase 0 specifics

```
piq_submissions  id, candidate_id, version, payload jsonb, completeness_score
piq_flags        id, piq_id, field_path, severity, issue, suggestion
piq_questions    id, piq_id, question, rationale, field_path
medical_checks   id, candidate_id, entry_type, payload jsonb, computed_flags jsonb
olq_snapshots    id, candidate_id, computed_at, vector jsonb, source_session_ids uuid[]
```

`item_stats` ports the model already proven in [`Question_Bank/ITEM_STATS.md`](../Question_Bank/ITEM_STATS.md). Tenancy ports the institute model from [`nda-tracker`](../nda-tracker/ARCHITECTURE.md).

---

## 5. Edge Functions

All scoring server-side. `{ data }` on success, `{ error }` on failure. Fail-fast validation at the boundary before any external call. Token and cost recorded per call, following [`English_AI_Tutor/src/lib/costUtils.js`](../English_AI_Tutor/src/lib/costUtils.js).

| Function | LLM | Contract |
|---|---|---|
| `score-oir` | No | Responses to per-reasoning-type breakdown + percentile + simulated 1–5 band. Pure deterministic |
| `ocr-ingest` | Provider-dependent | Signed upload to text + confidence. Size and rate limited. *(Sprint X)* |
| `evaluate-ppdt` | Yes | **Text in**, returns partial OLQ vector + verdict (hero identified, character count vs. picture, age/sex/mood, action-past-present-future, realism, positivity, canned-response flag) + `wentWell`/`focusOn`/`tip` |
| `validate-piq` | Hybrid | Deterministic completeness rules + LLM gap detection, writes `piq_flags` |
| `generate-piq-questions` | Yes | PIQ to likely IO question tree, with per-question rationale and source field |
| `medical-screen` | **No** | Entry-type-aware deterministic rules. No LLM by design — this must never hallucinate |

---

## 6. The four seam rules

The handwriting pipeline is deferred to Sprint X (see [`DECISIONS.md`](./DECISIONS.md) D3). These four rules make that deferral cost nothing. They are cheap now and expensive to retrofit.

1. **`responses.source` exists from Sprint 1** as `'typed' | 'handwritten_ocr'`. Never defaulted away, never dropped.
2. **`uploads` and its storage bucket are created in the Sprint 1 migration**, though nothing writes to them until Sprint X. A later migration against live data is where this kind of deferral actually hurts.
3. **`evaluate-ppdt` accepts text, never an image.** Input mode stays an upstream concern; the evaluator never learns where the text came from. This is the load-bearing one — it keeps OCR strategy swappable.
4. **The session state machine keeps the input-mode branch**, with the second arm stubbed. Do not hard-code typed as the only path.

---

## 7. Provider adapter

The LLM judge sits behind a fixed interface — **text in, validated partial OLQ vector out** — with the provider as an implementation detail.

Rationale and the decision procedure are in [`DECISIONS.md`](./DECISIONS.md) D5. In short: the provider is chosen at Sprint 3 by measured agreement with expert OLQ ratings, not by reputation and not by inheritance from [`English_AI_Tutor`](../English_AI_Tutor/). The adapter costs about a day and means the question never has to be answered under pressure. It also lets the Sprint X vision/OCR path use a different model from the text judge, which is likely — handwriting vision and rubric judgement are different capabilities.

Three implementation requirements, provider-independent:

- **Strict structured output.** The OLQ vector must validate or the rollup silently corrupts.
- **Prompt caching.** The rubric (15 OLQs + criteria + few-shot examples) is byte-identical on every call. Rubric first, candidate response last, after the cache breakpoint.
- **Batch submission.** Psych scoring is not latency-sensitive — the candidate submits and reads a report later. Batch APIs typically run at half cost.

---

## 8. Security and privacy posture

We store psychological self-disclosure from candidates aged roughly 16.5 to 25, many of them minors. This is more sensitive than exam scores and is treated as such.

- RLS on every table. A candidate cannot read another candidate's responses; the test suite asserts this in Sprint 1.
- Explicit consent at signup; retention limits published and enforced.
- No training on user data without opt-in.
- Mentor access is scoped to their own org's batches.
- All scoring server-side. No answer keys, rubrics or evaluation prompts reach the client.
- No secrets committed. See the policy in [`nda-tracker/SECURITY.md`](../nda-tracker/SECURITY.md).

---

## 9. Honest-claims policy

This is an architecture constraint, not marketing guidance, because it determines what we are allowed to build.

1. **AI psych scoring is not psychometric validation.** Output is framed as directional coaching feedback. We never predict a recommendation.
2. **Group dynamics and physical tasks are not simulated.** Overclaiming here is what makes existing portals untrustworthy.
3. **We do not teach ideal answers.** Templated TAT/WAT responses are the most common reason prepared candidates are rejected — assessors detect them immediately. Canned-response *detection* is a product feature precisely because canned-response *coaching* would harm the candidate.
4. **Typed mode is lower-fidelity than handwritten.** Until Sprint X ships, no candidate-facing "realistic simulation" claim.

---

## 10. Stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router) — SEO matters for organic acquisition |
| UI | Tailwind, mobile-first, verified at 375px |
| Backend | Supabase — Auth, Postgres, Storage, Edge Functions |
| Deploy | Vercel |
| Testing | Vitest + React Testing Library, test-first |
| LLM | Adapter; provider decided Sprint 3 by eval (section 7) |

Matches [`Question_Bank`](../Question_Bank/ARCHITECTURE.md). Exhaust this stack before adding any dependency.
