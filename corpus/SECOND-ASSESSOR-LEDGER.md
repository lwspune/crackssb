# Ledger — what a second assessor settles

Every conclusion below was reached from **one marker**, Commandant Yogesh Dutta
(Retd), on **one batch**, on **31 July 2026**. Each is either a judgement made
because no second opinion existed, or a number that is currently one person's
threshold.

This is the checklist to run the moment a second assessor's marking arrives.
Nothing here needs re-deriving from scratch — each row names the specific test.

---

## A. Decided by judgement, because there was no second opinion

| # | conclusion | where | the test |
|---|---|---|---|
| A1 | **`He must`/`He should` is doctrine; past/present tense is house style** | [D14](../DECISIONS.md) | Does the second assessor correct modal obligation? Does he correct bare tense? A rule both apply is doctrine; one only the first applies is house style. This was decided *because* the first marker applied the tense rule three different ways — with two markers it becomes measurable |
| A2 | `avoid TRY` is doctrine | D14 | Same test |
| A3 | WAT personal pronouns and WhatsApp abbreviations are house style | D14 | Same test |
| A4 | The withholding filter is our editorial default, not an observed rule | `template.ts` `NEVER_IN_REPORT` | Does the second assessor's report carry trait attributions the first withheld? One report already broke the categorical version |

## B. Numbers that are one person's threshold

| # | value | where | the test |
|---|---|---|---|
| B1 | **Low-theme base rate = 52%** | `calibration.ts` | Recompute per assessor. If they differ materially, the constant becomes a per-assessor value and the aggregate needs a confidence interval, not a point estimate |
| B2 | **Incompleteness folds into the low-theme band** | `calibration.ts` | Does the second assessor's phrasing couple them the same way? |
| B3 | SRT target of 45+ | `thresholds.ts` | Is 45 this academy's standard or this marker's? |
| B4 | SDT length rule, 80–90 words | `thresholds.ts` | Same |
| B5 | The five-point grade vocabulary (`LOW` → `V. good`) | `contract.ts` | Does a second assessor use the same words? If not, the grade scale is a house vocabulary and the judge's target changes |
| B6 | The three-band standing scale | `template.ts` | Same |

## C. Claims that become wrong the moment a second assessor exists

| # | claim as currently written | correction needed |
|---|---|---|
| C1 | "No inter-rater reliability is obtainable from this corpus **at any price**" — `README.md`, `COVERAGE.md`, D12 | Becomes false. Rewrite to "not obtainable from the 31 July 2026 batch alone" |
| C2 | "One assessor, one day, 11 candidates — **confirmed by LWS, no second marker**" | True of that batch only. Scope it to the batch rather than the corpus |
| C3 | D5's eval is described as measuring agreement with "expert ratings", singular | With two raters, the ceiling on any judge is inter-rater agreement itself. A judge cannot be expected to exceed the humans' agreement with each other |

## D. What a second assessor makes possible for the first time

- **An agreement ceiling.** Currently a judge scoring 75% against one marker has
  no reference point. If two markers agree with each other 80% of the time, then
  80% *is* the ceiling and a judge at 75% is close to it.
- **Separating the rubric from the marker.** Everything in `CODEBOOK.md` is
  currently "what this assessor does". Two markers let the shared part be
  isolated from the personal part — which is what a product should teach.
- **Testing D14 instead of arguing it.** The doctrine/house-style split is the
  single most consequential judgement made here, and it is currently one
  person's inconsistency interpreted by us.

---

## Recording convention for new assessors

Each report carries `signed_by`. Going forward every record should also carry an
`assessor` key so marks can be grouped by rater, and calibration recomputed per
rater rather than pooled. Three records currently carry `signed_by`; the rest
were transcribed from answer sheets that bear no signature, and all eleven are
from the same marker.

**Do not pool a second assessor's marks into the existing counts** until the
per-rater figures have been compared. Pooling first destroys exactly the
comparison this ledger exists to make.
