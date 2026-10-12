# Suggestions

A running list of actionable improvements surfaced during /update-docs runs.
Each item is outside the scope of the work that surfaced it. Strike through when done.

---

## 2026-10-12

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

UI.md §3.2 rule 4 says nothing unreleased reaches the client. Until Sprint 1's
server store exists, `src/ui/runner/content.ts` imports all sixty words, and the
session clock lives in `localStorage` — a candidate who edits it buys time. The
runner says "practice on this device", and the engine already emits `release`
per item, so the server source is a swap behind `SessionStore` and
`RunnerContent`, not a rewrite.

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
