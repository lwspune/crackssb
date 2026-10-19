# Content — stimulus material

Assessment stimuli, as distinct from [`corpus/`](../corpus/), which holds
candidate responses and assessor marks.

| file | what it is |
|---|---|
| `wat-deck-2026-04-28.json` | The source deck as-is, extracted verbatim from `WAT-28-04-26.pptx`. Never edited |
| `wat-items.json` | **The seeded item bank.** Derived from the deck with three declared substitutions |
| `tat-images/` | TAT stimulus slides 1-4, as images |
| `tat/` | **The TAT pictures and sets** (D36): 23 owner-chosen line drawings with what each shows, two sets of eleven and a blank. Slides by `npm run tatslides` |
| `oir/agrawal-examcart/*.source.json` | OIR questions transcribed verbatim from the Agrawal ExamCart OIR book, one file per chapter. Never edited ([D24](../DECISIONS.md)) |
| `oir-items.json` | **The OIR item bank.** Built by `npm run oiritems` from the transcriptions and the derived keys in `src/items/oir/`; held questions are listed with their reason |

Source: a working deck obtained from a teacher who uses it. Cleared for use.

Regenerate with:

```bash
node scripts/extract-wat-deck.mjs <deck.pptx> content/<name>.json   # pptx -> verbatim deck
npm run watitems                                                    # deck -> item bank
```

The deck is kept verbatim and the bank is *derived*, so the diff between what
the teacher uses and what we ship is always one readable table in
`scripts/build-wat-items.mjs` — not an untracked hand edit.

## What it confirmed

`INSTRUMENT_SPECS.wat.items = 60` was derived from the assessor's blank tallies
on the graded sheets — never from a deck. This is the first independent
confirmation it is right, and it pins the timing:

- **60 words**, numbered 1–60 with no gaps
- **15 seconds per word**, stated on the instruction slide
- A page-turn break after every 20 words

Both facts are asserted in `src/scoring/__tests__/wat-deck.test.ts`, so the spec
and the stimulus material cannot drift apart silently.

**It is the same item bank the graded sheets used.** Of 17 stimulus words
transcribed from candidate sheets, 13 sit at the *same* ordinal in this deck and
the other four appear in it at a different one. The drift is small and explained:
cand-01's answer sheet ran to 62 numbered rows against a 60-word deck, and the rest
looks like row-number slips in my own sampling. The deck is dated 28-04-26 and the
graded session was 31-07-26, so an intervening revision is also possible.

**The corpus has NOT been backfilled from this deck.** Filling in stimulus words
by position would be imputing data rather than transcribing it, and those four
discrepancies are exactly the cases where it would go wrong.

## Three defects — fixed in the item bank

| # | defect | why it matters |
|---|---|---|
| 11 & 45 | **`REGULAR` appears twice** | Two items are not independent — the second response is primed by the first. A 60-word deck is really 59 distinct stimuli |
| 19 | **`DIFFCULT`** — misspelt | Candidates are marked on their own spelling. Being shown a misspelt stimulus is unfair, and several sheets carry spelling corrections |
| 51 | **`DAMES`** | Archaic and gendered. A weak stimulus, and an odd one for a mixed cohort — the deck's own title slide says *{FOR MALE & FEMALE}* |

All three are fixed in `wat-items.json`:

| # | was | now | why |
|---|---|---|---|
| 19 | `DIFFCULT` | **`DIFFICULT`** | Spelling fix |
| 45 | `REGULAR` | **`DISCIPLINE`** | Breaks the duplicate; same habit-and-routine register. `REGULAR` is kept at 11 |
| 51 | `DAMES` | **`RIVAL`** | Keeps the competitive register of its neighbours without being archaic or gendered |

The other 57 words are untouched, and a test asserts it.

## Valence — what "difficulty" means for WAT

A neutral word (`TABLE`) is easy to answer constructively. A loaded one
(`SUICIDE`) tests whether the candidate stays positive and impersonal under a
hostile prompt, which is exactly what the assessor marks. So valence *is* the
difficulty axis here, and `items.difficulty` is derived from it.

The corpus backs this directly: `TEMPER` and `MONEY` both surface as assessor
trait flags on real sheets (`Short temper`, `Money-Minded`), so they are not
neutral prompts whatever a dictionary says.

| valence | difficulty | count |
|---|---|---|
| neutral | 1 | 29 |
| mild | 2 | 12 |
| loaded | 3 | 19 |

Loaded words are a deliberate minority (32%) — a bank of them would not
discriminate between candidates, it would just depress everyone. That ratio is
now a set parameter rather than something inherited.


---

# TAT stimuli

`tat-images/` holds slides **1, 2, 3 and 4**. These feed `STIMULI` in
`src/scoring/judge/rubric.ts`, which is what lets the judge check whether a
story contradicts the picture at all.

Each entry now records where it came from, because a description read off the
slide is worth more than one reconstructed from the margin:

| slide | source | what it shows |
|---|---|---|
| 1 | **image** | Woman holding a letter, hand to mouth; a wall clock reading **10:10** |
| 2 | **image** | Office meeting, four people, a man standing mid-gesture, a **TV GUIDE** sign on the wall |
| 3 | **image** | Woman **drowsy** at a laptop, clock top-right |
| 4 | **image** | Four soldiers in uniform with packs and slung rifles, climbing a steep rocky slope |
| 6 | assessor's marking | Closed room, man ~24, woman ~23, a dark shadow; table, chair, **juice bottle**, photo frame with a boat |
| 7 | assessor's marking | Government medical camp; nurse, doctors, microscope, two tables |
| 10 | assessor's marking | One man and one woman under a tree. No lake, no crowd, no vehicle |
| 11 | assessor's marking | A wolf |

## Slide 4 validates the reconstruction method

Slide 4 was pieced together from four separate marginal notes months before the
image existed in this repo. **The image matches it.** That is the only direct
check available on the eight reconstructed descriptions, and it passed.

## The details are not decoration — they drive responses

Each one is measurable in the corpus:

| slide | detail in the picture | what candidates did |
|---|---|---|
| 1 | clock reads **10:10** | 5 of 11 gave a clock time; **three wrote exactly 10:10** |
| 2 | **TV GUIDE** sign | 5 of 11 built the story around a television |
| 3 | **drowsy** posture | **7 of 10** wrote about sleep or tiredness |
| 6 | a **juice** bottle | 5 of 10 read it as liquor and were penalised for the theme |
| 9 | *(no image yet)* | 8 of 10 wrote a lift; every one marked down |

This is why perception checking is worth having. A candidate writing "it was
10:10" is reading the clock, not inventing detail — but one writing about a lake
on slide 10, or a mountaineering course on slide 4, is contradicting the picture,
and those are different failures.

## Four images is all there is — this is closed

Slides **5, 8, 9 and 12** have no image and no assessor description, and none is
coming. Do not treat this as an open gap.

**Coverage is 8 of 12 slides**: four verified against the image, four
reconstructed from the assessor's marking.

The consequence is already handled in the rubric, which instructs the judge:
*"Do not speculate about the picture when no description is given."* For slides
5, 8, 9 and 12 it grades the story on its own terms and raises no perception
finding — which is right. A judge inventing what slide 9 contains would
manufacture errors, and slide 9 is precisely where candidates go wrong most
consistently (8 of 10 wrote a lift, every one penalised). Why the picture pulls
that is now permanently unanswerable from this material.

This ceases to matter beyond the corpus. Under [D8](../DECISIONS.md) CrackSSB
generates its own TAT imagery, so every future slide has known ground-truth
content by construction — perception checking becomes exact rather than
reconstructed. The limitation is bounded to these eleven sheets.
