# CrackSSB

Online portal for **SSB** (Services Selection Board) preparation — the 5-day
officer-selection process for the Indian Armed Forces. B2C candidates and B2B
coaching academies. Launch entry type: NDA. **Readers see it as CadetPrep** (D30, `src/ui/brand.ts`); the repo,
Vercel project and package keep the name crackssb.

**The four planning documents are authoritative and this file does not repeat them:**

| file | holds |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Schema, the 15-OLQ vector, edge-function contracts, the four seam rules, honest-claims policy |
| [`ROADMAP.md`](./ROADMAP.md) | Phases, sprint order, gates, blockers, content lift |
| [`UI.md`](./UI.md) | Roles (4 in schema, 3 experiences), the **seven runner modes** and their contracts, timing rules, per-role IA, build order |
| [`DECISIONS.md`](./DECISIONS.md) | **D1–D41.** The long-form *why* trail. Append only; supersede rather than edit |

Read `DECISIONS.md` before changing anything in `src/scoring/` — most of what
looks arbitrary there is a recorded decision with evidence behind it.

---

## Current state

**Pre-product, with a UI.** A Next.js 16 app (`src/app/`, `src/ui/`) now runs
the student surface on local data: app shell, Practise by SSB day, honest empty
states, and the **WAT runner** wrapping the engine. **Sprint 1 is complete.** The database (tenancy, access rules) is live and gated by
tests; sign-in works (email + password for logins staff make; Google for students on their own, D42); staff create logins in the
app (`/staff/people`, D23) and the superadmin creates academies (`/admin`). The
runner saves to the server and runs on the server's clock: start time from
`start_session`, answers through `save_response` (refused outside their window),
countdown on the measured offset to the server, resume on any device. Also present:
the psych-scoring engine, built early because hand-graded dossiers arrived
early (D3's revisit trigger), and the headless runner engine (D18).

```
2755 tests passing · npm test        lint clean · npm run lint        npm run build green
233 database tests passing · npm run test:db        mobile audit clean · npm run audit:mobile
```

**Type-checking is new.** `npm run typecheck` checks everything and currently
reports four known errors in pre-existing test files (SUGGESTIONS.md). `next
build` checks app code only, via `tsconfig.build.json`.

**OIR chapter practice (D26).** `/practise/oir`: untimed, one question at a time; the key and its
rule come back only after an answer (`answer_practice`), every answer kept for progress. Every verbal chapter of the book
is seeded (1-15, 17): **1,482 verbal questions**, 94 held, keys derived (D24). Non-verbal (D29): Ch28 Counting Figures
(42, redrawn as lines, counted by code) Ch18 Cubes and Dice (65, solved by a cube model), Ch16 Venn (44)
Ch25 mirror and water images (51: 23 as text, 28 redrawn and reflected by code) and Ch24 paper folding (58, opened
out by code); picture answers
show drawn options in the buttons; number grids show as tables (D28).

**OIR mocks (D32).** 20 fixed booklets, 30 verbal + 10 non-verbal in 20 minutes (`content/oir-mocks.json`,
append-only; questions with trusted keys only, none in two mocks). Practice: unlimited retakes, review straight
after, no percentile. `/practise/oir` lists them with your best; `/mock/[test]` is the Booklet runner (server
clock, any order, grid, flags, resume); `/results/mock/[session]` scores and reviews. The database refuses keys
until an attempt is over and refuses to change a mock anyone has sat (0009, 0010).

**Managing people (D31).** `/staff/people/[id]`: edit name, date of birth (optional, D37: blank sits tests as an adult) and mobile, set a typed password (or
generate one), record guardian consent later, switch a login off/on, remove one nobody has used (the fix for a
mistyped email), and mentor ↔ owner (superadmin only). `can_manage_person` (0008) decides, as the caller. A
switched-off login is banned at the auth server and refused every read by the database. Each new password comes
with a ready WhatsApp message. Everyone changes their own password on Profile.
`/staff/people/new` adds one person by fields or many from Excel: download the template, upload `.xlsx`/`.csv`,
each problem marked on its row; tests read files saved by Excel 16 itself (`src/ui/staff/__tests__/fixtures/`).

**PPDT (D33, D35).** Twenty-one pictures (`content/ppdt/`: twelve drawings supplied by the owner, nine the owner chose
from ssbcrackexams.com; slides by `npm run ppdtslides`), each with ground truth. A number someone has sat is never reused. `/practise/ppdt` lists them by number only; `/picture/[id]` runs
30 s look, 1 min character box, 4 min story, on paper (`/sheets/ppdt`, `public/ppdt-sheet.pdf`);
`/results/ppdt/[session]` shows the picture, its ground truth, quick checks (counts, not a judgement) and a
sample story. The server takes each answer only in its own window (0012).

**Paper only (D38).** PPDT, TAT and WAT start on paper with a session code; typing is built but hidden behind one
switch (`OFFER_TYPED` in `src/ui/runner/paper.ts`). Candidates photograph the sheet on the result page; WAT has one
now (`/results/wat/[session]`), and mentors mark it (D41): words answered, then positive, practical, own voice (`review_wat`). Home's *Next up* is the first ready test, in day
order, the candidate has not taken.

**TAT (D36).** 23 line drawings the owner chose (`content/tat/`, `npm run tatslides`), each with what it shows; two
sets of eleven and a blank (`content/tat/sets.json`, append-only, `tests` rows, fixed once sat). `/practise/tat`
lists sets by name; `/tat/[set]` runs 12 × (30 s + 4 min) on the server's clock, written on the 6-page sheet
(`/sheets/tat`, `public/tat-sheet.pdf`); `/results/tat/[session]` shows every slide with its ground truth, takes up to
8 photos and sends for review. Mentors mark each story 1-5 or not written, with a note (`review_tat`). No model stories.

**SRT and SDT (D39, D40).** 120 situations the owner chose from ssbcrackexams.com (`content/srt/`, third person,
the site's wording kept beside each, 30 held with reasons), two sets of sixty (`tests`, fixed once sat). `/practise/srt`
→ `/srt/[set]`: all sixty to read, 30 min, answers on a 4-page sheet. SDT is the SSB's five paragraphs at `/sdt`,
15 min, 2-page sheet. Both share one paper runner (`src/ui/paper/`) and result page shape; mentors mark SRT on the
count answered + practical/quick/complete, SDT each paragraph + honest/consistent (`review_srt`, `review_sdt`).

**Mentor review (D34).** On the result page the candidate photographs a paper sheet (up to four pages), records a
one-minute narration (browser recorder; record again until sent), and sends the attempt for review once. That fixes
it. `/staff/review` lists what was sent (the owner also gets candidates with no academy). `/staff/review/[session]`
marks it: story on hero, action, outcome and outlook; narration on clarity, confidence and within the minute;
each 1-5, plus *went well* and *work on*, with no total. The marks then show on the candidate's result.
Every take and photo goes to a fresh path that cannot be overwritten (0013-0015). Photos and recordings are kept 12
months; the clean-up job is not built.

**Google sign-up (D42).** `/login` leads with *Continue with Google* (`signInWithGoogle` → `/auth/callback`). A new Google
user is a candidate with no academy, made by a trigger on `auth.users` (0020, 0021), `profiles.joined_via` = `google`,
no date of birth (sits as an adult, D37). The Before User Created hook (`private.before_user_created`) refuses every other
sign-up; staff-made logins carry `app_metadata.joined_via = 'staff'` (`STAFF_MADE`). The superadmin sees them at
`/admin/candidates` (who, how they joined, attempts by test) and `/admin/candidates/[id]` (practice + every attempt,
each opening its result). A real Google round trip has not been walked yet.

**Layered access (D25).** Staff also reach the student app and the superadmin reaches all three, through a switcher.
Staff tests are flagged `by_staff` by the database and must stay out of results and item statistics.

**Look (D20).** PYQVault's palette and fonts, token for token, plus a navy
surface for the shell and hero; the runner is dark in both modes. Copy is terse by request. `src/ui/__tests__/theme-contrast.test.ts` gates every
colour pair against WCAG AA from `globals.css` as it ships.

**Candidates are ids (D21).** `cand-01`…`cand-11` in everything committed; the mapping is
`corpus/records/PSEUDONYMS.md`. Never write a real name outside the ignored folders. A book
question's name that matches a candidate's is swapped for a neutral one and declared (D27).

## The five layers

The grader is layered so each one only escalates what the layer below cannot settle.

| layer | what it does | state |
|---|---|---|
| **1 — counts** | Attempts, blanks, thresholds. Arithmetic, no model | built, tested |
| **2 — lexical** | Regex rules: modal obligation, tentative verbs, WAT pronouns, WhatsApp shortcuts, article-before-name | built, tested |
| **3 — judgement** | LLM behind the D5 adapter. Rubric, entitlement map, structured output | built; **never run against a real model** |
| **4 — consistency** | Cross-instrument contradictions and corroborations. No model needed | built, tested |
| **5 — report** | The candidate-facing documents. Template + findings → Word | renderer built; findings still hand-derived |

**Measured:** layers 1–2 reproduce **18.5%** of the assessor's marks at their
ceiling, 5.8% as shipped. The judgement layer carries **~70%** (`npm run measure`).

## Layout

```
src/scoring/
  thresholds.ts          instrument specs — 60 WAT @15s, 45+ SRT target, 80-90 word SDT
  completeness.ts        Layer 1
  lexical.ts             Layer 2 — every finding declares a `basis` (D14)
  judge/
    contract.ts          15 OLQs, ENTITLEMENTS, validateVerdict — rejects at the boundary
    rubric.ts            the prompt; STIMULI holds known slide content
    calibration.ts       measured base rates; rater-aware (D17)
    adapter.ts           createJudge(provider) — text in, validated vector out
    providers/           anthropic (SDK, cached, structured) · baseline · verdictsFile
  consistency/           Layer 4 — signals.ts normalises, engine.ts compares
  eval/agreement.ts      scores a judge; always reports the majority baseline
  report/template.ts     FRAMES, SLOTS, the withholding filter
  report/findings.ts     the reader's input contract (zod) — D16 enforced on parse, one FORBIDDEN regex
src/items/               item bank — D19, D24
  bank.ts                `items` row validated per type · assembleBooklet strips the key from what is released
  oir/                   OIR from books (D24): syllogism.ts the Venn-region solver for Ch17; figure.ts redrawn figures + counters, dice.ts cube solver, mirror.ts mirror/water text, fold.ts paper folding + whole-figure reflection (D29); key.ts the key-entry shape and check kinds (computed, codeSet, odd, letters…)
                         · check.ts runnable-rule helpers (walk, solveCodes, charMap, alphabet positions…) + splitKey · seed.ts file -> rows
                         <book>-<chapter>.ts the derived key per chapter: rule in words AND as code, held questions with reasons
                         (src/items/__tests__/oir-chapter-suite.ts runs the checks every chapter must pass)
  stats.ts               sitting-grain rows, pooled at read · p = correct/attempted · null not zero · leads
src/oir/score.ts         score-oir — raw, per-reasoning-type, percentile+band only WITH a norm, else null
src/oir/chapters.ts      OIR chapters = reasoning types (D26); every type in the bank must be listed (tested)
src/ppdt/                pictures.ts (manifest, validated) · note.ts (the character box) · feedback.ts (quick checks) · samples.ts · attempts.ts (D33)
                         · rubric.ts (the review headings, readReview, draftProblems — D34)
src/wat/rubric.ts        the WAT review headings, readWatReview, watDraftProblems (D41)
src/srt/ · src/sdt/      situations.ts (bank, held, sets, rows) · rubric.ts (D39) · prompts.ts · rubric.ts (D40)
src/tat/                 pictures.ts (manifest + `shows`, validated) · sets.ts (sets, the blank, items/tests rows) · rubric.ts (per-story marks, D36)
src/oir/mocks.ts         the 20 mocks (D32): extendMocks (append-only, spread across types) · checkMocks · mock-result.ts summarise + standings
src/oir/practice.ts      chapter progress (latest answer counts) · New / Retry wrong / All queues · boundary parse
src/runner/              the test-taking engine — D18, UI.md §3. Pure, `now` injected, no timers
  modes.ts               seven modes, MODE_RULES, INSTRUMENT_CONFIGS (counts from thresholds.ts)
  schedule.ts            buildSchedule — timeline fixed at start · positionAt — pure resume
  engine.ts              start / resume / reduce → { state, effects }; release · persist · submitted
src/app/                 Next.js routes — (app)/ has the shell; run/[instrument] has none (UI.md §4)
  globals.css            the tokens — PYQVault's + runner-* (D20)
src/ui/
  catalog.ts             every test by SSB day; `ready` must equal RUNNABLE (tested)
  olq.ts                 15 OLQs by factor, as a candidate reads them
  shell/                 AppShell (sidebar ≥ md, bottom tabs below) · ThemeToggle
  runner/
    registry.ts          RUNNABLE — the only way a test becomes "ready"
    Runner.tsx           the React wrapper: renders engine state, carries out its effects
    session-store.ts     SessionStore — the contract (+ the in-memory reference store the tests use)
    server-store.ts      the app's store: server start time, clock offset, batched saves, retry, "not saved" state
    supabase-api.ts      start_session or start_test / save_response / end_session · loadLiveSession (reload, Home banner)
    content.ts           WAT words from content/wat-items.json — ships the whole deck (known gap)
    paper.ts             D22 paper mode — session code (no handwriting-confusable chars), sheet pages · OFFER_TYPED (D38)
  practice/              PracticeRunner — answer, then key + rule; A–D and Enter from the keyboard (D26) · Question.tsx, shared with mocks
  ppdt/                  PpdtRunner (D33): look, note, write · PictureGrid · PpdtResult (forStaff) · PpdtAttemptList
                         · NarrationRecorder (MediaRecorder, mic injected for tests) · SendForReview · ReviewClient (D34)
  tat/                   TatRunner (D36): twelve slides, paper · SetList · TatResult (slides + ground truth + marks) · TatReviewForm · TatReviewMarks
  paper/                 PaperBookletRunner (SRT and SDT on paper, D39-40) · PaperResult · Srt/SdtReviewForm · PaperReviewMarks · MarkPicker
  wat/ · results/        WatResult (photos + the words, D38) · WatReviewForm (D41) · AttemptRows (TAT and WAT on Results)
  review/                ReviewForm (the rubric) · ReviewMarks (what the candidate sees) · ReviewQueue (D34)
  mock/                  BookletRunner (D32) — engine + store, grid, flags, confirm, dark · MockGrid · AttemptList · MockReview
  sheet/                 AnswerSheet · PpdtSheet · TatSheet (12 stories, 6 pages) · SrtSheet (60, 4 pages) · SdtSheet (5, 2 pages) — /sheets/[instrument]; code on every page, no name
                         · SheetUpload (camera, shrunk on the phone, retake) · SheetPhotos (read-only) — D34
  auth/ · staff/ · admin/  LoginForm, ChangePasswordForm · AddPeopleForm (one person by fields | many from Excel), people-rows.ts (the one
                         row check, browser and server), people-sheet.ts (template, upload → rows, logins file), PeopleTable, PersonManage, PasswordField,
                         LoginHandout + login-message.ts (the WhatsApp message, D31) · CreateAcademyForm · GoogleSignIn (D42)
src/admin/candidates.ts  the owner's view of candidates with no academy (D42): candidateRows, searchCandidates — pure
src/lib/
  admin/candidates.ts    solo candidates, their sessions, one person's mocks scored via test_result (D42) · supabase/pages.ts allPages (past 1000 rows)
  practice/data.ts       chapter items (keyless) and the viewer's OWN practice answers, paged past 1000 rows
  mocks/data.ts          a mock and its questions in order (keyless) · your attempts · one attempt's result (D32)
  ppdt/data.ts           the pictures · your PPDT attempts · one attempt's answers (D33)
  paper/data.ts          SRT sets · attempts at SRT or SDT · one attempt · its review row (D39, D40)
  tat/data.ts            the sets (tests + slides) · your TAT attempts · one attempt · its review (D36) · wat/data.ts the same for WAT (D38)
  review/data.ts         the queue (review_queue) · an attempt's review · who took it (D34)
  auth/routing.ts        layered areas per role (D25); where each role lands; safeNext (no open redirects); which paths are public
  auth/acting.ts         the staff area's academy: staff their own, superadmin the one picked (acting_org cookie, checked)
  auth/viewer.ts         the data access layer — getViewer / requireViewerAt; every page asks here
  auth/password.ts       password rules (8-72, not the name or email) + generatePassword (Web Crypto) · own-password.ts
  phone.ts               mobile number → `+digits` (Indian without a code), and back for display
  sheet/                 zip.ts (stored write, stored/deflate read, size limits before unpacking) · xlsx.ts · csv.ts — no package (D31)
  supabase/              server · browser (the user's RLS client) · admin (service role — only after the DB says yes)
src/proxy.ts             refreshes the session; sends visitors with none to /login (optimistic only)
src/db/admin/            users.ts (insertAccount, user:create) · people.ts (createPeople — D23) · manage.ts (password, switch off, remove — D31)
                         · uploads.ts (sheet photos) · narration.ts (takes, submitForReview + sweep) — the database decides first, then links are signed (D34)
supabase/migrations/     0001 tenancy+clock · 0002 FK indexes · 0003 people creation · 0004 create_academy · 0005 items + item_keys (keys server-only) · 0006 staff practice (by_staff) · 0007 practice_answers + answer_practice (D26)
                         · 0008 manage people: phone, deactivated_at, can_manage_person + update_person, record_guardian_consent, set_person_role, set_person_active (D31)
                         · 0009 OIR mocks: tests + test_items, sessions.test_id, start_test, save_response A-D, test_result, once-sat-fixed guards · 0010 my_test_attempts · 0011 its FK index (D32)
                         · 0012 PPDT: phase lengths in instrument_timings, sessions.item_id, start_ppdt, save_response note/write windows (D33)
                         · 0013 begin_sheet_upload · 0014 narrations + bucket, begin_narration, submit_for_review, fresh paths
                         · 0015 evaluations.reviewer_id, one human review per attempt, review_attempt, review_queue (D34)
                         · 0016 optional date of birth: the consent check only for a known under-18 (D37)
                         · 0017 TAT: timings, sets as tests, start_tat, OIR reads OIR-only, 8 photo pages, review_tat, review_queue + type (D36)
                         · 0018 SRT + SDT: timings, SRT sets, start_srt, A-D only for OIR, submit for both, review_srt, review_sdt (D39, D40)
                         · 0019 WAT review: submit_for_review takes WAT, review_wat, review_queue + WAT (D41)
                         · 0020 Google sign-up: profiles.joined_via, the before-user-created hook, a Google user's profile by trigger · 0021 that trigger on update too (D42)
corpus/                  candidate data — records/ is GITIGNORED
content/                 stimulus material — WAT deck, item bank, TAT pictures + sets (tat/), the graded batch's TAT slides (tat-images/), OIR transcriptions (oir/) + oir-items.json
scripts/                 build + measurement entry points
```

## Commands

```bash
npm test              # 2755 tests (never touches the database)
npm run test:db       # 233 tests against the live project: access rules, server clock, logins, who-creates-whom, the runner's store, sheet photos, narration, review — fixtures cleaned up
npm run user:create -- --email … --name … [--dob YYYY-MM-DD] [--role mentor --org slug] [--guardian-consent]
npm run dev           # the app at localhost:3000
npm run build         # production build (type-checks app code)
npm run lint
npm run typecheck     # everything, tests included — 4 known errors, see SUGGESTIONS.md
npm run audit:mobile  # live build at 320/360/390px + keyboard-up runner; exits 1 on a finding. Needs a CDP browser and test logins in AUDIT_CANDIDATE_* / AUDIT_STAFF_* (script header)
npm run measure       # what share of assessor marks each layer reproduces
npm run consistency   # Layer 4 over the corpus
npm run evalset       # records/ -> 124 paired TAT stories (gitignored)
npm run blindset      # eval set with ground truth stripped
npm run fixture       # pseudonymous count fixture (committed; tests read this)
npm run watitems      # WAT deck -> seeded item bank
npm run oiritems      # OIR transcriptions + derived keys -> content/oir-items.json (held questions listed, never written)
npm run items:seed    # content/oir-items.json -> items + item_keys. DRY RUN by default; -- --apply writes. Upsert by id, never deletes
npm run oirmocks      # content/oir-items.json -> content/oir-mocks.json. Append-only: existing mocks are never rebuilt
npm run tests:seed    # content/oir-mocks.json -> tests + test_items. DRY RUN by default; insert-only, refuses a changed mock
npm run ppdtslides    # content/ppdt/source + pictures.json -> public/ppdt/*.jpg (needs a CDP browser, as audit:mobile)
npm run ppdt:seed     # the pictures -> items (type ppdt). DRY RUN by default; upsert by id
npm run ppdtsheet     # /sheets/ppdt printed -> public/ppdt-sheet.pdf (needs the app running and a CDP browser)
npm run tatslides     # content/tat/source + pictures.json -> public/tat/*.jpg
npm run tat:seed      # the TAT pictures, the blank and the sets -> items, tests, test_items. DRY RUN by default; sets insert-only
npm run tatsheet      # /sheets/tat printed -> public/tat-sheet.pdf (6 pages)
npm run srt:seed      # the SRT situations and sets -> items, tests, test_items. DRY RUN by default; sets insert-only
npm run srtsheet · sdtsheet   # /sheets/srt (4 pages) and /sheets/sdt (2) printed -> public/*-sheet.pdf
                      # A listed chapter goes live on --apply, not on push: seed only after the code that draws its questions is deployed
npm run eval                              # baselines only, no credential needed
npm run eval -- --model claude-opus-5     # the D5 bake-off
node scripts/build-reports.mjs [candidate]   # candidate reports as .docx
```

## Constraints that bite

**Privacy.** `corpus/records/` holds psychological self-disclosure from candidates
who are mostly minors, under real names. Gitignored and must stay so. Tests read
`src/scoring/__tests__/fixtures/corpus-counts.json` — pseudonymous integers only.

**Report grounding (D16).** Generated reports may use only the candidate's own
responses, the known stimulus, the rubric, and Layer 1/2 output. **Never** the
human assessor's marks — none of that exists in production. **Never** a
comparison with another candidate. `build-reports.mjs` enforces the second with a
guard that throws, but a regex only catches what you thought of — read the output.

**One rater (D17).** All 11 records are from `yogesh-dutta`. More assessors are
expected. **Compute per rater before pooling** — pooling on arrival destroys the
comparison. [`corpus/SECOND-ASSESSOR-LEDGER.md`](./corpus/SECOND-ASSESSOR-LEDGER.md)
lists every conclusion a second assessor settles.

**No selection verdict (D15).** The assessor's reports end with a standing band
(Low-Borderliner / Borderliner / High-Borderliner). We do not emit it —
`ARCHITECTURE.md` §9.1 forbids predicting a recommendation.

## Blocked on the user

- **The D5 bake-off** needs an `ANTHROPIC_API_KEY` or an `ant auth login` profile.
  Everything else for it is built.
- **Sprint 2** (ROADMAP) — OIR verbal is complete from the book (D24; all verbal chapters seeded and practisable, D26, D28; Ch17 Q94-97 fall beyond the photos);
  the book's answer key still to come (37 medium keys are listed for it to settle first); timed mocks are built (D32);
  non-verbal still needs figure assets.
- **A second assessor.** Everything it unblocks is listed in the ledger (D17 above).

Deferred work carries over in [`SUGGESTIONS.md`](./SUGGESTIONS.md) with the
reasoning; strike items there when done rather than deleting them.

## Git

A local pre-commit hook (`.git/hooks/pre-commit`, not versioned — recreate it on a fresh clone) runs
the candidate-name scan and refuses the commit on a hit.

Remote: **private** `github.com/lwspune/crackssb` (branch `main`) — keep it private: it holds the OIR book with answer keys and pseudonymised candidate quotes. Before any commit or push, `git status` and re-scan for names
(D21; `no-candidate-names.test.ts` does the scan locally) — the `.gitignore` covers `corpus/records/`, `corpus/reports/`, `corpus/report-findings.json`
and the single-candidate script — and `.mcp.json`, which holds the Supabase access token.

## Vercel

Live at **https://cadetprep.in** (D30; `www` redirects to it; DNS at GoDaddy: `A @` and `CNAME www`, the values Vercel
gives). Also `crackssbai.vercel.app` and `crackssb-bay.vercel.app`; `crackssb.vercel.app` belongs to someone else.
The project-scoped token cannot see or create certificates (403). Project `crackssb` (`prj_T81bvhmqcBtWmTdJe2F6hfamFrxG`, team `team_4QOTBc7SjXa7BdolwrS61ABp`),
deploys on every push to `main`. **Functions run in `bom1` (Mumbai)**, beside the database — check a response's
`x-vercel-id` reads `bom1::bom1`. Env vars: the three Supabase keys, the service-role one marked Sensitive.
The Vercel token is in `.mcp.json` (gitignored); it is project-scoped (it cannot list the user or teams), so pass
`teamId` on every API call. Supabase's Site URL and redirect allow-list follow the live address.
**Hobby plan:** Vercel deploys only commits whose author is the account owner. A deploy in state `BLOCKED` ("commit
author doesn't have permission") means the commit's GitHub account is not linked to the Vercel login — on 2026-10-12
`lwspune` was linked under Account Settings → Authentication and the blocked deploy was redeployed. Never "Upgrade to Pro" for this.

## Supabase

Project `qwxbvcsqhcjthdorkzlc`, **ap-south-1 Mumbai** (created 2026-10-12; a first project landed in Seoul and was replaced while empty). Claude reaches it through the Supabase MCP server in
`.mcp.json` (gitignored, scoped to this project). Keys are in `.env.local` (gitignored); the service-role key is server-only. Staff make logins (script or app); students sign up only with Google — the before-user-created hook (0020) refuses every other sign-up, so sign-up is on in the auth settings for Google's sake.
Tests run against this same project by the user's choice — every fixture tagged and removed, and a
leftover-fixture check fails the run (Question_Bank learned this the hard way; see its testdb.ts).

Migrations live in `supabase/migrations/` (the source of truth) and are applied through the MCP.
**From a session started in another repo the MCP is THAT repo's project** (Question_Bank's is PYQ Vault production):
call `get_project_url` and see `qwxbvcsqhcjthdorkzlc` before any `apply_migration`. 0005 was applied through the
Management API (`POST /v1/projects/qwxbvcsqhcjthdorkzlc/database/migrations`) with the token in this repo's `.mcp.json` for that reason.
Never edit an applied one; add the next number. Rules belong in the database: `access.db.test.ts`
is the gate, and it was checked by loosening a policy and watching exactly its tests fail.

**Accepted advisor warnings:** `start_session`, `save_response`, `end_session`,
`can_create_person`, `create_academy`, `answer_practice`, `can_manage_person`, `update_person`,
`record_guardian_consent`, `set_person_role`, `set_person_active`, `start_test`, `test_result`, `my_test_attempts`, `start_ppdt`,
`begin_sheet_upload`, `begin_narration`, `submit_for_review`, `review_attempt`, `start_tat`, `review_tat`, `start_srt`, `review_srt`, `review_sdt`, `review_wat` are SECURITY DEFINER and callable by signed-in users —
by design: they are the only write paths and check ownership, timing, consent and role
themselves. Anything else the advisors raise is a finding.
