# Suggestions

A running list of actionable improvements surfaced during /update-docs runs.
Each item is outside the scope of the work that surfaced it. Strike through when done.

---

## 2026-10-12

### ~~OIR timed mocks~~ — done 2026-10-18 (D32): 20 fixed practice mocks, Booklet mode, results with review

The owner held them: with only Series seeded, a 40-question OIR mock would be
all series. When two or three more chapters are in, build them the Question_Bank
way: fixed booklets committed as data (`content/oir-tests.json`, append-only so
a sat test never changes), a `tests` table with the ordered item ids and time
limit, `sessions.test_id` (one live session per test, not per instrument),
`save_response` accepting only A–D for an item in the test, a
`session_answer_key(session)` that answers only the owner and only after the
session ends, a Booklet screen in the runner (question grid, back and forward),
and a result page through `scoreOir` with the rules. Pace: the SSB's 40 in 17
min (`INSTRUMENT_CONFIGS.oir_verbal`).

### Practice: the chapter header counts are as of page load

`/practise/oir/[chapter]` renders "n of 118 answered · r right" and the set
counts on the server, so they do not move while the candidate answers; the
set's own tally shows at the end. Move the counts into the client component if
candidates read the stale header as a bug.

### The practice read policy was not checked by loosening it

`practice.db.test.ts` passes, but the "loosen the policy and watch exactly its
tests fail" check (as done for `access.db.test.ts`) was blocked mid-run on
2026-10-12 and the policy restored unchecked. Run it once by hand.

### ~~BLOCKER for `git init`: real candidate names are outside `corpus/records/`~~ — done 2026-10-12 (D21; scan of all 109 committable files: 0 hits)

Found while preparing the first commit (nothing was committed; the empty repo
was removed). The `.gitignore` protects `corpus/records/` only. Real candidate
names — minors, with their psychological writing — also sit in files that
**would be committed**:

- `corpus/reports/*.docx` — sixteen full assessment reports, named by candidate. Not ignored.
- the single-candidate Word script — named for, and built from, one candidate's stories (now `scripts/build-candidate-docx.mjs`, ignored).
- `content/report-findings.json`, `corpus/CODEBOOK.md`, `corpus/COVERAGE.md`, `DECISIONS.md`
- `src/scoring/judge/calibration.ts`, `src/scoring/lexical.ts`, `src/scoring/report/template.ts`,
  and five test files under `src/scoring/__tests__/` and `src/runner/__tests__/`

**Why:** once a name is in git history, removing it means rewriting history,
and a push makes it public. This is shipped work, so it needs a 360 and the
user's go-ahead before anything is edited.

**How to apply (proposed, not done):** (1) ignore `corpus/reports/` and the
per-candidate script now — no content change; (2) pseudonymise the rest with a
mapping kept in `corpus/records/` (already ignored), re-running the suite after
each file; (3) grep every name again, then `git init`, then check
`git status` before the first commit.

### Four pre-existing type errors, all in test files

`npm run typecheck` (added today with `typescript`, closing the 2026-09-24 item
below) reports four errors, none in app code: three unused `@ts-expect-error`
directives in `src/scoring/__tests__/judge-contract.test.ts` and a too-wide
cast in `src/runner/__tests__/engine.test.ts:322`. `next build` checks app code
only (`tsconfig.build.json`) so the build is green. Fix the four, then point
the build back at `tsconfig.json`.

### The runner ships the whole WAT deck to the browser

UI.md §3.2 rule 4 says nothing unreleased reaches the client.
`src/ui/runner/content.ts` imports all sixty words, so a candidate could read
ahead in the page source. ~~The session clock lives in `localStorage`~~ — fixed
2026-10-12: the clock and every answer are the server's now (server-store.ts).
What remains is serving each word only when it is due: the engine already emits
`release` per item, so it is a swap behind `RunnerContent` (a release endpoint
that checks the item's window), not a rewrite. Matters before anything scored
is built on WAT.

## 2026-09-24

### ~~Add a type-checker~~ — done 2026-10-12 (`npm run typecheck`; see the four known errors above) — nothing in the repo is type-checked

Vitest strips types via esbuild and Node's `--experimental-strip-types` strips
them too; neither checks them. No `tsc` is installed locally or globally. Every
`.ts` file in `src/` — the scoring engine, the judge contract, the new runner —
has only ever been checked by whichever code paths a test happened to exercise.

**Why:** the runner engine's effect and state types are discriminated unions
that the React wrapper will lean on in Sprint 1. A wrong narrowing there is a
runtime bug in the one component that must not have them. The scoring
engine's `validateVerdict` boundary has the same exposure. The cost of the check
is one dev dependency and a `tsconfig.json`; the cost of not having it grows
with every file.

**How to apply:**

```bash
npm i -D typescript
# tsconfig.json: strict, module nodenext, allowImportingTsExtensions, noEmit
npm pkg set scripts.typecheck="tsc --noEmit"
```

Then add `npm run typecheck` to the Definition of Done alongside `npm test`.
Justified under the dependency rule: the existing stack cannot check a type.

## 2026-09-23

### Run `git init` and make the first commit

The project has no version control. There are ~40 source files, 203 tests, four
planning documents and a corpus transcription that took the bulk of a session to
produce. A correct `.gitignore` is already written (it excludes `corpus/records/`,
which holds psychological self-disclosure from minors under real names), so the
only step missing is initialising the repo.

**Why:** Every correction made this session — the marginal-notation re-read, the
boilerplate-to-template rework, the D16 rebuild of a report from the wrong
inputs — rewrote files with no recoverable prior state. A wrong `sed` across
`corpus/` would currently be unrecoverable. The longer this waits the more there
is to lose, and the `.gitignore` guard only protects a repo that exists.

**How to apply:**

```bash
git init
git add -A && git status          # CONFIRM corpus/records/ is absent before committing
git commit -m "feat: psych scoring engine, five layers, 203 tests"
```

Check `git status` before the first commit, not after — once real names are in
history, removing them means rewriting it.

### Supply a credential so the D5 bake-off can run

Layer 3 is the judgement layer and carries ~70% of the assessor's marks by
measurement. It is fully built — adapter, rubric, entitlement validation,
structured output, prompt caching — and has **never been run against a real
model**. `npm run eval` currently reports baselines only.

**Why:** Every claim about the grader's accuracy is currently a claim about
layers 1-2, which reproduce 18.5% at their ceiling. The calibration work (the
52% low-theme base rate, the absence-weighting note) was written into the rubric
on the strength of a scoring exercise done by hand — nobody has yet checked that
the model actually shifts when the rubric says so. That is the single largest
unknown in the project.

**How to apply:** set `ANTHROPIC_API_KEY`, or run `ant auth login`, then:

```bash
npm run eval -- --model claude-opus-5
```

The eval reports the majority-class baseline (50.4%) alongside the score, per
D12, so the number is interpretable on its own.

### Get a second assessor to mark the same batch

Every number in `calibration.ts` and every rule in `CODEBOOK.md` comes from one
marker, one batch, one day. `corpus/SECOND-ASSESSOR-LEDGER.md` already lists
every conclusion a second opinion would settle, with the specific test for each —
it is a checklist waiting for data, not an analysis to be done.

**Why:** Three things are currently unobtainable. There is no agreement ceiling,
so a judge scoring 75% against this marker has no reference point for whether
that is good. The doctrine/house-style split (D14) — the most consequential
judgement made in the project, and the thing the product would actually teach —
is one person's inconsistency as interpreted by us. And the 52% base rate now
baked into the TAT rubric may be the SSB standard or may be this marker's
threshold; there is no way to tell from inside this corpus.

**How to apply:** the cheapest version is a second marker on the *same* eleven
sheets, which yields direct inter-rater agreement. A different batch from a
different assessor is still useful but much weaker — it confounds rater with
cohort. When marks arrive, add an `assessor` key to each record and **compute
per rater before pooling** (D17); pooling on arrival destroys the comparison.

## 2026-10-12 (OIR, D24)

### Compare the book's answer key with the derived keys (all chapters)
Every chapter now ships derived keys; 37 are `confidence: medium` and 82 questions
are held with a lean where a misprint points one way. When the key arrives, settle
the medium ones first in each chapter, then all; each key file says why.

#### (Chapter 11, the first)
The owner will share the key later. Check the 6 `confidence: medium` items first
(Q3, 29, 65, 74, 104, 108), then all 118; settle each disagreement against the
print, then set `key_basis` to `book` or `derived_and_book` in the key file and
re-run `npm run oiritems` and `npm run items:seed -- --apply`. The 7 held
questions (68, 69, 71, 78, 93, 102, 123) may become answerable from it.

### Ingest the other ten chapters (~1,030 questions)
Same path as Chapter 11. Two format gaps to close first: Chapter 5 Q1-2 have a
fifth option (E), and Chapter 10 Q40-49 share passages. `OirPayload` holds
exactly A-D and one stem. Either widen the format (a `context` field, like the
`direction` field added today) or declare a substitution per item.
**Owner's call (2026-10-12):** hold Chapter 5 Q1-2; add an optional `passage`
field for Chapter 10 Q40-49 when that chapter is done.

Progress, in the agreed order (code-checkable chapters first: 4, 6, 9, 8, 3, 5,
then 7, 10, 1, 2). Page map: ch1 p1-3 · ch2 p4-8 · ch3 p9-14 · ch4 p15-16 ·
ch5 p17-21 · ch6 p22-23 · ch7 p24-28 · ch8 p29-34 · ch9 p35-37 · ch10 p38-40.
- ~~Chapter 4, Word Formation~~ — done 2026-10-12: 47 of 47 seeded, none held,
  every key a letter count (`kind: 'letters'`). Tests run through the shared
  `src/items/__tests__/oir-chapter-suite.ts`.
- ~~Chapter 6, Sequence Test~~ — done 2026-10-12: 48 of 51 seeded as
  "Alphabet Positions" (the book's title reads like a twin of Series). Every
  key computed from positions (`kind: 'computed'`). Held: Q7 and Q8 (the count
  runs off the alphabet; leans C and A) and Q50 (the reversed-order answer N is
  not an option; the normal-order answer M is, lean C). Q2 keys "None of these"
  as printed, flagged medium: "from the left" would make it M.
- ~~Chapter 9, Ranking Test~~ — done 2026-10-12: 50 of 50 seeded, every key
  computed. Medium: Q3 ("facing east", read along the row) and Q24 ("males"
  with Kavita in the row; 53 is not an option, so the book counts everyone).
  Q12's name matched a candidate's and is now "Rakesh" (D27). The chapter
  prints no direction, so its items carry none.
- ~~Chapter 8, Directions~~ — done 2026-10-12: 93 of 100 seeded. 89 keys run
  through `walk`; 4 reasoned (Q11, the two shadow questions Q31-32, Q56 whose
  option is misprinted "North-Eeast"). Held: Q6, Q10, Q41, Q61, Q62, Q66, Q87
  (reasons in the key file). Medium: Q5, Q9, Q44, Q45, Q65, Q91, Q95. Three
  names swapped (Q17, Q89, Q97; D27).
- ~~Chapter 3, Coding-Decoding~~ — done 2026-10-12: 144 of 150 seeded. Every
  code rule runs on the book's own examples first (the key file will not load
  otherwise); phrase codes are solved by intersection (`solveCodes`, checked
  as `codeSet`). Held: Q7 (example lengths differ), Q27, Q69 (no rule found),
  Q98 (the right code is not an option), Q121 (examples disagree), Q124 (one
  example fixes no rule). Medium: Q23 (one example misprinted), Q58, Q140.
- ~~Chapter 5, Logical Sequence of Words~~ — done 2026-10-12: 83 of 88 seeded
  as "Word Order". Dictionary questions sorted in code; 19 logical-order
  questions reasoned. Held: Q1-2 (five options, owner's call), Q27 (lake or
  river), Q59 (no list), Q74 (the middle name is not an option). Medium: Q14
  (a cycle has no first step).
- ~~Chapter 7, Blood Relation~~ — done 2026-10-12: 92 of 98 seeded, every key
  a family tree traced in words (all reasoned; this chapter most needs the book
  key). Held: Q31, Q44 (garbled), Q61 (two counts asked at once), Q75 (every
  statement true), Q85 (the answer, grandfather, is not offered), Q94 (two
  statements true). Medium: Q36 (which grandfather), Q59, Q64. Two names
  swapped (Q11, Q13; D27).
- ~~Chapter 10, Seating Arrangement~~ — done 2026-10-12: 47 of 51 seeded.
  Puzzles solved by trying every order (22 computed); the three passage sets
  ride on the new optional `passage` field (bank, build, practice screen).
  Held: Q2 (subscripts unreadable), Q12 (Raghav never placed), Q15 (two
  orders), Q29 (two facing rows read several ways). Medium: Q16, Q17, Q33.
- ~~Chapter 1, Analogy~~ — done 2026-10-12: 90 of 98 seeded. Number and
  letter analogies run their rule on the question's own pair first; word
  analogies reasoned. Held: Q32 (two coolers), Q35, Q51 (no rule found), Q64
  (two rules), Q74 (nothing to complete), Q75 (lengths differ), Q88 (no rule
  reaches an option), Q96 (two readings). Medium: Q23, Q58.
- ~~Chapter 2, Odd One Out~~ — done 2026-10-12: 256 of 292 seeded. Number and
  letter questions name the shared property as code (`kind: 'odd'`, applied by
  the suite to the printed options); word questions reasoned. 36 held where no
  plain property singles out one option, or two equally plain ones disagree
  (11 word, 13 number, 12 letter). Medium: Q16, 31, 61, 76, 171, 201, 252,
  290, 292.
- **All eleven chapters done:** 1,068 questions seeded, 82 held, 37 medium.

### Backfill ledger: Chapter 11's test onto the shared chapter suite
`oir-agrawal-series.test.ts` predates `oir-chapter-suite.ts` and carries its own
copy of the transcription / key / bank checks. Moving it onto the suite (adding
the `missing`, `wrong`, `fill`, `next` kinds to the suite's `runCheck`) removes
the duplicate. Shipped and passing, so it waits for a 360 and a yes.

### ~~Backfill ledger: stem line breaks now show in Chapters 1-11 (D28)~~ — done 2026-10-13, the owner said yes
The practice screen now keeps a stem's line breaks (`whitespace-pre-line`), added for Chapters 12-13. 119 shipped stems already
carry breaks from transcription (Ch1 6, Ch2 3, Ch5 76, Ch7 26, Ch8 3, Ch10 4, Ch11 1): numbered word lists, legends, statements
I/II. Today they run together on one line ("1. Decant 2. Decamp 3. Decade"). 360: scope 119 stems, display only, no data change ·
blast radius the practice screen only (sheets and runner do not render OIR stems) · it does apply: every break is a printed line ·
risk low, one class to revert · cost none. Recommendation: do. Confirmed and shipped with D28.

### Chapter 17 Q94-97 are missing from the photos
The direction covers Q1-97, but photo Page68 ends at Q94's first statement and Page69 opens Chapter 18. A photo of the
missing page (or the scan) adds four questions.

### Non-verbal chapters: redraw where the answer can be computed (D29)
Done: 28 (42 of 50), 18 (65 of 80), 16 (44 of 50), 25 text questions (23; its 46 drawn figures in progress), 24 (58 of 82). 16 and 25 were
ingested by agents in their own worktrees and reviewed against the photos before merging. Next, redrawn and checked by
code: 25's figures. Chapter 24's 24 holds wait for a scan or the book's key (mark turns, stepped edges, half-shading). 20 group cubes has three options and an unchecked rule:
with the cut-from-photo set. Cut from the photo and keyed by eye: 21 analogy, 22 classification,
23 series, 26 pattern completion, 27 embedded figures. 19 (two-option answers) held. Chapter 28's rules say what to count
but not how many of each size; a breakdown by size would teach more.

### Non-verbal chapters 16, 18-28 (~820 questions): figures from the photos
A trial cut nine Counting Figures (Ch 28) figures from the phone photos at 3× (`screenshots/oir-ch12-13/FIGURE-TRIAL.png`).
Line figures read; faint show-through from the facing page remains, and every crop box is placed by hand. Keys cannot be run as
code. Flat scans and the book's answer key would settle both.

### Printed typos shown to candidates
Directions and stems are verbatim, so candidates see "which dase not fit". Decide
whether shown text gets spelling fixes (declared, as WAT's DIFFCULT was) while
the transcription stays verbatim.

### Difficulty is 3 for every book item
A placeholder, not a measurement (D24 point 7). Replace from item statistics
(D19) once sittings exist; until then booklet assembly cannot balance on it.

## 2026-10-12 (layered access, D25)

### Results and item statistics must filter `by_staff`

Nothing reads sessions for results or item statistics yet, so nothing leaks today.
When the Results page, the staff review queue or the D19 stats read lands, it must
select `by_staff = false` — and a test should plant a staff session and watch it
stay out. Best enforced in the view or function those reads go through, not in
each page.

### Admin's academy page and the staff area overlap

`/admin/academies/[id]` and the superadmin's `/staff/people` (with that academy
picked) both list and add people. Kept both: Admin is the platform view, Staff is
"what the academy sees". If they drift, make the Admin page link into the staff
area with the academy picked rather than keep two forms.

## 2026-10-18 (managing people, D31)

### A switched-off candidate's live token can still write for up to an hour

Switching off bans the login (no new sign-in, no refresh) and the database refuses the person every
read (the private RLS helpers). But `start_session`, `save_response`, `end_session` and `answer_practice`
read the caller's profile themselves and do not check `deactivated_at`, so an access token issued before
the switch-off can still start a test or save answers until it expires (the project's JWT expiry, 1 h by
default). Harmless for a candidate's own data; close it by adding `AND deactivated_at IS NULL` to each
function's caller lookup (one migration, a test per function) if switching off ever has to be instant.

### Leaked-password protection is off

Staff now type passwords (D31 §4), so a known-leaked one is more likely than when every password was
generated. Supabase Auth can refuse passwords found in HaveIBeenPwned (advisor `auth_leaked_password_protection`);
it is a paid-plan setting. Turn it on if the project moves to Pro.

### Ask for a new password at first sign-in

Staff choose the first password and send it over WhatsApp, so it sits in a chat. A "set your own
password" step on first sign-in would retire it; Profile already has the form (D31 §7). Deferred: the
owner did not ask for it, and it adds a step before a candidate's first test.

### A leftover walk login fails `npm run test:db`'s leftover check

`walk-1791900019@test.crackssb.invalid` (an earlier browser walk, not a test run) is still in auth, so
every database test file's afterAll check fails on it. Not removed here: another session may own it.
Remove it once nobody is using it (Authentication → Users, or `auth.admin.deleteUser`).

### `audit:mobile` does not visit a person page

Its staff pages are fixed paths; `/staff/people/[id]` needs an id. Have it open the first row of
`/staff/people` and audit that page too.

## 2026-10-18 (OIR mocks, D32)

### Public sign-up (the owner's direction for later)

The owner wants to open the product to the public: anyone signs up and practises. Mocks need nothing for it
(solo candidates, `org_id` null, already work). What it does need, for its own analysis when the time comes:
self sign-up turned on with email confirmation (D23 says staff create every login; supersede it); **guardian
consent for under-18s with no academy to record it** — the hardest part, likely a parent's confirmation by
email or phone; rate limits and abuse protection on sign-up; and whether public users and academy users share
mocks and results unchanged.

### Staff view of their candidates' mock attempts

Deferred by the owner. `test_result` already lets an academy's staff read an attempt; what is missing is a
staff page listing attempts per candidate (and a `test_attempts(candidate)` for staff, scoped like
`can_view_person`). Leave `by_staff` attempts out.

### Mock item statistics (D19)

Mocks now produce sittings. When item statistics land, count first attempts only, `by_staff = false`, and
per mock — retakes and practice exposure inflate everything after the first.

### Expiry was tested, not walked

The browser walk covered begin, answer, flag, reload, Home's banner, one-at-a-time, submit, result, review and
retake. Expiry (submit on time-out) is covered by `BookletRunner.test.tsx` and `mocks.db.test.ts` (a session
moved into the past), not by waiting 20 minutes in a browser. Worth one real run before a cohort uses it.

### `audit:mobile` does not visit a mock or a result

Both need an id or a live attempt. They were checked by hand at 320/360/1280 px (no sideways scroll, every tap
target at least 44 px); add them to the script.

