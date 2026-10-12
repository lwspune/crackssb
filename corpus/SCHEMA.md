# SSB Graded-Sheet Corpus — ground truth schema (proposal)

Status: proposal, validated against 1 of 11 sheets (cand-01). Not yet in the repo.

## Design rules

1. **Verbatim and interpreted never share a field.** `mark_raw` is what is on the paper.
   Anything decoded lives in a sibling `derived_*` field, written by a later pass.
   This is load-bearing: the per-story notation (`8/7`, `6/7`, `8/✓`) is to be inferred
   statistically across the corpus, so a guess written into the raw field would poison it.
2. **Every assessor mark is typed** (see taxonomy) rather than stored as free text.
   The taxonomy is the step-2 codebook, emerging from the data rather than imposed on it.
3. **Provenance on every item** — source page, plus a transcription confidence, because
   these are handwriting reads and some are genuinely ambiguous.
4. **Scan defects are recorded, not silently absorbed.** Missing and cropped pages are
   data about the corpus, and they bound what any agreement metric can claim.

## Mark taxonomy

Derived from cand-01 + spot-check of cand-11 cand-11. Closed set; extend only with a corpus reason.

| type | meaning | example |
|---|---|---|
| `count` | assessor tallied attempts | "only 16 SRT", "02 WAT NOT attempted" |
| `threshold` | required volume stated | "Need to do 45+ SRT" |
| `verdict` | per-item quality label | "Low", "Just Avg" |
| `mark_raw` | per-item marginal notation, undecoded | "8/7", "6/7", "8/✓" |
| `olq_code` | assessor's own OLQ shorthand | "Low EI/RA", "Low SOD", "Restd/Low Dynamism" |
| `trait` | character/attitude attribution | "Aggressive", "Money-Minded", "Impulsive" |
| `perception_flag` | story contradicts the stimulus | story 4: "it was a military operation" |
| `theme_flag` | theme judged unacceptable | "Avoid this low level theme of Drugs, Alcohol" |
| `correction_spelling` | spelling fix | pamplet → pamphlet |
| `correction_grammar` | grammar fix | his → her (pronoun-gender drift) |
| `correction_style` | house-style fix | must/should → will |
| `instruction` | directive to candidate | "Pls write legible", "Complete all the opinions" |

## Assessor idiom → OLQ mapping

The assessor already writes partial OLQ shorthand, which is direct support for
`DECISIONS.md` D4 surviving contact with real rating behaviour.

| assessor writes | OLQ | factor |
|---|---|---|
| EI | Effective Intelligence | I |
| RA / RI | Reasoning Ability | I |
| SOD | Speed of Decision | III |
| Dynamism | Determination · Courage · Stamina | IV |
| "Low Mental/Physical Stamina" | Stamina | IV |
| "Restd courage" | Courage | IV |
| "Confused", "not organised" | Organising Ability | I |
| "authoritarian behaviour" | Ability to Influence the Group *(inverse)* | III |
| "Need to improve insight" | *(no clean OLQ — self-awareness)* | — |

### Finding: the OLQ vector does not span the assessor's vocabulary

`Money-Minded`, `archaic thoughts`, `trust issue especially with opposite gender`,
`attached with your mother` are character and attitude attributions with no OLQ home.
They are also clearly things the assessor weighted.

Dropping them loses signal the human considered central. The existing schema already
accommodates this: `evaluations.verdict jsonb` sits alongside `evaluations.olq_scores jsonb`
(`ARCHITECTURE.md` §4), so non-OLQ flags land in `verdict` without any schema change.
Worth making explicit rather than leaving to chance — otherwise the first implementer
flattens everything into the OLQ vector and the residue is lost.

## Record shape

```jsonc
{
  "candidate":   { "name", "chest_no", "date", "source_pdf" },
  "scan":        { "pdf_pages", "sheet_pages_present", "sheet_pages_missing", "pages_cropped" },
  "instruments": {
    "tat": {
      "attempted", "expected",
      "items": [ { "ordinal", "page", "response_text", "confidence", "marks": [ ... ] } ],
      "summary_marks": [ ... ]
    },
    "wat": { ... }, "srt": { ... }, "sdt": { ... }
  },
  "global_marks": [ ... ],
  "open_questions": [ "free text — things I could not resolve from the page" ]
}
```

Each entry in a `marks` array is `{ "type", "raw", "page" }` — plus `"target"` where the
mark attaches to specific candidate text (a correction), and nothing else. No decoding.
