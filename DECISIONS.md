# CrackSSB — Decisions

The long-form *why* trail. Each entry records the context, the decision, its consequences, and the trigger that would make us revisit it. Append only; supersede rather than edit.

> **Companion docs:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the intended architecture. [`ROADMAP.md`](./ROADMAP.md) — phases, sprints, blockers.

---

## D1 — Handwriting-first, not typing-first

**Date:** 2026-09-19 · **Status:** Accepted

**Context.** Real SSB psychology tests are handwritten at speed — 15 seconds per WAT word, 4 minutes per TAT story. Typing changes the task: it is faster, editable, and removes the physical time pressure that makes these instruments discriminating. A typed-only product trains a measurably different skill from the one being assessed.

**Decision.** Candidates write on paper, photograph the sheet, and upload. OCR extracts the text; the candidate corrects it; scoring runs on the corrected text.

**Consequences.** Puts OCR on the critical path, which is the single largest technical risk in the product (see D3). Adds a capture-and-correct UI that typed mode does not need. In exchange, assessment fidelity is preserved and the product can honestly claim to train the real task.

**Revisit if.** The Sprint X bake-off shows no viable OCR path at acceptable accuracy, or candidate telemetry shows the capture flow is abandoned at a high rate.

---

## D2 — Typed mode is a first-class path, not a fallback

**Date:** 2026-09-19 · **Status:** Accepted

**Context.** D1 makes OCR load-bearing. If OCR underperforms, a handwriting-only product has nothing to ship. Separately, a meaningful share of Indian candidates are mobile-only, where photographing and uploading multi-page sheets is real friction.

**Decision.** Typed mode ships alongside handwritten and is maintained as a supported path, not a degraded one.

**Consequences.** Roughly one extra day of work. Removes OCR from the critical path entirely — the product works regardless of how the bake-off resolves. Requires the honest-claims rule in [`ARCHITECTURE.md`](./ARCHITECTURE.md) section 9.4: typed mode is lower-fidelity, and no "realistic simulation" claim is made until Sprint X ships.

**Revisit if.** Usage shows one mode is effectively unused after Sprint X, at which point maintaining both stops earning its cost.

---

## D3 — Defer the OCR bake-off to Sprint X

**Date:** 2026-09-19 · **Status:** Accepted

**Context.** The bake-off needs roughly 40 real handwritten sheets — messy and genuinely time-pressured, because neat samples would give a falsely optimistic result that we would only discover at PPDT scoring. No such corpus exists today.

**Decision.** Defer the bake-off and the whole handwriting pipeline to a floating "Sprint X" that slots in when the corpus exists. Sprints 1–6 are re-sequenced to have zero OCR dependency.

**Consequences.** Five sprints of unblocked work. The deferral is only free because of the four seam rules in [`ARCHITECTURE.md`](./ARCHITECTURE.md) section 6 — in particular creating `uploads` and its storage bucket in the Sprint 1 migration, so Sprint X never runs a migration against live data. Ordering `evaluate-ppdt` to take text rather than an image is what keeps OCR strategy swappable.

**Revisit if.** A corpus arrives earlier than expected, or an assessment type lands that cannot work in typed mode at all.

---

## D4 — OLQ vector from day one, with partial vectors and an entitlement map

**Date:** 2026-09-19 · **Status:** Accepted

**Context.** SSB scores 15 Officer Like Qualities across three independent assessors. The entire value of a cross-instrument consistency engine (Phase 1) depends on every instrument speaking the same scoring language. Retrofitting a common vector after four instruments already store bespoke output is a rewrite.

**Decision.** Introduce the 15-OLQ vector in Phase 0, at the very first evaluation (`evaluate-ppdt`). Every evaluation, in every phase, emits scores against it. Instruments emit **partial** vectors bounded by a static entitlement map, and every score carries evidence and a confidence.

**Consequences.** Slightly more work in Sprint 4 than a free-form verdict would need. Makes Phase 1's consistency engine largely an aggregation problem rather than a new system. The entitlement map is the part most likely to be skipped under time pressure and is precisely what prevents the rollup becoming noise — OIR cannot speak to Courage, and the boundary must reject it rather than downstream filtering it.

**Revisit if.** Expert validation (blocker 3) shows the 15-OLQ breakdown does not survive contact with real rating behaviour, e.g. assessors cluster into far fewer usable dimensions.

---

## D5 — LLM provider chosen by eval at Sprint 3, behind a swappable adapter

**Date:** 2026-09-19 · **Status:** Accepted

**Context.** [`English_AI_Tutor`](../English_AI_Tutor/) runs on OpenAI (Whisper + GPT-4o-mini + TTS), chosen for read-aloud scoring: short utterances, STT in the same pipeline. CrackSSB's core workload is different — long-form projective-test evaluation, strict structured output, a 15-dimension scored vector with evidence strings, and later a vision path for handwriting. Those are different selection criteria, so the choice should be made rather than inherited.

Cost does not discriminate here. A PPDT evaluation runs roughly 2k input + 800 output tokens; even on a premium model that is around $0.012, and prompt caching plus batch submission cut it further. Per-token price differences between providers are real but immaterial at these volumes.

**Decision.** Do not choose now. Put the judge behind a fixed adapter interface — **text in, validated partial OLQ vector out** — and select the provider at Sprint 3 by measured agreement with expert OLQ ratings.

The eval is not extra work. The domain validator (blocker 3) must rate a sample set to validate the OLQ rubric at all; once roughly 50 PPDT responses carry expert ratings, that set doubles as the model benchmark.

**Consequences.** About a day for the adapter. The provider question never has to be answered under schedule pressure, and the Sprint X vision path may use a different model from the text judge — handwriting vision and rubric judgement are different capabilities and nothing requires one vendor for both. Three requirements hold regardless of provider: strict structured output (the vector must validate or the rollup silently corrupts), prompt caching with the rubric ahead of the cache breakpoint, and batch submission for non-latency-sensitive scoring.

**Revisit if.** Agreement scores are statistically indistinguishable across candidates, in which case fall back to operational factors — existing team familiarity, one vendor instead of two, regional latency.

---

## D6 — Generic assessment schema across all instruments

**Date:** 2026-09-19 · **Status:** Accepted

**Context.** Eleven assessment types ship across five phases (OIR verbal/non-verbal, PPDT, TAT, WAT, SRT, SDT, lecturette, interview, GPE, GD). Per-instrument tables would mean a migration per phase and no shared analytics.

**Decision.** One shape — `items`, `sessions`, `responses`, `evaluations` — parameterised by `assessment_type`, with instrument-specific structure living in `payload jsonb` and `verdict jsonb`.

**Consequences.** Phases 1–4 add rows, not migrations. Cross-instrument queries (the consistency engine, the candidate dashboard, batch rollups) are trivial. Costs some type safety at the jsonb boundary, which validation at the edge function mitigates.

**Revisit if.** An instrument arrives whose response shape genuinely cannot be expressed this way — live group events in Phase 3 are the most likely candidate, since they have multiple simultaneous participants per session.

---

## D7 — The sample corpus is self-harvesting

**Date:** 2026-09-19 · **Status:** Accepted

**Context.** D3 blocks Sprint X on roughly 40 messy handwritten sheets. Assembling that by hand is slow, and hand-assembled samples tend to be unrepresentatively neat.

**Decision.** Once PPDT typed mode ships in Sprint 4, add an optional *"also photograph your sheet"* step that writes to `uploads` with `ocr_status = 'pending'` and performs no processing.

**Consequences.** Yields genuinely time-pressured handwriting paired with the candidate's own typed transcription as ground truth — better than anything assembled deliberately, and it accumulates while the rest of Phase 0 is built. Costs one afternoon and negligible storage. Requires explicit consent copy at the capture step, per the privacy posture in [`ARCHITECTURE.md`](./ARCHITECTURE.md) section 8.

**Revisit if.** Opt-in rates are too low to reach a usable corpus, in which case fall back to paying a small cohort to produce sheets under timed conditions.

---

## D8 — Generate our own PPDT and TAT imagery

**Date:** 2026-09-19 · **Status:** Accepted

**Context.** Competitor portals circulate scraped photographs of actual SSB slides. That pool is finite, of unknown provenance, and copyright-exposed.

**Decision.** Generate all ambiguous imagery ourselves.

**Consequences.** Legally clean and unlimited in supply. More usefully, ambiguity becomes a *tunable parameter* — we control how hazy and how open to interpretation each image is, which turns it into a difficulty dial that scraped material cannot provide. Requires a curation pass, since generated images can be ambiguous in uninteresting ways.

**Revisit if.** Expert review finds generated images do not elicit the same projective response as real SSB material.

---

## D9 — Human-in-the-loop review ships in Phase 0

**Date:** 2026-09-19 · **Status:** Accepted

**Context.** AI scoring of projective tests is pattern-matching, not psychometric validation ([`ARCHITECTURE.md`](./ARCHITECTURE.md) section 9.1). Without expert review in the loop the output is plausible but unvalidated, and credibility is the whole product in a market full of overclaiming.

**Decision.** Mentor review queue ships in Sprint 6, not Phase 4 as originally scoped. AI performs pass one; a human performs pass two.

**Consequences.** Nearly free, because `evaluations.evaluator` already supports `'human'` by D6. Establishes the quality-control mechanism and the premium revenue tier simultaneously. Creates an ongoing supply problem — the marketplace side of it stays in Phase 4.

**Revisit if.** Expert reviewer time proves unobtainable at any price, in which case the honest move is to weaken the claims rather than ship unreviewed scoring as though it were validated.

---

## D10 — Layered grader: deterministic first, LLM only for what needs judgement

**Date:** 2026-09-23 · **Status:** Accepted

**Context.** A corpus of 11 hand-graded LWS Pune psych dossiers (TAT, WAT, SRT, SDT; all assessed 31 July 2026 by one assessor) arrived earlier than [D3](#d3--defer-the-ocr-bake-off-to-sprint-x) anticipated, which fires D3's own revisit trigger. Transcription yielded **470 typed assessor marks** and a derived codebook (`corpus/CODEBOOK.md`).

The corpus showed the assessor to be far more rule-governed than the red ink suggests. A large share of what he writes is arithmetic or lexical pattern-matching, not judgement:

- attempt and blank counts against fixed thresholds (SRT 45+, WAT 60, SDT 5 opinions, TAT 12 stories)
- SDT length rule, stated explicitly on the sheets: 80–90 words per opinion
- three standing lexical rules — SRT responses must read `He will` (not `He must`/`He should`/past tense); `try`/`tried` is penalised; WAT responses must avoid personal pronouns

Direct behavioural evidence for the last: cand-04 is the only candidate graded `V. good` on WAT and the only one writing impersonal, aphoristic responses. cand-03 opens ~30 of 50 responses with a pronoun and is graded LOW.

**Decision.** The grader is four layers, and each one only escalates what the layer below cannot settle.

1. **Counts and thresholds** — deterministic arithmetic, no model.
2. **Lexical rules** — regex, no model.
3. **Rubric judgement** — LLM behind the [D5](#d5--llm-provider-chosen-by-eval-at-sprint-3-behind-a-swappable-adapter) adapter. Theme quality, picture misperception, coherence, trait inference.
4. **Cross-instrument consistency** — the Phase 1 differentiator, per [`ARCHITECTURE.md`](./ARCHITECTURE.md) section 3.3.

Layers 1–2 are built and tested first, independently of the LLM work, and the share of corpus marks they reproduce is measured and published before any model is selected.

**Consequences.** The auditable, zero-hallucination layers carry whatever share of the load they can, and the measured share tells us how much work the LLM layer actually has to do — a number that should inform the D5 eval rather than being assumed. Costs a small amount of duplicated surface: a response failing a Layer-2 rule is also visible to the Layer-3 judge, and the two must not double-count into the same OLQ score.

**Measured (2026-09-23).** Layers 1-2 reproduce **18.5% of the 758 corpus marks at their theoretical ceiling, and 5.8% as shipped today** (`npm run measure`). The judgement layer accounts for **70.1%**. The first measurement, taken at 470 marks from 5 sheets, gave 20.0% / 71.9% — the ratio barely moved as the corpus nearly doubled, which is mild evidence the classification is stable rather than an artefact of the sheets transcribed first. This is materially lower than the working assumption when this decision was drafted, and it is the correction that matters: the deterministic layers are *not* carrying most of the load by volume.

Two things remain true despite that. First, the count counts marks, not weight — a single `Only 16 SRT` finding is the heaviest thing on most sheets, while 48 spelling corrections are individually trivial, and the corpus offers no way to weight them. Second, the layers that are cheap stay worth building because they are auditable and cannot hallucinate.

But the headline consequence is the opposite of comfortable: **the model is doing roughly three-quarters of this job.** That raises, not lowers, the stakes on [D5](#d5--llm-provider-chosen-by-eval-at-sprint-3-behind-a-swappable-adapter) being decided by measured agreement rather than convenience, and on [D9](#d9--human-in-the-loop-review-ships-in-phase-0) shipping in Phase 0 as planned.

Also makes the corpus dual-purpose exactly as [`ROADMAP.md`](./ROADMAP.md) blocker 3 hoped: the same sheets validate the rubric and serve as the D5 eval ground truth.

**Revisit if.** The measured deterministic share is small enough that maintaining two rule layers is not worth it, or a second assessor's sheets show these rules are personal habit rather than house standard. Note that the `He will` rule is already applied inconsistently *within* this assessor's own marking — corrected 15/16 times on cand-05, not at all on cand-02 cand-02's equivalent construction.

---

## D11 — Story acceptance and personality codes are separate outputs

**Date:** 2026-09-23 · **Status:** Accepted

**Context.** Each TAT story in the corpus carries a marginal mark of the form `<digit> | <tick or cross>`. Pooled across 11 sheets: 78 legible marks, 49 cross, 29 tick.

TAT slide 11 (a wolf, reconstructed from the assessor's own corrections across four sheets) has the **highest tick rate in the corpus, 5 of 7** — while every candidate who attempted it drew `Restd courage`, and several drew `Cynophobia`. The assessor accepts the story as a story and simultaneously records a restricted-courage finding against the candidate.

A single blended quality score cannot express that, and would have silently destroyed the signal.

**Decision.** An evaluation emits two independent outputs per response: a **response-quality judgement** and a **partial OLQ vector plus non-OLQ flags**. Neither is derived from the other. The existing schema already accommodates this — `evaluations.olq_scores jsonb` beside `evaluations.verdict jsonb` ([`ARCHITECTURE.md`](./ARCHITECTURE.md) section 4) — so this is a contract clarification, not a migration.

`verdict` additionally carries the non-OLQ residue. The assessor's vocabulary does not map cleanly onto the 15 OLQs: `Money-Minded`, `archaic thoughts`, `Trust issue especially with opposite Gender`, `Living in Dreamworld`, `Overthinker` have no OLQ home and were plainly weighted.

**Consequences.** Prevents the most likely implementation error — flattening everything into the OLQ vector and losing the residue. Makes the quality judgement comparable against the assessor's own closed grade vocabulary (`LOW` · `Just Avg` · `AVG` · `Good` · `V. good`), which is a far more tractable first target than the undecoded marginal digit.

One caution for Layer 3: the corpus phobia labels (`Cynophobia`, `Aquaphobia`, `Herpetophobia`, `Phasmophobia`, `Scopophobia`) are **stimulus-driven, not dispositional** — each attaches to a specific slide or SRT item. A grader treating them as personality findings would misread the assessor.

**Revisit if.** Expert review says the two outputs are in practice inseparable for a given instrument, or the marginal digit is explained by LWS in a way that unifies them.

---

## D12 — The eval harness reports its own baseline, and the eval's limits are stated with it

**Date:** 2026-09-23 · **Status:** Accepted

**Context.** [D5](#d5--llm-provider-chosen-by-eval-at-sprint-3-behind-a-swappable-adapter) selects the provider by measured agreement with expert ratings. Building the paired eval set out of the corpus (`npm run evalset`) produced **99 TAT stories** carrying both the candidate's verbatim text and the assessor's mark — 93 of them with a grade on his closed vocabulary.

That set is badly imbalanced:

```
LOW 50   Just Avg 37   AVG 5   Good 1   V. good 0
```

A judge that answers `LOW` to everything scores **53.8%**. Measured through the real harness, not on paper. A random judge scores 11.8%.

Per-slide, the always-LOW baseline ranges from **9.1% (slide 1) to 100% (slide 11)**. Overall accuracy is therefore highly sensitive to slide mix, and a judge could look competent by learning only "slides 8, 10 and 11 are LOW".

**Decision.** The agreement scorer computes and prints the majority-class baseline, whether the judge beat it, whether it collapsed onto a single grade, its mean signed error, and a per-slide breakdown — on every run, not on request. A bare accuracy number is not a reportable result.

Two baseline providers ship alongside the real one and run on every invocation, because they cost nothing and they are the floor any model must clear.

**Consequences.** It becomes difficult to report a flattering number. `53.8%` is printed next to every score, so a judge scoring 60% is visibly barely better than a constant, and the harness says so.

The imbalance also bounds what this eval can establish: it can distinguish `LOW` from `Just Avg` and little else. With one `Good` and no `V. good` in 93 graded stories, **the upper half of the scale is untestable.** Any claim that a judge grades good work well is unsupported by this corpus, and [`ARCHITECTURE.md`](./ARCHITECTURE.md) section 9 continues to apply.

The entitlement map is enforced twice over: `verdictSchemaFor()` generates the structured-output schema from `ENTITLEMENTS`, so a model physically cannot emit an un-entitled OLQ, and `validateVerdict` rejects one at the boundary regardless. Schema generation is a provider capability; boundary validation is the contract, and the contract must hold for a provider that has no structured outputs.

**First measured run (2026-09-23), in-session judge.** With no API credential available, an in-session Claude Code judge graded all 99 stories from a blind set (story text and slide number only, ground truth stripped by `npm run blindset`) and was scored through the same harness:

| | exact | vs baseline |
|---|---|---|
| all 93 graded stories | **75.3%** | baseline 53.8% |
| excluding abridged text (81) | **76.5%** | baseline 51.9% |

Within one grade: 97.8%. Mean signed error -0.05, so no systematic leniency.

> **Superseded 2026-09-23 (later the same day).** The eval set has since grown from 99 to **124** paired stories as the remaining TAT transcriptions were completed, and the majority baseline fell from 53.8% to **50.4%** on the better-balanced set (LOW 60 / Just Avg 52 / AVG 6 / Good 1). The 75.3% above was measured on the old 93-story subset and has **not** been recomputed — the in-session judge has no verdicts for the 25 new stories. Treat it as a stale harness check, not a current figure.
>
> The abridged-story finding below is **resolved**: those seven were transcription abridgements in cand-04's record, now replaced with full text. The eight stories that still end mid-sentence are genuine candidate truncations, carry `truncated_by_candidate: true`, and are deliberately kept in the eval set because the assessor marked them `incomplete` and a judge should too.

**This is not a provider selection and must not be reported as one.** The judge transcribed the source sheets and has seen the assessor's marks; blind presentation removes the crudest failure mode, not the contamination. It establishes that the harness works end to end and that the rubric carries real signal.

Two findings worth keeping:

1. **12 stories in the eval set have abridged text** (ellipses left by partial transcription). The judge scored 66.7% on those against 76.5% on clean text — it was marking the transcription, not the response. `evalset` should flag them and the runner should exclude them by default.
2. **The error structure is one-sided in a specific way.** Of 23 disagreements, 9 were LOW where the assessor wrote `Just Avg`, and 7 were at or above `AVG` where he wrote `Just Avg`. He compresses hard toward one grade: `Just Avg` is his default for anything not clearly broken, and he almost never goes above it. The rubric under-applies it in both directions.

Finding 2 is a rubric fix, but applying it now would be tuning against the test set. It needs a train/validation split before anyone acts on it, or the next number is meaningless.

**Revisit if.** A second assessor's sheets arrive and rebalance the distribution, or the eval is extended past TAT — SRT and WAT have far more items per candidate and might carry more grade variance.

---

## D13 — Layer 4 reports corroboration as well as contradiction

**Date:** 2026-09-23 · **Status:** Accepted

**Context.** [`ARCHITECTURE.md`](./ARCHITECTURE.md) section 3.3 frames the Phase 1 differentiator as contradiction detection: the instruments "must describe the same person, and contradictions between them are the finding, not an error."

Building it against the corpus showed that framing to be half the picture. The assessor grades SDT explicitly on **insight** — *"Need to improve your Insight"* (cand-01), *"Poor insight"* (cand-03), *"You Need to be more Specific & Need to improve your Insight"*. A self-description that **matches** the projective evidence is therefore a positive finding, not the absence of one.

cand-01 demonstrates both at once. He denies anxiety (*"never panics in any situation"*) while his TAT is marked `Scared` — a contradiction. He also writes *"They think I dominate the group"*, and his SRT is marked `Shows authoritarian Behaviour` — he saw it coming. Penalising the second the same way as the first would be wrong, and reporting nothing would waste the strongest insight signal on the sheet.

**Decision.** Layer 4 emits two finding kinds: `contradiction` (self-description denies what the other instruments show) and `corroboration` (self-description acknowledges it). A signal the candidate admits **anywhere** in their SDT suppresses the contradiction for that signal — you cannot contradict someone who owned up to it.

Evidence must come from a **different instrument** than the claim. Triangulation is the entire value; one instrument disagreeing with itself is a marking artefact.

**Consequences.** Corroborations become the measurable proxy for the insight the assessor grades by hand, which no other layer supplies. Needs no model, so it runs on corpus ground truth today and on Layer 3 output later, unchanged.

Two implementation details were load-bearing and both were found by running against real sheets rather than by design:

- **Negation is clause-bounded.** cand-01 writes *"...never panics in any situation. 'Never give up' is my attitude."* A fixed-width look-back caught the `never` from the previous sentence and inverted the courage finding.
- **Deficit-named signals invert.** `courage_restricted` is named for the lack, but candidates write about the asset — *"I am courageous"* denies it. Without the inversion the polarity of every courage and confidence finding flips.

**Measured on the corpus:** 4 contradictions and 6 corroborations across the 6 candidates with transcribed SDT text.

**Known limits.** Every finding is `medium` confidence, because `high` needs the same signal marked in two separate instruments and only TAT is thoroughly transcribed for traits. Five candidates have no SDT text and cannot be compared at all. And this is a rule-based detector over ten signals — it will miss inconsistencies a reader would catch, so it is a floor, not a ceiling.

**Revisit if.** Layer 3 supplies OLQ vectors for every instrument, at which point numeric divergence on the same OLQ across instruments becomes detectable and the signal list stops being the limit.

---

## D14 — Separate assessor doctrine from academy house style, and score only doctrine

**Date:** 2026-09-23 · **Status:** Accepted

**Context.** LWS Pune answered the open questions from `corpus/CODEBOOK.md` section 8:

| question | answer |
|---|---|
| What does the marginal digit mean? | not pursued — closed |
| Is "start with He will" doctrine or house style? | left to our judgement |
| Is the 45+ SRT target realistic in the time allowed? | **yes** |
| Was a second assessor involved? | **no** |
| Why are sheet pages 12–13 missing? | not pursued — closed |

The confirmation that there was **one assessor and no second marker** is what makes the second question answerable. Where the same person applies a rule three different ways across three sheets, that is not a standard being enforced — it is a heuristic being reached for situationally.

The corpus shows exactly that for the tense rule:

- The written instruction *"start your SRT response with 'He will' — not 'He must' / 'He should'"* was given to **only** the two candidates who used modal obligation (cand-01, cand-11), and both times sat beside `Shows authoritarian Behaviour`.
- Bare past or present tense drew it **inconsistently**: corrected 15 of 16 times on cand-05, not once on cand-09 or cand-02 writing the same way.
- cand-03 wrote `He will` throughout and received zero corrections.

**Decision.** Every Layer-2 finding declares a `basis`:

- **`doctrine`** — reflects a quality actually being assessed. Scored.
  `srt_modal_obligation` (prescribing what someone *ought* to do rather than committing to an action — a real signal about manner, and the only form he ever wrote the instruction out for) and `tentative_verb` (decisiveness; flagged on three separate sheets).
- **`house_style`** — a surface-form preference of this academy. Surfaced as advice, never scored.
  `srt_non_future`, `wat_personal_pronoun`, `whatsapp_abbreviation`.
- **`grammar`** — plainly wrong English, independent of SSB.
  `definite_article_before_name`.

**Consequences.** Candidates are not marked down for a preference one marker applied to one candidate in three. The product can still teach the house style — it is what this academy rewards, and cand-04's impersonal WAT responses are the only ones graded `V. good` — but it says which is which, which is the difference between coaching and superstition. This is the honest-claims policy ([`ARCHITECTURE.md`](./ARCHITECTURE.md) section 9) applied to the rubric itself.

**Consequences of the other two answers:**

- **45+ SRT is achievable in the time.** The observed range of 16–29 is therefore a genuine performance deficit, not an unrealistic target, and the Layer-1 threshold of 45 stands as legitimate. The earlier speculation that five candidates stopping at exactly 16 was a *page-boundary artefact* is demoted: the boundary may still explain where they stopped, but the shortfall is real and the coaching fix is pacing and writing speed, not sheet design.
- **Single rater confirmed.** The health warning throughout the corpus docs is no longer a caution about unknown provenance — it is an established fact. There is no inter-rater reliability available from this corpus at any price, and `ARCHITECTURE.md` section 9.1 continues to hold: directional coaching feedback, never psychometric validation.

**Revisit if.** A second assessor's sheets ever arrive, which would let the doctrine/house-style split be tested rather than judged. Any rule both markers apply consistently is doctrine; any rule only one applies is house style, regardless of how it reads.

---

## D15 — The session report is the deliverable, and it is a fifth layer

**Date:** 2026-09-23 · **Status:** Accepted

**Context.** A typed one-page **Psychologist Report** for cand-04 arrived, signed by the assessor. It is what the red-pen marks on his answer sheets ultimately became, and it is what a candidate is actually handed.

It validated the transcription on every checkable number — SRT 27, WAT 6 not attempted, 6 TAT stories "just average level" matching exactly the 6 ticks on the sheet, 4 "low level themes & left incomplete" matching exactly the 4 stories independently marked LOW or incomplete. It also resolved a flagged defect (cand-04's non-reconciling WAT tally) and pinned the meaning of the tick: **a tick means the story reached "just average level"** — the pass mark, not praise.

But the important thing is what it shows about the target. Everything built so far — Layers 1 to 4 — produces **marks**. The report is a **narrative synthesis per instrument, plus a candidate-level verdict**, and it carries two things no layer emits:

> Overall, the candidate is a **High Borderliner / adequate potential** w.r.t. psychology test.
>
> The Candidate has **adequate Trainability**.

Neither is derivable from response grades. "Borderliner" implies a band structure around a selection cut-off; "Trainability" is a separate judgement about whether coaching would move this candidate — which is exactly what a preparation product exists to answer.

**Decision.** Add **Layer 5 — session report**: it consumes Layers 1–4 and emits the report structure the assessor uses (TAT / WAT / SRT / SD sections, a SUMMARIZING paragraph, a standing verdict and a trainability verdict). It is the candidate-facing artefact; the layers below it are inputs, not output.

Two constraints carried from the honest-claims policy ([`ARCHITECTURE.md`](./ARCHITECTURE.md) section 9):

- **We do not emit a standing verdict.** `High Borderliner` sits on a selection band, and section 9.1 forbids predicting a recommendation. Layer 5 produces the sections and the improvement priorities; the band stays with a human. Where the corpus records one it is ground truth for evaluation, never a target to reproduce.
- **Trainability we may emit**, because it is a coaching judgement rather than a selection one, and it is the question the product is for.

**Consequences.** The report is the first artefact that makes the whole stack legible to a candidate, and it gives Layer 3 a much richer target than a five-word grade. It also means the corpus needs report-level ground truth to evaluate against, and there is currently **one** report for eleven candidates.

It changes nothing structurally: `evaluations.verdict jsonb` already holds the non-OLQ residue the report is full of — anxiousness, insight, motivation, knowledge base, legibility — which is [D11](#d11--story-acceptance-and-personality-codes-are-separate-outputs) arriving at the same place from the opposite direction.

**Amended 2026-09-23, after a blind test.** A second report arrived (cand-01). Before seeing it, a full report was generated from his marks alone and sealed; scoring it against the real one (`corpus/predictions/cand-01-SCORED.md`) produced 8 correct, 4 partial, 6 wrong — and two findings that change what Layer 5 is.

**1. The report is substantially boilerplate.** The entire third TAT paragraph is *word-for-word identical* across both candidates, including `shows traces of restricted courage`, `shows traces of restricted Mental Stamina` and `He maintain cheerfulness at all times`. The paragraph above it is a template with slots — social adaptability, confidence, assistance-seeking, anxiousness — filled with different values from a small vocabulary.

Layer 5's real job is therefore **much smaller than it looked**: fill a fixed skeleton's slots. It also means a naive fidelity metric is dangerous — a model that reproduced only the boilerplate would score well while getting every candidate-specific slot wrong. **Layer 5 must be evaluated on the slots, not on the page.**

**2. The marks→report filter is lossy, and selectively so.** Nine marks on cand-01's sheets reach no part of his report: `Shows authoritarian Behaviour` (despite must/should being corrected on all 16 attempted SRT responses), `Restd / Low Dynamism`, and the entire SDT trait block — short fuse, aggressiveness, impulsiveness, trust issue with the opposite gender.

The marking sheet is working notes; the report is a filtered, moderated document that drops personal-sounding trait attributions. This **strengthens [D14](#d14--separate-assessor-doctrine-from-academy-house-style-and-score-only-doctrine)**: the `He will` rule is coaching correction, not an assessment finding, and does not survive into the assessment at all.

**Trainability is confirmed independent of standing.** cand-01 is `Low-Borderliner` against cand-04's `High Borderliner`, yet both have `adequate Trainability`. The prediction that it would track standing was wrong, and the report's actual phrasing — *"Low-Borderliner / **though shows good/adequate potential**"* — is the most product-relevant sentence on the page: a candidate who scores low but is worth coaching. That is precisely the judgement a preparation product exists to make, and precisely the one a selection-band verdict would obscure.

**Amended again 2026-09-23, after a third report (cand-09, the strongest candidate in the corpus). A second blind test scored 17 correct / 3 partial / 7 wrong, and two of the wrong answers overturn what the second amendment concluded.**

**1. "Boilerplate" was wrong — it is a modulated template.** Every sentence recorded as fixed text moved for a stronger candidate: `maintain cheerfulness at all times` became `maintains cheerfulness ALMOST at all times`; `bolder in risky situations (shows traces of restricted courage)` became `more bolder in few dynamics & risky situations`, the parenthetical simply dropped; `mental awareness is LOW AVERAGE` became `JUST AVERAGE`.

The two-sample reading — identical text cannot be coincidence — was wrong because the two candidates were merely close enough in ability to receive the same qualifiers. **The frames recur; the judgements inside them are the candidate's.** `src/scoring/report/template.ts` has been corrected from `BOILERPLATE` to `FRAMES` with a `modulated` flag, and the tests that asserted the old model now assert the new one.

**2. Trainability does not discriminate.** Three candidates — Low-Borderliner, High Borderliner, High Borderline — all scored **`adequate Trainability`**. The amendment above treated trainability as the coaching signal this product should emit. At n=3 that field carries no information.

The field that *does* move is the **potential qualifier**: `adequate potential` → **`good potential`** for the strongest candidate. But that sits inside the standing verdict, which this decision declines to emit because it predicts a selection outcome.

**This is an unresolved tension, and it is recorded as one.** The only discriminating summary judgement the assessor makes is the one we have chosen not to reproduce. Either Layer 5 emits a coaching-grade judgement of our own construction — evaluated against the potential qualifier rather than copying it — or the product ships without a summary verdict at all. That choice is not made here.

**3. RETRACTED — the tick-count rule.** It was claimed that the report's top TAT band equals the number of ticked stories, on three exact matches. Tested properly it fails: it matched cand-04 (6/6), matched cand-09 in *count only* while the two sets differ, and failed cand-01 outright (04 in the report against 0 ticks).

What does hold is the **LOW band read off the verdicts** — cand-01 7=7, cand-09 3=3, cand-04 3 against a reported 4. Two exact and one off by one: a real rule with an error bar, rather than a coincidence. The lesson is that a pattern holding on two samples must be tested against the third as a SET, not as a count.

**Revisit if.** More reports arrive and show the structure is not fixed, or LWS confirm the standing vocabulary, at which point the band becomes enumerable and the decision not to emit it can be re-examined on its merits rather than on caution.

---

## D16 — Reports may only use what the product will actually have

**Date:** 2026-09-23 · **Status:** Accepted

**Context.** The first generated reports for a candidate were built from the human assessor's marginalia — his verdicts, his ticks, his written notes ("the assessor wrote *ADO: Distract, Disarm, Overpower*", "marked *Theme is Good*"). They also compared the candidate against his cohort: *"eight of ten candidates wrote a lift"*, *"the strongest in your batch reached 27–29"*.

Both are wrong, and neither was caught by any test.

**None of the assessor's marking exists in production.** The system receives a stimulus and a response. A report that leans on ground-truth marks is one the system cannot actually reproduce — it demonstrates nothing, and it would fail the moment it met a real candidate.

**Cohort comparison is not the candidate's to be told.** He has no access to his peers' work, and their performance is not his feedback. It is also the kind of detail that circulates.

**Decision.** Generated reports may use only:

- the candidate's own responses — quotable back to him, they are his
- the stimulus — under [D8](#d8--generate-our-own-ppdt-and-tat-imagery) we author the imagery, so its content is known by construction
- the rubric — our derived standard, generalised
- Layer 1 counts and Layer 2 lexical findings

They may **not** use the human assessor's marks, verdicts or marginalia, and may **not** compare the candidate to any other candidate.

Stating a *standard* is fine and necessary — "19 attempted against an expected 45+" teaches; "the strongest in your batch reached 27–29" does not. The first is the rubric, the second is somebody else's sheet.

**Consequences.** The rebuilt reports re-derive every judgement from the candidate's twelve stories against the rubric — including the theme classification, the perception mismatch (his story compared against the known slide content, not against the assessor's flag), and the tentative-verb finding (lexical scan of his own text). They read as the product's own work because they are.

This also makes the corpus reports usable for what they are actually good for: **evaluating** a generated report, never supplying its content.

**Revisit if.** Never for the cohort rule. The assessor-marks rule relaxes only for a human-in-the-loop view where a reviewer is deliberately shown both — and that is a reviewing tool, not a candidate deliverable.

---

## D17 — Multiple assessors are expected; the record is kept per-rater

**Date:** 2026-09-23 · **Status:** Accepted

**Context.** Everything derived so far comes from **one marker** — Commandant Yogesh Dutta (Retd), one batch, 31 July 2026. That was recorded throughout as a hard ceiling: *"no inter-rater reliability is obtainable from this corpus at any price"*.

Further assessors will be supplied. That ceiling is therefore temporary, and several conclusions currently stated as findings are really judgements made in the absence of a second opinion.

**Decision.** Keep the record rater-aware from now on, so a second assessor's marking slots in rather than forcing a rewrite:

1. **Every record carries an `assessor` key.** All eleven currently read `yogesh-dutta`. A different marker gets a different id.
2. **Calibration names its sources.** `CALIBRATION_SOURCES` in `calibration.ts` lists the raters behind every number, and `IS_SINGLE_RATER` / `BASE_RATE_IS_PROVISIONAL` flip automatically when a second is added.
3. **Do not pool.** Compute per rater first, then compare, then decide whether pooling is meaningful. Pooling on arrival destroys the only comparison worth having.
4. **[`corpus/SECOND-ASSESSOR-LEDGER.md`](./corpus/SECOND-ASSESSOR-LEDGER.md) is the checklist.** Every single-rater-contingent conclusion is listed there with the specific test a second assessor settles — no re-derivation needed.

**Consequences.** Three classes of conclusion are now explicitly provisional rather than quietly presented as fact:

- **Judgements made for want of a second opinion.** Chiefly [D14](#d14--separate-assessor-doctrine-from-academy-house-style-and-score-only-doctrine) — the doctrine versus house-style split. That was decided *because* one marker applied his own tense rule three different ways. With two markers it stops being an interpretation and becomes a measurement: a rule both apply is doctrine, a rule only one applies is house style.
- **Numbers that are one person's threshold.** The 52% low-theme base rate most of all. It corrects a default that was demonstrably too generous, and that much is safe. How much of it is the SSB standard rather than this marker's severity is unknowable at n=1.
- **Claims that become false.** "No inter-rater reliability obtainable at any price" is now scoped to the 31 July batch rather than asserted of the corpus.

A second assessor also gives the D5 eval something it currently lacks: **an agreement ceiling**. A judge scoring 75% against one marker has no reference point. If two markers agree with each other 80% of the time, 80% is the ceiling, and a judge at 75% is close to it rather than mediocre.

**Revisit if.** A second assessor's rate differs materially from the first, at which point the base rate becomes a per-rater value with a stated spread rather than a single constant, and `CODEBOOK.md` has to separate the shared standard from the personal one.

---

## D18 — Seven runner modes, not one UI per test

**Date:** 2026-09-24 · **Status:** Accepted

**Context.** The product must eventually run every SSB instrument — OIR, PPDT, TAT, WAT, SRT, SDT, lecturette, interview, GD, GPE — for three kinds of user. Built naively that is fifteen screens, each with its own timing logic, its own persistence, its own tests, and a psych suite where every instrument is bespoke. Nothing in `ARCHITECTURE.md` or `ROADMAP.md` said how the front end should be shaped; the stack was fixed (§10) but not the form.

**Decision.** Every instrument is an instance of one of **seven interaction modes** — Booklet, Forced sequence, Stimulus → write, Free-write, Form, Speak, Room — and the mode, not the instrument, is what gets designed, built and tested. The full table, the per-mode contracts and the universal timing rules are in [`UI.md`](./UI.md) §3; it is now the fourth planning document.

Three rules come with it and are recorded here because they are the ones that would otherwise erode:

1. **The deadline is server-issued and never pauses.** A client-side timer means a refresh buys free time; for WAT that is the whole test. Autosave is per item, because in two of the modes the item is gone the moment it advances.
2. **Roles: four in the schema, three in the UI.** `mentor` and `org_admin` are one staff experience; `org_admin` and `superadmin` are never merged, because an academy owner must not see another academy's students. That is the Sprint 1 RLS gate.
3. **One report reader, layered by role.** Student and staff see the same component; the staff layer is a permission, not a second view. Cohort comparison — forbidden on the candidate's reader by [D16](#d16--reports-may-only-use-what-the-product-will-actually-have) — is permitted on the staff batch rollup, and only there.

**Consequences.**

- Sprint 2 builds Booklet through OIR and SRT is free. Sprint 4 builds Stimulus → write through PPDT and TAT is nearly free. Phase 1's "full psych suite" becomes two small modes plus configuration.
- Mode contracts are the test suite: "Forced sequence cannot navigate backwards" is one assertion, not one per instrument.
- A superadmin *Assessors* section is needed and was not in the roadmap — it is [D17](#d17--multiple-assessors-are-expected-the-record-is-kept-per-rater) made visible, and it is where supplied assessor reports land.
- The student navigates by SSB day, never by our phase or sprint numbers.
- The OLQ view is an evidence-backed list, not a radar chart. The vector is partial by design (`ARCHITECTURE.md` §3.1); a radar draws the missing spokes and fabricates data, and would imply the psychometric precision §9.1 disclaims.

**Revisit if.** An instrument arrives that fits none of the seven without a contract exception — at that point add a mode, do not special-case a test. Or if the Sprint X bake-off picks one-pass vision OCR, which changes Stimulus → write's correction phase.

---

## D19 — Item statistics are stored per sitting and pooled at read time

**Date:** 2026-09-24 · **Status:** Accepted · **Amends** `ARCHITECTURE.md` §4

**Context.** `ARCHITECTURE.md` §4 sketches `item_stats` as one pooled row per item — `attempts, correct, p_value, discrimination` — and says the model "ports the one already proven in `Question_Bank/ITEM_STATS.md`". Reading that document before porting: the pooled-row design is the one Question_Bank *first* shipped (their `questions.attempt_stats`, migration 0010) and then had to undo, because **a pooled number cannot be un-pooled.** When a sitting turns out to be invalid you subtract it; when a key is corrected, every row measured under the old key is stale. Neither is possible against a running total.

**Decision.** `src/items/stats.ts` follows the corrected pattern, not the sketch:

1. **Storage grain is the sitting.** One `SittingRow` per (item, session) — seen, attempted, correct, choice counts, the top/bottom-27% split computed *within* that sitting, and `keyAtMeasurement`.
2. **Pooling happens at read time**, in `aggregate(rows, currentKey)`. Rows whose `keyAtMeasurement` differs from the current key are dropped and counted as `staleDropped`. `currentKey` is a required argument so the staleness rule cannot be forgotten at a call site.
3. **p-value is correct / attempted, never / seen.** Dividing by seen makes an easy-but-avoided item read as hard.
4. **Discrimination pools as counts, never as a mean of per-sitting rates**, so a 100-candidate sitting outweighs a 10-candidate one.
5. **Absence is `null`, not `0`.** No rows, nothing attempted, no sitting with a split — each yields `null`. A zero would assert a measurement that was never made.
6. **Leads** (`computeLead`) flag items where a distractor outpulls the key or the key was chosen by nobody, gated at `MIN_N_LEAD = 10` attempts because a ratio needs volume to mean anything.

Dropped from the port: the tracker/vault two-source split, cohort exposure and the verdict-mismatch reason. One source here; batches are a staff concern (UI.md §5.2).

**Consequences.** The `item_stats` table in `ARCHITECTURE.md` §4 becomes a sitting-grain table (one row per item per session) when Sprint 1's migration is written; no pooled column exists. Superadmin's *Item bank* section (UI.md §5.3) reads through `aggregate`, never a stored total. The first ~150 OIR items will have `n` far below the lead gate for a long time, and the UI must say "not yet measured" rather than render a p-value from three attempts.

**Revisit if.** A second data source appears (an academy running the same items offline, say) — then the `bySource` breakdown comes back from the original.

---

## D20 — The interface shares PYQVault's palette; the runner is dark in both modes

**Date:** 2026-10-12 · **Status:** Accepted

**Context.** UI.md left visual design open until the shape was fixed. Two defence-themed directions were prototyped (an "Ops Room" in gunmetal and brass; a "Field Manual" in sand, ink and oxblood). The user chose the second, then asked mid-build to keep the colours, theme and fonts of PYQVault (`Question_Bank`) instead, because it reads clean.

**Decision.**

1. **Palette and type are PYQVault's**, token for token: navy text `#0F1D4A`, royal-blue brand `#1D4ED8`, tinted page `#F5F7FB` under white cards, a navy dark mode, Inter for the interface and Source Serif 4 for a candidate's own words. The two products read as one family.
2. **The military register comes from structure, not colour:** navigation by SSB day, spaced capitals for labels ("DAY 2 · PSYCHOLOGY"), a range-reticle mark. No crests, insignia, emblems or service colours — we are not affiliated with any service, and the honest-claims policy (`ARCHITECTURE.md` §9) covers implied affiliation too.
3. **The runner has its own tokens (`--runner-*`) and is dark in both modes.** UI.md §4 says the change of chrome is how the candidate knows the clock is real; a change of ground makes it unmistakable.
4. **A navy surface (`--navy-*`) carries the premium register** — side rail, phone header, Home hero, end-of-test summary — in PYQVault's logo navy. Royal blue measures ~2.2:1 on it, so the primary button on navy is white, never brand blue (the contrast test caught this).
5. **`src/ui/__tests__/theme-contrast.test.ts` is the gate**, ported from Question_Bank with the runner pairs added: every text pair ≥ 4.5:1 and every focus ring or timer mark ≥ 3:1, in both modes, read from `globals.css` as it ships.

**Consequences.** The Field Manual canvas is now a record of the structure, not of the palette. A rebrand is one file (`src/app/globals.css`) plus the identity assertions in the contrast test.

**Revisit if.** The brand (ROADMAP blocker 7) is settled and diverges from PYQVault's.

---

## D21 — Candidates are named by id everywhere that is committed

**Date:** 2026-10-12 · **Status:** Accepted

**Context.** Preparing the first commit showed that `.gitignore` protected `corpus/records/` only. Real candidate names — minors, beside their psychological writing — sat in sixteen committable files: the assessor's reports (`corpus/reports/*.docx`), a script built for one candidate, the hand-derived findings, the corpus analysis docs, this file, and comments and data in `src/`. A name in git history can only be removed by rewriting it.

**Decision.**

1. **Ids, not names.** Every committed reference is `cand-01` … `cand-11`, numbered as `corpus-counts.json` already was (records sorted by file name). The mapping is `corpus/records/PSEUDONYMS.md`, inside the ignored folder. Earlier decisions in this file were edited for this one purpose; nothing else in them changed.
2. **Whole files that are about one named person stay out:** `corpus/reports/`, `corpus/report-findings.json` (it quotes each candidate's own responses), `scripts/build-candidate-docx.mjs`.
3. **Tests that needed real data now use a synthetic sample** (`fixtures/findings-sample.json`: the real shapes, every string replaced). Checks that only make sense against the real data — every real findings entry parses; the rubric contains no candidate name — run with `it.skipIf` when the private files are absent, so a fresh clone stays green.
4. **A story hero who shares the writer's name** is written `[hero]`, not an id: the coincidence is itself identifying.

**Consequences.** Short quoted fragments of candidates' writing remain in `corpus/CODEBOOK.md`, `COVERAGE.md`, this file and the lexical tests, unattributed. The assessor's name (`yogesh-dutta`, D17) is unchanged — an adult professional and a rater key, not a candidate.

**Revisit if.** The corpus grows past the point where a short quote plus an id could identify someone in a known batch, or a candidate asks for deletion (ROADMAP open question 4).

---

## D22 — Offline answer sheets: the app keeps the clock, the candidate writes on paper

**Date:** 2026-10-12 · **Status:** Accepted · **Amends** [D3](#d3--defer-the-ocr-bake-off-to-sprint-x), [D7](#d7--the-sample-corpus-is-self-harvesting), `UI.md` §3.1

**Context.** WAT, SRT, TAT, PPDT and SDT are handwritten at the real SSB, and academies run them on paper (this corpus arrived as paper dossiers). Typed answers on a phone train a different skill — `ARCHITECTURE.md` §9.4 forbids a "realistic simulation" claim until handwriting ships. Question_Bank already runs a checked-answer-sheet service (its migration 0153) whose upload, storage and grading patterns carry over.

**Decision.**

1. **Two ways in, app-timed first.** *Paper mode:* the runner shows the stimulus on the real clock with no answer field; the candidate writes on a sheet and uploads photos. *Self-timed upload* (academies, printed booklets): no timing evidence, so it is labelled self-timed and never presented as equivalent.
2. **A session code ties sheet to session.** Six characters, `XXX-XXX`, from an alphabet without the pairs handwriting confuses (0/O, 1/I/L, 5/S, 8/B, 2/Z). Shown before the clock starts, printed on every page of the sheet. A scan that does not carry the code is the wrong sheet.
3. **Paper mode shows the line number, never the total.** An exception to UI.md §3.1's "must not show word 23 of 60", for paper only: the real deck numbers its words, and the corpus shows what happens without it — one sheet ran to 62 rows against 60 words and four answers landed against the wrong stimulus.
4. **Printable sheets** (`/sheets/[instrument]`): numbered lines, the code on every page, "leave a line blank, never skip it", and no name field (D21). Print CSS, no PDF library.
5. **Reading is done by people with AI first, automated later.** Candidates upload; at the end of each day the sheets are transcribed and analysed in a working session with a vision model, against a playbook — Question_Bank's `GRADING.md` routine. The API pipeline is built only once that has proven useful. Transcripts enter the existing scorer as text (seam rule 3), with `responses.source = 'handwritten_ocr'`.
6. **Upload follows Question_Bank's 0153 patterns** when storage exists: signed-URL direct upload (Vercel's 4.5 MB request limit), private bucket with no storage policies and its own size/type limits, a database-enforced submission state machine, consent recorded, rejection with a fixable reason, scans deleted soon after transcription (≤ 30 days; the transcript stays).

**Consequences.** Paper mode and printable sheets ship now; the upload step says "arrives with accounts" until Supabase exists (ROADMAP blocker 1). Every uploaded sheet is a time-pressured handwriting sample paired with a session — D7's corpus, sooner, from paper mode rather than as a by-product of typed PPDT. D3's revisit trigger ("a corpus arrives earlier") will fire on its own.

**Revisit if.** End-of-day transcription load outgrows a session (then the API pipeline and the Sprint X bake-off), or self-timed uploads start being read as timed.

---

## D23 — Staff create logins in the app; the database decides who may create whom

**Date:** 2026-10-12 · **Status:** Accepted

**Context.** Sign-in is manual (no self sign-up; Google later), so every account is made by someone. A command-line script only serves whoever holds the service key. Question_Bank solved staff-created student logins and, on 2026-10-06, closed the hole that came with it: a staff "create" that wrote to an EXISTING account let any teacher take over any student.

**Decision.**

1. **Who may create whom is a database function**, `can_create_person(role, academy)` (0003), called as the signed-in user before any service-role write. Superadmin: anyone (staff need an academy). Academy owner: candidates and mentors in their own academy. Mentor: candidates in their own academy (the user's choice). Candidate: no one. Academies are created only through `create_academy()` (0004), superadmin only.
2. **An existing email is never touched** — no password write, no profile write. The auth server refuses it (`email_exists`) and the screen reports "already has an account — not changed".
3. **Passwords are generated, shown once, and never stored or emailed.** Staff copy or print them.
4. **`profiles.email` is a copy** written once at creation, so staff can list their people under row level security. `created_by` and `guardian_consent_recorded_by` record who acted.
5. **Staff add people by pasting a list** (name, email, date of birth; commas or spreadsheet columns; Indian date formats). Guardian consent for the under-18s in a list is one checkbox, recorded with who ticked it.

**Consequences.** `people.db.test.ts` holds the whole matrix and the "existing account untouched" check; the browser walk proves the original password still works after a "create" of the same email. `npm run user:create` stays for bootstrapping the first superadmin.

**Revisit if.** Google sign-in arrives (accounts may then be created by the person, and staff would invite rather than create), or academies need password resets — which must be built with the same never-touch-another-academy rule.

---

## D24 — OIR items come from a published book, word for word, with keys we derive until the book's key is checked

**Date:** 2026-10-12 · **Status:** Accepted · **Closes** ROADMAP blocker 2

**Context.** OIR needs roughly 400 verbal and 400 non-verbal items (ROADMAP, the content lift). The owner supplied 44 photographed pages of the Agrawal ExamCart OIR book (Reasoning: 11 chapters, ~1,150 verbal MCQs, no figures, and no answer key in the pages supplied). The book's questions are the kind candidates practise everywhere; the owner chose to use them as printed. Writing original items in the same style (Question_Bank's IMAT "twins") stays open if it is ever needed.

**Decision.**

1. **Transcribe verbatim, never edit the transcription.** `content/oir/<book>/<chapter>.source.json` is the page as printed, typos included. Every deviation lives in the key file, declared: a stem fix (`stemFix`), a direction that does not fit its section (`direction`), a character read differently from the photo (`misread`). The WAT deck's rule (content/README.md), applied to OIR.
2. **Derive the key, and make the derivation runnable.** `src/items/oir/<book>-<chapter>.ts` gives each answer its rule in words and, wherever possible, as code: a number series is regenerated from its rule, a wrong-number series must differ from the print in exactly one place, a letter series is filled and tested for its pattern. A key is accepted only when its rule fits the print **and no other option fits the same rule**. Planting three wrong keys and one mis-copied template made exactly those four checks fail.
3. **Hold what cannot be answered as printed.** Misprints, a blank count that does not match the options, or no rule found: the question is listed with its reason (and a lean, if a misprint points one way) and never seeded. Chapter 11: 7 of 125 held.
4. **`key_basis = 'derived'`** on every key until the book's key arrives; then each disagreement is resolved and the row says `book` or `derived_and_book`. `confidence: medium` (6 in Chapter 11) marks the ones to compare first.
5. **Two tables (0005).** `items` (stem, options, direction) is readable by any signed-in user, active items only. `item_keys` has no grant at all: only the server reads answers, so a candidate cannot look a key up mid-test. A CHECK refuses a payload that carries its key.
6. **A printed direction travels with each item** (`OirPayload.direction`): "18, 36, 109, 432, 2160" cannot be answered without "find the wrong number".
7. **Difficulty is 3 for every book item**, the declared "unrated" midpoint, until item statistics (D19) measure it.

**Consequences.** Chapter 11 (Series) is seeded: 118 items. The other ten chapters follow the same path; Chapter 5 (two five-option questions) and Chapter 10 (questions sharing a passage) need a format change first (SUGGESTIONS.md). Ids are permanent (`oir-agx-ch11-q013`): a corrected key or stem replaces the row in place.

**Revisit if.** The book's key disagrees with more than a few derived keys in a chapter (then the derivation method, not just the rows, needs review), or the owner wants original items instead.

---

## D25 — Access is layered: each role reaches its own area and every area below it

**Date:** 2026-10-12 · **Status:** Accepted · **Supersedes** the "each role in its own area" reading of UI.md §2

**Context.** Each role was confined to one area: a mentor asking for `/` was sent to `/staff`, the superadmin to `/admin`. The owner wants the superadmin to see what staff and students see, and staff to see what students see — to know the product their candidates use, and to run an academy without logging in as its owner.

**Decision.**

1. **Areas stack** (`routing.ts`, `areasFor`): candidate → student; mentor and academy owner → staff, student; superadmin → admin, staff, student. Sign-in lands on the first (own) area. A switcher in the sidebar and the phone header lists exactly these; a candidate has one area and sees none.
2. **Reaching an area never widens whose rows you read.** Row level security is unchanged; the switcher only decides which screens render.
3. **Staff in the student area use it as themselves** (the owner's choice over "view as a candidate"). They take tests on the real clock. `start_session` (0006) skips the date-of-birth and guardian-consent checks for non-candidates and sets `sessions.by_staff` from the caller's role — never from the caller. Results and item statistics (D19) must leave `by_staff` sessions out. The student area says so in one line: "Staff view. Your tests aren't counted."
4. **The superadmin picks an academy for the staff area** (the owner's choice over a merged all-academies view). The pick is an httpOnly cookie, `acting_org`, set by a server action and honoured only when it names an academy that exists (`acting.ts`, tested). It is never read for staff: they always work in their own academy, and a planted cookie was checked not to move a mentor. Adding people from there binds the picked academy; `can_create_person` still decides.
5. **Admin stays the superadmin's alone.** An academy owner is never shown another academy (UI.md §2's tenancy rule stands).

**Consequences.** `access.db.test.ts` proves a mentor and the superadmin can start, save and end a WAT flagged `by_staff`, that a candidate's session is not flagged, and that a candidate cannot set the flag. The browser walk covers the switcher at three roles, the picker, people created into the picked academy, and a mentor's flagged WAT. The `not_a_candidate` refusal now means only "a login with no profile".

**Revisit if.** Staff need to see a *specific* candidate's student view (a read-only "view as", which would need its own audit trail), or academies want their staff's practice runs counted somewhere.

---

## D26 — OIR chapter practice: untimed, the key shown after each answer, kept apart from tests

**Date:** 2026-10-12 · **Status:** Accepted

**Context.** The owner asked for chapterwise practice and timed mocks, after Question_Bank's chapter tests and drill. Only Chapter 11 (Series, 118 items) is seeded, so a "full" OIR mock today would be 40 series questions. The Booklet contract (UI.md §3.1) forbids revealing correctness before submission, and practice exists to do exactly that.

**Decision.**

1. **Timed mocks are held** (the owner's choice) until more chapters are seeded; then they are fixed, committed booklets as in Question_Bank (SUGGESTIONS.md has the plan). The catalogue keeps OIR "Coming" and says so on the practice page.
2. **Practice is not a runner mode and never a session.** It has no clock and reveals at once, so it lives outside the seven modes and the Booklet contract stays intact for tests.
3. **The key arrives only after an answer.** `answer_practice` (0007) records the answer, then returns the key and its rule for that one item. Nothing else lets a signed-in user read `item_keys`. Once practised, a question's key is known to that candidate; a mock drawn from the same bank will repeat questions, as Question_Bank's chapter tests repeat past papers, on purpose.
4. **A chapter is a reasoning type** (`src/oir/chapters.ts`), not a book's page range, so a second source joins the same chapter. Every reasoning type in the seeded bank must be listed (tested).
5. **Every answer is kept** in `practice_answers`, retries included; a question counts by its latest answer. Sets: New (unanswered), Retry wrong (latest wrong), All. Readable as sessions are (self, own academy's staff, superadmin). `by_staff` is set by the database from the caller's role (D25).
6. **The consent rule is `start_session`'s**: an under-18 candidate needs recorded guardian consent before an answer is stored.
7. **Practice answers are not sittings** (D19): they were given with feedback one item at a time, so item statistics never read them.

**Consequences.** `/practise/oir` lists chapters with progress; `/practise/oir/[chapter]` serves one question at a time (letters A–D answer, Enter moves on). `practice.db.test.ts` (8) gates the table and the function. Two new tokens, `--correct` and `--incorrect`, are gated in both modes by `theme-contrast.test.ts`.

**Revisit if.** Candidates want a timed chapter drill (Question_Bank's sectional tests) before full mocks exist, or academies want practice progress in the staff app (the read policy already allows it).

---

## D27 — A book name that matches a real candidate's is replaced, not transcribed

**Date:** 2026-10-12 · **Status:** Accepted · **Narrows** D24 point 1 (verbatim transcription) where it meets D21

**Context.** OIR Chapter 9 Q12 names a character with a common first name. It is the book's invention, but it is also a real candidate's first name, and the D21 scan (`no-candidate-names.test.ts`) refuses any candidate name part in a committable file. Blood Relation, Direction Sense and Seating will bring many more common first names. The owner chose to swap the name over allow-listing book files in the scan (which would blind it there) or holding the question.

**Decision.**

1. **Swap, in every committed file.** A book name that collides with a candidate's is replaced with a neutral name that does not collide (the scan proves it). The question, its key and its rule use the new name.
2. **Declare it, without the original.** The question carries `"renamed": true` in the source file and the source note cites D27; the original name is not written anywhere committed. The chapter suite fails if a renamed question's note does not cite D27.
3. **The scan stays strict.** No allow-list. A collision is fixed in the content, never by weakening the guard.

**Consequences.** Chapter 9 Q12 now reads "Rakesh". Transcriptions are verbatim except for typography noted in each source file and these declared swaps.

**Revisit if.** A swap would change a question's logic (a name whose letters or gender the question depends on); then hold the question instead.


---

## D28 — A number figure is shown as its tables, or described in words when it cannot be tabled

**Date:** 2026-10-13 · **Status:** Accepted · **Extends** D24 point 1 (verbatim transcription) to Chapter 12's figures

**Context.** Chapter 12 (Find the Missing Term) prints most questions as figures: number grids, crosses, boxes, trees, triangles, circles. As one line of text a grid ("13 26 39 / 30 42 ? / 17 16 15") is hard to read, and a tree cannot be written at all. The owner chose drawing grids as tables over holding them.

**Decision.**

1. **Grids are transcribed cell by cell.** An OIR payload may carry `tables`: a list of tables, each a list of rows, `""` a blank cell (a cross is a 3 × 3 table with blank corners). `stem` still holds the same numbers as text, rows split by " / " and figures by " // "; the chapter suite checks the two agree. The practice screen draws the tables in place of the stem, the gap marked.
2. **Other figures are described in words, in a fixed form** ("27 over 3 and 6"; "clockwise from the top left: F, C, ?, I, L, A"). The source note declares it. A figure that cannot be read is held.
3. **A stem keeps its line breaks.** An equation or list printed on its own line shows on its own line.

**Consequences.** 59 of Chapter 12's 79 questions carry tables; 17 are described. `bank.ts` validates `tables` (no empty table, no ragged row, something printed). Chapter 13 sets each equation on its own line.

**Revisit if.** Non-verbal chapters arrive: they need images (`assetPath`), not tables or words.

---

## D29 — Figure questions are redrawn as lines and counted by code where they can be; cut from the photo only where they cannot

**Date:** 2026-10-13 · **Status:** Accepted · **Extends** D24 (verbatim, keys derived) to the non-verbal chapters

**Context.** The non-verbal chapters (16, 18-28, about 820 questions) are drawings, supplied as phone photos: skewed, curved, with the facing page showing through. Cut out, they read; but no key could be checked, so every one would rest on reading a picture by eye. The owner asked whether they could be redrawn, saw a five-question trial, and chose to redraw.

**Decision.**

1. **Redraw where the answer can be computed from the drawing.** An OIR payload may carry a `figure`: straight lines and circles (`src/items/oir/figure.ts`, validated in `bank.ts`). Counting Figures, mirror and water images, cubes and dice, paper folding and Venn diagrams fall here. The practice screen draws the figure as SVG in the text colour, so it follows the theme; `stem` describes it in words for screen readers.
2. **The key is computed from the figure that ships.** `countTriangles`, `countSquares` and the rest read a figure as a candidate does: corners where lines meet, joined along drawn lines. A mis-drawn figure changes the count, which then matches no option and fails the chapter test. Dropping any one line from Chapter 28's figures was caught 569 times in 643.
3. **Every redraw is checked against its photo** on an overlay sheet (the redraw laid over the photo, line for line) before it ships.
4. **A redraw that matches its photo but counts to no option is held**, never adjusted to fit. The book's key settles it.
5. **Cut from the photo, not redrawn,** where a drawing cannot be computed on: figure series, analogy, classification, pattern completion, embedded figures. Those keys are read by eye and checked against the book's key first.

**Consequences.** Chapter 28 ships 42 of 50 (8 held: one unreadable, one with squares the photo cannot tell from rectangles, one in arcs, five that count to no option). Its items are `oir_nonverbal`. Counts tolerate stored figures being rounded to four decimals (tested).

**Revisit if.** Flat scans or the book's answer key arrive (the held questions, and a second check on every count), or arcs are needed (Chapter 28 Q37, paper folding).

**Addendum 2026-10-13 (Chapter 18, picture answers).** Dice are drawn as views (top, and the faces left and right of a corner) and nets (`dice.ts`); the solver keeps only real cubes that show every view the right way round. Some printed dice cannot all be shown by one real cube (a view in mirror image of another); there the exam's method is keyed (a face's opposite is the one never seen beside it) and marked medium. Marks whose turn on the face decides the answer (half-shaded faces, arrows) are held. Options that are drawings ship as `answerPanels`, one drawing per option inside its button, the option text describing it in words.
