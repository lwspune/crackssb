# CrackSSB

Online portal for **SSB** (Services Selection Board) preparation — the 5-day
officer-selection process for the Indian Armed Forces. B2C candidates and B2B
coaching academies. Launch entry type: NDA.

**The four planning documents are authoritative and this file does not repeat them:**

| file | holds |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Schema, the 15-OLQ vector, edge-function contracts, the four seam rules, honest-claims policy |
| [`ROADMAP.md`](./ROADMAP.md) | Phases, sprint order, gates, blockers, content lift |
| [`UI.md`](./UI.md) | Roles (4 in schema, 3 experiences), the **seven runner modes** and their contracts, timing rules, per-role IA, build order |
| [`DECISIONS.md`](./DECISIONS.md) | **D1–D19.** The long-form *why* trail. Append only; supersede rather than edit |

Read `DECISIONS.md` before changing anything in `src/scoring/` — most of what
looks arbitrary there is a recorded decision with evidence behind it.

---

## Current state

**Pre-product, with a UI.** A Next.js 16 app (`src/app/`, `src/ui/`) now runs
the student surface on local data: app shell, Practise by SSB day, honest empty
states, and the **WAT runner** wrapping the engine. **Sprint 1 is under way:** the
**Sprint 1 is complete.** The database (tenancy, access rules) is live and gated by
tests; sign-in works (email + password, manual logins); staff create logins in the
app (`/staff/people`, D23) and the superadmin creates academies (`/admin`). The
runner saves to the server and runs on the server's clock: start time from
`start_session`, answers through `save_response` (refused outside their window),
countdown on the measured offset to the server, resume on any device. Also present:
the psych-scoring engine, built early because hand-graded dossiers arrived
early (D3's revisit trigger), and the headless runner engine (D18).

```
645 tests passing · npm test        lint clean · npm run lint        npm run build green
64 database tests passing · npm run test:db        mobile audit clean · npm run audit:mobile
```

**Type-checking is new.** `npm run typecheck` checks everything and currently
reports four known errors in pre-existing test files (SUGGESTIONS.md). `next
build` checks app code only, via `tsconfig.build.json`.

**Look (D20).** PYQVault's palette and fonts, token for token, plus a navy
surface for the shell and hero; the runner is dark in both modes. Copy is terse by request. `src/ui/__tests__/theme-contrast.test.ts` gates every
colour pair against WCAG AA from `globals.css` as it ships.

**Candidates are ids (D21).** `cand-01`…`cand-11` in everything committed; the mapping is
`corpus/records/PSEUDONYMS.md`. Never write a real name outside the ignored folders.

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
  oir/                   OIR from books (D24): key.ts the key-entry shape · check.ts runnable-rule helpers + splitKey · seed.ts file -> rows
                         <book>-<chapter>.ts the derived key per chapter: rule in words AND as code, held questions with reasons
  stats.ts               sitting-grain rows, pooled at read · p = correct/attempted · null not zero · leads
src/oir/score.ts         score-oir — raw, per-reasoning-type, percentile+band only WITH a norm, else null
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
    supabase-api.ts      start_session / save_response / end_session · loadLiveSession (reload, Home banner)
    content.ts           WAT words from content/wat-items.json — ships the whole deck (known gap)
    paper.ts             D22 paper mode — session code (no handwriting-confusable chars), sheet pages
  sheet/                 AnswerSheet — the printable sheet at /sheets/[instrument]; code on every page, no name
  auth/ · staff/ · admin/  LoginForm · AddPeopleForm, people-lines (paste parser), PeopleTable · CreateAcademyForm
src/lib/
  auth/routing.ts        where each role lands; safeNext (no open redirects); which paths are public
  auth/viewer.ts         the data access layer — getViewer / requireViewerAt; every page asks here
  supabase/              server · browser (the user's RLS client) · admin (service role — only after the DB says yes)
src/proxy.ts             refreshes the session; sends visitors with none to /login (optimistic only)
src/db/admin/            users.ts (insertAccount, user:create) · people.ts (createPeople — D23)
supabase/migrations/     0001 tenancy+clock · 0002 FK indexes · 0003 people creation · 0004 create_academy · 0005 items + item_keys (keys server-only)
corpus/                  candidate data — records/ is GITIGNORED
content/                 stimulus material — WAT deck, item bank, TAT images, OIR transcriptions (oir/) + oir-items.json
scripts/                 build + measurement entry points
```

## Commands

```bash
npm test              # 645 tests (never touches the database)
npm run test:db       # 57 tests against the live project: access rules, server clock, logins, who-creates-whom, the runner's store — fixtures cleaned up
npm run user:create -- --email … --name … --dob YYYY-MM-DD [--role mentor --org slug] [--guardian-consent]
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
- **Sprint 2** (ROADMAP) — OIR verbal has a source (D24; Chapter 11 seeded, ten chapters to go,
  the book's answer key still to come); non-verbal still needs figure assets.
- **A second assessor.** Everything it unblocks is listed in the ledger (D17 above).

Deferred work carries over in [`SUGGESTIONS.md`](./SUGGESTIONS.md) with the
reasoning; strike items there when done rather than deleting them.

## Git

Remote: **private** `github.com/lwspune/crackssb` (branch `main`) — keep it private: it holds the OIR book with answer keys and pseudonymised candidate quotes. Before any commit or push, `git status` and re-scan for names
(D21; `no-candidate-names.test.ts` does the scan locally) — the `.gitignore` covers `corpus/records/`, `corpus/reports/`, `corpus/report-findings.json`
and the single-candidate script — and `.mcp.json`, which holds the Supabase access token.

## Supabase

Project `qwxbvcsqhcjthdorkzlc`, **ap-south-1 Mumbai** (created 2026-10-12; a first project landed in Seoul and was replaced while empty). Claude reaches it through the Supabase MCP server in
`.mcp.json` (gitignored, scoped to this project). Keys are in `.env.local` (gitignored); the service-role key is server-only. Sign-in is manual: accounts are created by script, public sign-up off.
Tests run against this same project by the user's choice — every fixture tagged and removed, and a
leftover-fixture check fails the run (Question_Bank learned this the hard way; see its testdb.ts).

Migrations live in `supabase/migrations/` (the source of truth) and are applied through the MCP.
**From a session started in another repo the MCP is THAT repo's project** (Question_Bank's is PYQ Vault production):
call `get_project_url` and see `qwxbvcsqhcjthdorkzlc` before any `apply_migration`. 0005 was applied through the
Management API (`POST /v1/projects/qwxbvcsqhcjthdorkzlc/database/migrations`) with the token in this repo's `.mcp.json` for that reason.
Never edit an applied one; add the next number. Rules belong in the database: `access.db.test.ts`
is the gate, and it was checked by loosening a policy and watching exactly its tests fail.

**Accepted advisor warnings:** `start_session`, `save_response`, `end_session`,
`can_create_person`, `create_academy` are SECURITY DEFINER and callable by signed-in users —
by design: they are the only write paths and check ownership, timing, consent and role
themselves. Anything else the advisors raise is a finding.
