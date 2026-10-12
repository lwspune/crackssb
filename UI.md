# CrackSSB — UI

> **Status:** Pre-implementation. Agreed 2026-09-24, before Sprint 1. This is the fourth planning document: it fixes the *shape* of the product — roles, interaction modes, navigation, the rules every screen obeys — so Sprint 1 builds against something written. Visual design (type, colour, spacing) is deliberately not here; it follows the shape, not the other way round.
>
> **Companion docs:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) — schema, OLQ vector, seam rules, honest-claims policy. [`ROADMAP.md`](./ROADMAP.md) — phases and sprint order. [`DECISIONS.md`](./DECISIONS.md) — the *why* trail; the mode taxonomy is [D18](./DECISIONS.md#d18--seven-runner-modes-not-one-ui-per-test).

---

## 1. The one idea

The product has two surfaces with opposite goals, and the design comes from keeping them opposite.

**The test surface is hostile.** No navigation, no save button, no back, no progress you can scrub. The real SSB shows a WAT word for fifteen seconds and takes the sheet away. A runner with comfort affordances trains the wrong reflexes and makes the score meaningless.

**The feedback surface is generous.** Specific, quoted, unhurried, re-readable, and always traceable to the candidate's own words.

Every portal in this space wraps both in the same quiz-app chrome. The moment ours drops the chrome, the candidate knows the clock is real.

---

## 2. Roles — three experiences, four permissions

The schema has four roles (`ARCHITECTURE.md` §4). The UI presents three.

| experience | schema role | sees |
|---|---|---|
| **Student** | `candidate` | their own work only. B2C and academy students use the same app; batch features are simply absent when `org_id` is null |
| **Staff** | `mentor`, `org_admin` | one staff app. `org_admin` is a mentor with an additional *Manage* section — batches, seats, other staff. In a small academy they are the same person |
| **Superadmin** | `superadmin` | the platform: every org, the item bank, content, costs, models, assessor calibration |

`org_admin` and `superadmin` are never merged. An academy owner must not see another academy's students — that is the B2B tenancy model and the Sprint 1 RLS gate. The role decides what is *permitted*; the experience decides what is *shown*. The report reader (§6) is the clearest case: one component, layered by role.

---

## 3. Runner modes — seven, not fifteen

There are roughly fifteen tests across the five SSB days. There are seven interaction modes. **The mode, not the test, is what gets designed, built and tested.**

| mode | behaviour | tests | first built |
|---|---|---|---|
| **Booklet** | one global clock · N items · free navigation, skip and return · submit or expire | OIR verbal, OIR non-verbal, SRT (60 in 30 min) | Sprint 2 (OIR) |
| **Forced sequence** | per-item clock · auto-advance · **no back** · no item count shown | WAT (15 s × 60) | Phase 1 |
| **Stimulus → write** | phased clock per item: *show* → (*note*) → *write* → auto-advance · stimulus hidden once writing starts | PPDT (30 s / 1 min / 4 min), TAT (30 s / 4 min × 12; slide 12 blank) | Sprint 4 (PPDT) |
| **Free-write** | one clock · fixed prompts · word guidance shown, not enforced | SDT (15 min, five paragraphs) | Phase 1 |
| **Form** | no clock · saved · versioned · resumable | PIQ, medical self-check | Sprint 3 (PIQ) |
| **Speak** | prep timer → record → transcript | Lecturette (3 min / 3 min), AI interview | Phase 2 |
| **Room** | scheduled · multi-party · audio/video | GD, GPE, PPDT narration | Phase 3 |
| *(Read)* | content pages; not a runner | GTO physical tasks — theory only, per `ARCHITECTURE.md` §9.2 | Phase 4 |

Sprint 2 builds Booklet and SRT gets it free. Sprint 4 builds Stimulus → write and TAT gets it nearly free. Phase 1's "full psych suite" is then two small modes plus configuration.

### 3.1 Mode contracts — the assertions

Each mode has a contract. These are the tests, written per mode, never per instrument.

| mode | must | must not |
|---|---|---|
| Booklet | serve the whole item list *without* answer keys · accept an answer for any item in any order · submit on expiry with whatever is saved | reveal correctness before submission |
| Forced sequence | advance on expiry whether or not anything was typed · persist each item before advancing | allow navigation to a previous item · show "word 23 of 60" (paper mode shows "Line 23" — the number, never the total; [D22](./DECISIONS.md)) |
| Stimulus → write | hide the stimulus when the write phase begins · advance on expiry | let the candidate re-open the stimulus · let the candidate skip ahead |
| Free-write | persist each field independently · show word count | block submission on word count |
| Form | save on every field change · keep prior versions | lose a partially completed form |

### 3.2 Timing — universal rules

1. **The deadline is server-issued.** A session or item carries `expires_at` from the server; the client only renders a countdown against it. A client-side timer means a refresh buys free time, and for WAT that is the whole test.
2. **The clock never pauses.** Refresh, tab close, network drop, phone call — the clock runs. On return the candidate resumes where they were with the time that remains. The real SSB does not pause either.
3. **Autosave per item, never per session.** In Forced sequence and Stimulus → write the item is gone the moment it advances, so it must already be persisted. A candidate who loses connection loses at most the keystrokes since the last save, never a completed item.
4. **Nothing the server has not released reaches the client.** Items are served per item at the moment they are due (`ARCHITECTURE.md` §8). Prefetching *one* item ahead for latency is acceptable; prefetching a booklet's answers is not, and a booklet is served without them.

---

## 4. Two shells

**The app shell** is shared by every non-runner screen: side navigation on desktop, bottom tabs at 375 px, the same header, the same empty-state style.

**The runner has no shell.** Full screen, one thing visible, the deadline in the corner. No header, no tabs, no way out except the clock or an explicit "abandon this session" that costs the session.

The contrast is the design. Nothing else on the product needs to explain that a test is real.

---

## 5. Information architecture

### 5.1 Student — navigate by SSB day, never by our phase

A candidate thinks *Day 1 screening → Day 2 psychology → GTO → interview → conference*. Sprint and phase numbers are ours and must never appear in navigation.

| section | holds |
|---|---|
| **Home** | what is next, what is unfinished, the most recent report |
| **Practise** | instrument picker grouped by SSB day. GTO physical tasks appear here with an honest *"not simulated — here is what we teach"* card, not hidden |
| **Runner** | full screen (§4) |
| **Results** | session list → report reader (§6) |
| **Profile** | the PIQ *is* the profile. Medical self-check lives here |
| **OLQ** | evidence-backed list (§7, rule 4). Not a radar chart |

### 5.2 Staff

| section | holds |
|---|---|
| **Batches** | batches → students → student detail |
| **Review queue** | evaluations awaiting a human second opinion, **sorted by AI confidence, lowest first**. A staff review writes `evaluations.evaluator = 'human'` — the schema already supports it. This is the Sprint 6 mentor queue and the premium tier |
| **Student detail** | the same report reader the student sees, plus the staff layer (§6) |
| **Batch rollup** | aggregate view across a batch. **The one place cohort comparison is permitted** — see §6 |
| **Manage** *(org_admin only)* | staff, batches, seats |

### 5.3 Superadmin

| section | holds |
|---|---|
| **Orgs** | tenants, seats, plan |
| **Item bank** | items and `item_stats` — p-value, discrimination, retire. The `Question_Bank` pattern |
| **Content** | TAT and PPDT images, WAT deck, SRT bank |
| **Costs** | `sessions.cost_usd` by model, org, instrument |
| **Assessors** | [D17](./DECISIONS.md) made visible: import a marker's grades, see per-rater calibration, compare raters *before* pooling. This is where supplied assessor reports land. It is the only section here not already in `ROADMAP.md` |

---

## 6. The report reader — one component, layered by role

The one-pager and the detailed report already exist as documents (`scripts/build-reports.mjs`). On screen they become one reader with two views:

- **One-pager** — strengths with the candidate's own quotes, theme issues, perception, craft, priorities, closing.
- **Detail** — the candidate's response on the left, the finding against it on the right, per item. This is what a document cannot do and is the entire pedagogical value: the difference between *"improve your perception"* and showing the sentence where perception failed.

**The student and staff see the same component.** The staff layer — AI verdict, confidence, override control — is toggled by role, not built as a second view. Two divergent views is how a mentor and a student end up discussing different documents.

Two constraints from `DECISIONS.md` bind this screen:

- **[D16](./DECISIONS.md)** — every claim on the *candidate's* reader comes from their own text, the stimulus, the rubric and Layer 1/2 output. Never the human assessor's marks; **never a comparison with another candidate.** The guard in `build-reports.mjs` moves server-side as a check on the response shape.
- **[D15](./DECISIONS.md) / `ARCHITECTURE.md` §9.1** — no standing band, no recommendation. The reader ends with priorities, not a verdict.

**Where comparison *is* allowed:** the staff batch rollup. D16 forbids cohort comparison in the candidate's report, not in the mentor's aggregate view. Recorded here so the guard is not applied to the wrong surface.

---

## 7. Rules every screen obeys

1. **Two chromes, not one.** §4.
2. **One report reader,** role-layered. §6.
3. **Honest empty states instead of hidden features.** *"Not simulated." "Not yet measured." "Awaiting mentor review."* Each says what is true.
4. **No number without evidence.** An OLQ score is shown only with its observation count and the instruments it came from — *"Effective Intelligence — 4 observations across TAT, SRT"*. The vector is partial by design (`ARCHITECTURE.md` §3.1); a radar chart draws the missing spokes and fabricates data. A band or verdict is never shown to a student.
5. **Nothing unreleased reaches the client.** §3.2 rule 4.
6. **Mobile-first, verified at 375 px** (`ARCHITECTURE.md` §10), including every runner.
7. **Keyboard and screen reader complete** for every core flow, including the runner — the deadline is announced, not only drawn.

---

## 8. Fidelity limits, stated in the product

`ARCHITECTURE.md` §9.4 forbids a "realistic simulation" claim until handwriting ships. The UI says so where it matters rather than hiding it:

- **Typed mode.** A four-minute story typed on a phone is slower than one written by hand. The runner says this once, before the first typed session, and not again.
- **Physical and group tasks.** Theory cards, clearly labelled. Never a progress bar implying practice.
- **AI feedback.** Framed as directional coaching. The reader's closing section says what it is and is not.

---

## 9. Build order

| sprint | UI delivered |
|---|---|
| **1** | app shell · role-based navigation · RLS-backed session list · runner shell wrapping the engine. **The engine itself exists** — `src/runner/`, pure and headless, with the mode contracts of §3.1 as its tests. The server issues one `started_at`; the schedule is fixed from it (§3.2) |
| **2** | **Booklet** mode via OIR · results page for a scored booklet |
| **3** | **Form** mode via PIQ · flags rendered inline |
| **4** | **Stimulus → write** mode via PPDT · first report reader (one-pager) |
| **5** | Student Home, Results, OLQ (evidence list) · detail view of the reader · medical self-check |
| **6** | Staff: Batches, Review queue, Student detail with staff layer, Batch rollup, Manage · Definition-of-Done pass at 375 px |
| Phase 1 | Forced sequence (WAT) · Free-write (SDT) · TAT and SRT as configurations of existing modes |
| Later | Superadmin Assessors section — needed the moment a second marker's grades arrive |

The runner and its timing rules come first because they are the riskiest component, are reused by every instrument, and nothing downstream is real without them. The dashboard is cheap and waits.

---

## 10. Open

- **OIR non-verbal** needs figure assets before Booklet mode can run it; `ROADMAP.md` already names this the longest pole in Phase 0. The UI cannot hide it.
- **Abandon semantics.** Whether an explicitly abandoned session is scored on what was saved, or discarded. Lean: scored — a candidate who walks out of the real SSB is still marked on the sheet.
- **Handwriting upload** — paper mode shipped 2026-10-12 ([D22](./DECISIONS.md)): stimulus and clock on screen, answers on a printed sheet carrying a session code. Upload waits for storage; reading is end-of-day with AI in a working session before any automated pipeline.
