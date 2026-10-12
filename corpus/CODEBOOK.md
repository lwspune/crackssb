# LWS Pune graded-sheet corpus — findings and codebook

11 candidates, all assessed 31 July 2026 by one assessor, on LWS Pune / Dr. APJ Innovation
School letterhead. **470 typed assessor marks** captured.

Everything below is *inferred from the corpus*. The per-candidate JSON records keep raw and
inferred strictly separate: `mark_raw` holds what is on the paper, and every `derived` block
is still empty.

---

## 1. The marginal notation — partly decoded

My first reading at 150 dpi recorded these as fractions (`8/7`, `6/4`). **That was wrong.**
Re-read at 600 dpi, the mark is:

```
<digit> | <tick or cross>
```

**Certain:** the second glyph is a tick or a cross. 78 legible marks: **49 cross, 29 tick
(37% tick)**.

**Not certain:** what the digit means. Observed distribution:

| digit | count |
|---|---|
| 8 | 60 |
| 6 | 14 |
| 2 | 3 |
| 4 | 1 |

Ruled out by evidence:
- **Not the chest number.** cand-04 is chest 3 and every one of his marks is an 8.
- **Not constant per candidate.** cand-01, cand-06, cand-08, cand-10 and cand-11 all mix digits.
- **Not simply story quality.** Slide 11 has the *highest* tick rate (5/7) while every
  candidate who wrote it drew a negative courage code.

It behaves like a coarse quality band (8 common, 6 next, 2 rare and only on the weakest
stories — cand-02's story 1, cand-11's stories 1–2, cand-09's story 9, all crossed). But at
n=78 with one rater I would not build a scale on it. **Recommend asking LWS directly**
rather than inferring further; it is one question and it unblocks the ordinal scale.

### The tick and the cross are not the same axis as the trait codes

Slide 11 is graded tick 5 times out of 7 *and* draws `Restd courage` + `Cynophobia` on
every sheet where it appears. So a story can be accepted as a story while still emitting a
negative personality code. **Any model must emit these as two separate outputs**, not one
blended score. This is the single most load-bearing design finding in the corpus.

---

## 2. Per-slide difficulty is real and measurable

Tick rate per TAT slide, pooled across candidates:

| slide | tick rate | | slide | tick rate |
|---|---|---|---|---|
| 1 | 2/7 | | 7 | 2/6 |
| 2 | 5/8 | | 8 | **1/8** |
| 3 | 4/7 | | 9 | **1/7** |
| 4 | 3/4 | | 10 | **1/7** |
| 5 | 3/7 | | 11 | 5/7 |
| 6 | **1/5** | | 12 | **1/6** |

Slides 6, 8, 9, 10 and 12 are where candidates fail. That is a **difficulty parameter
measured from real data**, and it maps directly onto `items.difficulty` and `item_stats`
in the existing schema.

### Recovered stimulus content

The assessor writes out the picture when a candidate misperceives it or leaves it blank.
Pooling those across sheets reconstructs the slides without ever seeing them:

| slide | content | corroboration |
|---|---|---|
| 4 | 04 soldiers in uniform, rifles, Full Scale Military Order, climbing a rocky hill | cand-02 (explicit), cand-01 (correction) |
| 7 | Govt medical camp, a nurse, doctors, microscope, two tables, Rampur village | cand-01, cand-03, cand-02, cand-07 |
| 10 | 01 male and 01 female sitting under a tree | cand-02, cand-09, cand-01 |
| 11 | a wolf | cand-01, cand-02, cand-03, cand-09 |

This directly addresses the gap I flagged earlier. It also reinforces [D8](../../../../Downloads/CrackSSB/DECISIONS.md):
if you generate your own imagery you *know* the ground-truth content, so perception fidelity
becomes checkable by construction rather than reconstructed from red ink.

### Slide 6 is a trap

Three of five candidates who attempted slide 6 wrote an alcohol theme, and **all three were
penalised** (`Avoid Alcohol in your story`, `-ve. Avoid this Low level Theme of Drugs,
Alcohol influence`, and cand-11's global `Low / -ve theme, such as Drinking Alcohol etc`).
Slide 9 similarly pulls "giving a lift", flagged `Low Theme` on both sheets where it appears.
A product can warn candidates about exactly this, and can detect it deterministically.

---

## 3. SRT volume — the biggest single finding

The assessor's stated target is **45+**. Actual attempts, 9 candidates with legible counts:

```
16  ################               cand-01
16  ################               cand-02 cand-02
16  ################               cand-03
16  ################               cand-05
16  ################               cand-06
17  #################              cand-11 cand-11
19  ###################            cand-10
27  ###########################    cand-04
29  #############################  cand-07 cand-07
```

**mean 19.1, max 29. Nobody reached even two-thirds of the target.**

Five of nine stopped at *exactly* 16, which is where the first SRT page ends. That looks
like a page-boundary effect rather than nine independent decisions — worth confirming with
LWS, because if true the fix is partly about sheet design and pacing drill, not ability.

**Volume and quality are scored separately.** cand-07 attempted the most (29) and was still
told `The SRT response quality is poor`. cand-04 attempted 27 and earned `Good EI`. A grader
must not collapse these.

---

## 4. The lexical rules — Layer 2, fully deterministic

Three standing rules, all regex-detectable, all confirmed on multiple sheets:

| rule | evidence | notes |
|---|---|---|
| **SRT: write `He will`** | cand-01 16/16 corrected, cand-11, cand-05 15/16 corrected | Targets modal obligation (`must`/`should`) *and* past/bare tense. cand-03 used `He will` throughout and received **zero** corrections — strong confirmation it is the target form, not a preference |
| **SRT/WAT: avoid `TRY`/`TRIED`** | cand-04, cand-05, cand-10 — `AVOID using TRY` | Tentative verbs penalised |
| **WAT: avoid personal pronouns** | cand-03 (~30 of 50 circled), cand-02 | `Avoid / Restrict using I / Me / myself, He / Her / Him / His / She` |

The pronoun rule has direct behavioural evidence: cand-04 writes impersonal, aphoristic WAT
responses (`Risks leads to success`, `Practice makes one perfect`) and is the only candidate
whose WAT is graded **`V. good`**. cand-03 and cand-02 open with pronouns and both score LOW.

**Caveat on consistency:** cand-02 wrote bare present tense throughout her SRT and received
*no* `will` correction, while cand-05's near-identical construction was corrected 15 times.
The rule is applied unevenly between sheets. That is a real limit on any agreement metric
built from a single rater.

---

## 5. Structured artefacts the assessor already produces

### The per-instrument scoreboard

Present on at least 5 of 11 sheets. This is the assessor's own structured output:

- **cand-05** — `TAT - 04 Blank -> Just Avg - 08 | WAT - LOW · 34 | SRT - only 16`
- **cand-09** — `TAT - Just AVG / WAT - Just AVG / SRT - LOW / SDT - Just Avg (Panicked)`
- **cand-07** — `your TAT is LOW / WAT is LOW / SRT is LOW / SDT is LOW`
- **cand-10** — `TAT is Just Avg / WAT is Just Avg / SRT is Low`
- **cand-02** — `TAT - LOW / WAT - LOW / SRT - LOW / SDT - LOW`

Grade vocabulary is a closed set: **`LOW` · `Just Avg` · `AVG` · `Good` · `V. good`**.
That is a 5-point ordinal scale, and it is the natural first target for a grader —
far more tractable than the undecoded marginal digit.

### The WAT blank tally

Per-page blank counts summed in the header. Verified definitively on cand-03: `3 + 5 + 2`
beside the label `10 WAT Not Attempted`, and page-by-page recount matches exactly. cand-02:
`9 + 6 + 9` → `24`. Pure arithmetic, Layer 1.

### The SDT closing trait list

Four sheets close with `Traces of ->` followed by a short trait list (cand-01, cand-11, cand-04,
cand-05). A fixed structural element, not ad hoc commentary.

### The SDT length threshold

`You Need to write much more, about 80-90 words (6-7 lines) under each opinion` (cand-02).
A hard, countable rule. cand-02 completed all 5 opinions and was still graded LOW — on
length and insight, not completion.

---

## 6. Vocabulary

**OLQ shorthand (57 marks).** `Restd EI/RA` ×5, `Restd courage` ×4, `Low SOD` ×4,
`Restd Dynamism` ×4, `Low EI/RA` ×4, `Restd RA/EI` ×3, plus `Low Dynamism`, `Restricted`,
`Low Mental/Physical Stamina`, `Restricted Knowledge`, `Proceed to Restricted courage`,
`Good EI`. The assessor writes natively in OLQ terms — direct support for
[D4](../../../../Downloads/CrackSSB/DECISIONS.md) surviving contact with real rating behaviour.

Note `Good EI` (cand-04) and `Theme is Good` (cand-10): **the scale is not purely negative.**

**Trait vocabulary (58 marks).** `Highly Anxious` dominates at 8 occurrences — by far the
most frequent single attribution in the corpus. Then `Scared`, `Phasmophobia`, `Cynophobia`,
`Aggressive`, `Short temper`, `Impulsive`, `Overthinker`, `Money-Minded`, `Spendthrift`,
`Trust issue especially with opposite Gender`, `Living in Dreamworld`, `Glossophobia`,
`Herpetophobia`, `Aquaphobia`, `Scopophobia`, `Nyctophobia`, `Overbearing`, `Traceable`,
`Authoritarian`.

**The phobia cluster is stimulus-driven, not dispositional.** Cynophobia appears only on
slide 11 (wolf), Phasmophobia on slide 6, Aquaphobia and Herpetophobia on specific SRT
items. The assessor is labelling the *content* of the response, not diagnosing the candidate.
A grader that treats these as personality findings would be wrong.

---

## 7. What this means for the build

1. **Two independent outputs, not one score.** Story-acceptance (tick/cross) and personality
   codes are orthogonal. Slide 11 proves it.
2. **Target the 5-point grade vocabulary first** (`LOW`→`V. good`), per instrument. It is
   closed, it is what the assessor actually writes in the scoreboard, and it is measurable.
   Leave the marginal digit alone until LWS explains it.
3. **Layer 1 + Layer 2 reproduce a large share of the marks with no model at all** — counts,
   blanks, the three lexical rules, SDT word length, spelling density.
4. **Per-slide difficulty is measurable** and belongs in `items.difficulty` / `item_stats`.
5. **Non-OLQ residue needs a home.** `Money-Minded`, `Trust issue with opposite Gender`,
   `archaic thoughts` have no OLQ mapping. `evaluations.verdict jsonb` already exists
   beside `olq_scores jsonb` — use it, and say so explicitly in ARCHITECTURE.md.
6. **One rater, one day, 11 candidates.** No inter-rater reliability, and demonstrated
   inconsistency in applying the `will` rule. This corpus is good enough to build and
   sanity-check a rubric. It is **not** good enough to claim validated agreement.

---

## 8. Questions to LWS Pune — answered 2026-09-23

| # | question | answer |
|---|---|---|
| 1 | What does the marginal digit mean (2 / 4 / 6 / 8)? | **Not pursued.** Closed. `mark_raw` stays verbatim and undecoded; the grader targets the 5-word grade vocabulary instead |
| 2 | Is `He will` SSB doctrine or LWS house style? | **Our judgement.** See below and [D14](../DECISIONS.md) |
| 3 | Is the 45+ SRT target realistic in the time allowed? | **Yes** |
| 4 | Was a second assessor involved? | **No** |
| 5 | Why are sheet pages 12-13 missing from every scan? | **Not pursued.** Closed |

### Q2 — our judgement: the rule is two things, and only one is doctrine

Answer 4 is what makes this answerable. One marker applying a rule three
different ways is a situational heuristic, not a standard.

| candidate | construction | corrected? |
|---|---|---|
| cand-01 | `He must` / `He should` | yes, 16/16, **plus the written instruction** |
| cand-11 | `He must` / `He should` | yes, **plus the written instruction** |
| cand-05 | past tense | yes, 15/16, no written instruction |
| cand-09 | past tense | **no** |
| cand-02 | present tense | **no** |
| cand-03 | `He will` throughout | n/a — zero corrections |

The written instruction went **only** to the two candidates who used modal
obligation, and both times sat beside `Shows authoritarian Behaviour`.

- **`He must` / `He should` is doctrine.** Obligation verbs prescribe what
  someone *ought* to do rather than commit to what the candidate *will* do.
  That is a real signal about manner and decisiveness.
- **Past/present tense is house style.** A preference, applied to one candidate
  in three, with no quality behind it.

Applied to the rest: `avoid TRY` is doctrine (decisiveness, flagged on three
sheets); the WAT pronoun rule and the WhatsApp-abbreviation rule are house
style; `the Ram` is a grammar error. Every Layer-2 finding now carries a
`basis` field, and **only `doctrine` findings are scored** — house style is
surfaced as advice.

### Q3 — the SRT shortfall is real

45+ is achievable in the time allowed, so the observed **16-29** range is a
genuine performance deficit rather than an unrealistic target. The Layer-1
threshold of 45 stands. The earlier suggestion that five candidates stopping at
exactly 16 was a *page-boundary artefact* is demoted: the boundary may explain
where they stopped, but the coaching fix is pacing and writing speed.

### Q4 — single rater, confirmed

No second marker. The green ink is not another assessor. The health warning in
[`README.md`](./README.md) and [`COVERAGE.md`](./COVERAGE.md) is now established
fact rather than caution: **this corpus can never yield inter-rater
reliability.**

---

# Addendum — findings from the full transcription pass

The sections above were written from 5 sheets. All 11 are now transcribed;
the corpus holds **758 typed assessor marks**. Ratios held as it nearly doubled
(deterministic ceiling 20.0% → 18.5%), which is mild evidence the classification
is stable rather than an artefact of the first few sheets.

## 9. The stimuli, reconstructed

The assessor writes out the picture whenever a candidate misperceives it or
leaves it blank. Pooling those descriptions reconstructs the slides without
ever seeing them.

| slide | reconstructed content | sources |
|---|---|---|
| 4 | 04 soldiers in uniform, full Military order, rifles slung, climbing a rocky steep hill | cand-02, cand-01, cand-08, cand-09 |
| 6 | **A closed room. One well-dressed male ~24, one well-dressed female ~23, and one dark shadow. Props: a table, a chair, a JUICE BOTTLE, a photo frame with a boat** | cand-08 |
| 7 | Govt medical camp: a nurse, doctors, microscope, two tables, village setting | cand-01, cand-03, cand-02, cand-07, cand-09 |
| 10 | 01 male and 01 female sitting under a tree | cand-02, cand-09, cand-01 |
| 11 | A wolf | cand-01, cand-02, cand-03, cand-09, cand-11, cand-06, cand-07 |

### The slide 6 finding

**Five of eight candidates who attempted slide 6 wrote an alcohol theme, and
every one was penalised.** The reason is now visible: the picture contains a
*juice bottle*, which candidates read as liquor, and a *dark shadow*, which they
read as a ghost. cand-11 got a global `Avoid Low / -ve theme such as Drinking
Alcohol`; cand-02 got `Avoid Alcohol in your story` and `Nyctophobia /
Phasmophobia`; cand-01 got `-ve. Avoid this Low level Theme of Drugs, Alcohol`.

This is a perception error with a **specific, teachable cause**, not a character
finding. A product can name it directly.

### The two near-deterministic stimulus responses

| slide | pull | outcome |
|---|---|---|
| 9 | "giving / taking a lift" — **7 of 8** candidates | flagged `Low Theme` **every single time** |
| 11 | wolf → fear rather than action — **7 of 7** | `Cynophobia` + `Restd courage` **every single time** |

Slide 11 is the most mechanically predictable item in the corpus, and the
clearest evidence for [D11](../DECISIONS.md): it has the **highest tick rate**
(5/7) while producing a negative courage code on every sheet.

## 10. Ideal-action exemplars the assessor supplied

Directly usable as Layer-3 few-shot material.

- **Slide 4** (cand-06) — *"Capt. [hero], 22yrs, commanding his unit, received urgent information about enemy infiltrators on Tiger Hill. He immediately tasks his QRT of 04 soldiers, climbed the hill from the steep end, took position at the top and laid a trap. Neutralise all."*
- **Slide 7** (three sheets, near-identical) — *"Dr. Ram, 24yrs, MBBS Govt Doctor posted at [hospital], organised a Medical Camp."*
- **Hostage SRT / slide 5** (cand-10) — **`ADO: Distract, Disarm, Overpower`**
- **SRT 15**, four sheets — *"Plug the hole, bail out the water, resume."*
- **SRT 16** — *"Give first aid to the stabbed lady who is bleeding; the purse can be regained later."*

## 11. Forbidden themes — the closed list

| theme | evidence |
|---|---|
| Drugs / alcohol | cand-01, cand-02, cand-03, cand-11, cand-07 |
| Giving or taking a lift | cand-02, cand-03, cand-09, cand-11, cand-06, cand-07, cand-08 |
| **Depression, paranoia, psychological disorder** | cand-07 — *"Theme on Depression, Paranoid or any other Psychological Disorder is LOW theme"* |
| Vacation as the whole plot | cand-09, cand-06 |
| Money-mindedness / reward-seeking | cand-01 (`Money-Minded`), cand-06 (`Reward seeker`) |
| Archaic gender attitudes | cand-01 (`ARCHAIC THOUGHT`) |
| Unearned future fantasy | cand-11 (`Highly Wishful`), cand-09 (`you are in 12th class & imagining an IAS officer`), cand-05 (`Living in Dreamworld`) |

## 12. Two further lexical rules — both now implemented

| rule | assessor wording | evidence |
|---|---|---|
| `whatsapp_abbreviation` | *"Pls Restrict using WHATSAPP short-cut abbreviated words"* | cand-11 (bcoz, abt throughout) |
| `definite_article_before_name` | *"THE is a definite Article, cannot be prefixed to Standard Names (Noun) such as Ram, Sita, Savita, Dhoni"* | cand-07, stated twice |

Both ship in `src/scoring/lexical.ts` with tests.

## 13. SRT volume — final figures

```
16 16 16 16 16 | 17 | 19 | 27 27 | 29        target 45+     n=10, mean 19.9
```

Ten legible counts. **Five sit at exactly 16**, where the first SRT page ends —
a page-boundary effect rather than ten independent decisions. Nobody reached
two-thirds of the target. Volume and quality remain independently scored:
cand-07 attempted the most (29) and was told *"the SRT response quality is poor"*,
while cand-04 at 27 earned **`Good EI`**.

## 14. Corrections to earlier sections

- The marginal digit is **not** story quality in any simple sense. Slide 11 draws
  ticks at the highest rate in the corpus while producing negative codes every
  time. Still undecoded; still a question for LWS.
- Self-reference in story 12 is **not** the discriminator. cand-01 named himself
  and was ticked; cand-11 named himself and was told *"Avoid this story"*. What
  separates them is lived-and-concrete versus unearned-and-futuristic.
- The `He will` rule is applied **inconsistently**. cand-05's past tense was
  corrected 15 of 16 times; cand-09's past tense and cand-02's present tense drew
  no correction at all. Three sheets, three different treatments of the same
  construction. This bounds any agreement metric built from this single rater.

---

# Addendum 2 — the assessor's report

A typed one-page **Psychologist Report** for cand-04 (candidate 3) turned
up, signed *Commandant Yogesh Dutta (Retd), Psych Assessor*, headed
*31 JULY 2026 — {LWS-2026 BATCH}*. Full transcription lives in his record under
`assessor_report`.

**This is the output.** Everything else in this codebook describes *marks*. The
report is what the marks become, and it is what a candidate actually receives.

## 15. It validates the transcription — four independent agreements

The report was written from the same answer sheets I transcribed, independently
of me. Every checkable number agrees:

| | typed report | transcribed from the sheet |
|---|---|---|
| SRT attempted | **27** | 27 |
| WAT not attempted | **06** | 6 |
| TAT "just average level" | **06** | exactly the 6 ticked stories |
| TAT "low level themes & left incomplete" | **04** | exactly the 4 marked LOW or incomplete (stories 4, 9, 11, 12) |

### It also resolves a flagged defect

cand-04's WAT page tally reads `8 + 2 + 4 = 6`, which does not add up, and was
recorded as a data-quality issue. The report says **06 WAT not-attempted**. The
total was right; the addends were misread. Closed.

### And it partly decodes the tick and cross

The marginal digit stays unresolved and closed. But the **✓ / ✗** half is now
pinned: 6 ticks on the sheet ↔ *"06 TAT stories are just average level"*, and
the 6 crosses ↔ *"04 low level themes & left incomplete"* + *"02 just average"*.

So **a tick means the story reached "just average level"**, and a cross means it
fell short — covering both outright LOW and merely "just average". The tick is
not praise; it is the pass mark.

## 16. The report's own structure

Five headed sections, in fixed order, then a signature block:

1. **TAT** — a story-count breakdown, then intelligence and imagination, then a
   paragraph of OLQ observations, then a paragraph on what to improve.
2. **WAT** — count not attempted, then sentence quality.
3. **SRT** — count attempted, quantity judgement, quality judgement.
4. **SD** — insight, motivation, and which opinions need work.
5. **SUMMARIZING** — the overall verdict, then the priorities, then practical advice.
6. **Verdict line** — trainability.

## 17. A second grade vocabulary, at candidate level

The five-word scale in section 5 (`LOW` → `V. good`) grades *responses*. The
report uses a different vocabulary for the *candidate*:

> Overall, the candidate is a **High Borderliner / adequate potential** w.r.t.
> psychology test.
>
> The Candidate has **adequate Trainability**.

Two axes, neither reducible to the response grades:

- **Standing** — `High Borderliner / adequate potential`. "Borderliner" implies a
  band structure around a cut-off; only one sample, so the rest cannot be enumerated.
- **Trainability** — `adequate`. A separate judgement about whether coaching
  would move this candidate, which is precisely what a preparation product
  should care about.

**Neither is derivable from the marks.** A grader that only emits response
grades cannot produce this page.

## 18. OLQ statements in the report

The report speaks OLQ far more explicitly than the marginal shorthand does —
further support for [D4](../DECISIONS.md) surviving contact with real practice.

| OLQ | the report's words |
|---|---|
| Effective Intelligence | "just mediocre intelligence", "just average imagination" |
| Reasoning Ability | "struggles putting up rational actions" |
| Organising Ability | "need to handle both familiar & dynamic situations in an organised manner" |
| Power of Expression | "English language is O.K./Average, however still needs better articulation" |
| Social Adaptability | "moderate social adaptability (slightly reserved)" |
| Self Confidence | "just average confidence under stressful situations" |
| Speed of Decision | "just average speed of decision" |
| **Liveliness** | **"He maintain cheerfulness at all times"** — the one unqualified positive |
| Courage | "can be bolder in risky situations (shows traces of restricted courage)" |
| Stamina | "shows traces of restricted Mental Stamina" |

### Residue that is not OLQ at all

`high anxiousness`, `limited Insight`, `just satisfactory motivation`, `broaden
his knowledge base`, `shows seeking assistance`, `need to perform in a consistent
manner`, and a long note on **legibility** — *"handwriting is poor and becomes
more illegible during timebound responses"*.

This is [D11](../DECISIONS.md) confirmed from the other direction: the assessor's
own summary carries substantial non-OLQ content, and `evaluations.verdict jsonb`
is where it has to live.
