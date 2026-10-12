# Corpus coverage — what is done and what is not

All 11 sheets transcribed. **923 typed assessor marks.** TAT verbatim text is
now **complete for every story that exists on a scanned page**.

| candidate | chest | TAT marks | TAT text | not recoverable | other instruments |
|---|---|---|---|---|---|
| cand-01 | 8 | complete | **12 / 12** | — | SDT ×5, WAT/SRT sampled |
| cand-02 cand-02 | 2 | 1 verified, 11 unreliable | **11 / 11 attempted** | story 4 left blank | SDT ×5, WAT/SRT sampled |
| cand-03 | — | complete | **10 / 10 present** | stories 3–4, sheet page 2 missing | SDT ×5, WAT/SRT sampled |
| cand-04 | 3 | complete | **12 / 12** | — | SDT ×5, SRT sampled |
| cand-05 | 11 | complete | **6 / 6 attempted** | stories 9–10, sheet page 5 missing; 4 and 12 blank | SDT ×3, SRT sampled |
| cand-06 | 5 | complete | **12 / 12** | — | SRT summary |
| cand-07 cand-07 | 6 | complete | **12 / 12** | — | SRT summary |
| cand-08 Chodhary | 9 | complete | **11 / 11 attempted** | story 6 left blank | SRT summary |
| cand-09 | 1 | complete | **12 / 12** | — | SDT ×3, SRT sampled |
| cand-10 | 4 | complete | **12 / 12** | — | SRT summary |
| cand-11 cand-11 | 10 | complete | **12 / 12** | — | SRT/SDT summaries |

**124 TAT stories carry both verbatim text and the assessor's mark**, spread
8–11 per slide. That is the paired eval set (`npm run evalset`).

## Truncated stories are scorable, not excluded

Eight stories end mid-sentence: cand-02 5, 6, 10, 11 and cand-03 6, 8, 10, 11.
**The candidate stopped there** — seven of the eight are marked `incomplete` by
the assessor in so many words. They carry `truncated_by_candidate: true` and are
kept in the eval set, because a judge should reach the same conclusion the
assessor did.

This distinction matters and was got wrong once. An earlier eval run detected
"abridged" stories by looking for an ellipsis, which conflated genuine candidate
truncation with *transcription* abridgement in cand-04's record. Those seven
abridged transcriptions have since been replaced with full text, so the ellipsis
now means only one thing.

## What still remains

- **Not recoverable:** cand-03 stories 3–4 and cand-05 stories 9–10, lost with
  missing sheet pages. Four further stories were left blank by candidates.
- **WAT and SRT item text is sampled, not exhaustive**, on every sheet.
- **SDT verbatim text exists for 5 candidates** of 11.
- **cand-02's 11 unverified TAT marginal marks** still need a 600 dpi re-read;
  they are flagged `"confidence": "unreliable"` rather than carried as fact.

None of this blocks the codebook, Layers 1–2, Layer 4 or the bake-off.

## Assessor reports

**One typed one-page Psychologist Report** exists in the corpus, for cand-04
cand-04, transcribed into his record under `assessor_report`. It is the
assessor's actual output and the target for Layer 5 ([D15](../DECISIONS.md)).

It agreed with the transcription on every checkable number and resolved one
flagged defect. Ten candidates have no report, so report-level ground truth is
n=1 — enough to derive the structure, nowhere near enough to evaluate against.

## Corrections made during the completion pass

Re-reading full pages superseded three marks taken from the low-resolution
margin strips: **cand-04 story 4**, **cand-07 story 4** and **cand-10 story 11** were
each recorded as a tick and are in fact crosses. Page reads beat margin strips;
the map now carries the page values.

## Known data-quality issues

- **Sheet pages 12–13 missing from every scan.** cand-03 also lacks sheet page 2,
  cand-05 lacks 5 and 12–14.
- **Page bottoms cropped mid-sentence:** cand-01 1/5/10/13, cand-02 1/5/12.
- **Low-confidence counts:** cand-10's SRT total (19?), cand-04's WAT tally
  (`8 + 2 + 4 = 6`, does not reconcile), cand-08's SRT count (illegible).
- **Two candidates switch into Hindi mid-story** (cand-08 5 and 8), transcribed
  as `[Hindi phrase]` with the sense noted where the assessor glossed it.

## Privacy

See [`README.md`](./README.md). `records/` is gitignored and must stay so.

## Health warning

**One assessor, one day, 11 candidates — confirmed by LWS, no second marker
for this batch.** No inter-rater reliability is obtainable from these 11 sheets
alone — further assessors are expected, and
[`SECOND-ASSESSOR-LEDGER.md`](./SECOND-ASSESSOR-LEDGER.md) lists what their
marking settles. He
applies his own SRT tense rule three different ways across three sheets. That
inconsistency is now read as house style rather than doctrine ([D14](../DECISIONS.md)).

Good enough to derive a rubric and sanity-check a grader. Not good enough to
claim validated agreement.
