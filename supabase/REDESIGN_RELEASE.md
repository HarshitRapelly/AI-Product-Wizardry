# Redesign release — production runbook

Scope: the redesign branch (`feature/portal-redesign`). It adds **eight** migrations and a new frontend.
Production (`onnibnneaxlzlyewhrnf`) is on Migrations 1–14 and has none of them.

| Migration | What it does | Real dependencies (from the SQL) |
|---|---|---|
| `20261121000100_enquiries` | Contact-form storage (`public.enquiries`, RPC `public.submit_enquiry`) | `auth.users` (FK), `auth.uid()` only |
| `20261121000200_registration_offline_only` | New registrations offline only; `preferred_slot`/`main_device` nullable and optional; trigger `profiles_learning_mode_guard` blocks students changing their mode | `private.normalize_registration`, `private.apply_registration`, `private.create_profile_for_user` (Migrations 6/12), `public.profiles`, `public.student_registrations` |
| `20261121000300_student_code` | Column `student_registrations.student_code` (unique, NOT NULL), triggers `student_registrations_assign_student_code` / `_student_code_guard`, sequence `private.student_code_seq`, RPC `public.my_student_code()`; backfills existing rows (format `AIW-YYYY-NNNNNN`) | `public.student_registrations` and its `student_registrations_set_updated_at` trigger (Migration 6) |
| `20261121000700_student_code_apw` | Student IDs become `APW` + 7 secure random digits (`private.new_student_code()`); converts existing codes once | **only** 0300's objects, the Migration 6 updated-at trigger, and **pgcrypto** (`extensions.gen_random_bytes`) |
| `20261121000400_cohort_profiles` | `public.cohort_profiles` (RLS: own row), RPC `public.list_cohort_profiles()` | `auth.users`, `public.profiles`, `public.student_registrations`, `private.is_registered`, `public.set_updated_at` (Migrations 1/6) |
| `20261121000500_cohort_events` | `public.cohort_events` (students read published rows only) | `public.student_registrations`, `public.set_updated_at` (Migrations 1/6) |
| `20261121000800_online_mode_locked` | **Online closed for everyone** (backend part): Online-only events (`learning_mode = 'online'`) no longer readable through the API; students can no longer write recorded-session (`item_type = 'video'`) progress. No row is changed | **only** 0500's read policy on `public.cohort_events` and Migration 2's `public.lesson_progress`. Uses no level/module identifiers |
| `20261121000600_rename_level_to_module` | Internal rename `level` → `module`: table `curriculum_level_releases`, `level_id` columns on 6 tables, 8 constraints, 1 index, 2 triggers, 3 policies, helper functions, function bodies, error messages | Migrations 9–14 objects only. Touches nothing created by 0100–0500, 0700 or 0800 |

Notes on the dependency analysis (based on the SQL, not file names):
- 0300, 0400 and 0500 headers say "Run AFTER" the previous file; that is the authoring sequence, not a
  dependency. 0300, 0400 and 0500 do not read anything created by 0100, 0200 or each other.
- 0700 depends only on 0300 (+ pgcrypto). 0800 depends only on 0500 (+ Migration 2).
- 0600's self-check scans every public/private function body for `level_id`, `level_released`,
  `level_complete`, `curriculum_level_releases`; none of 0100–0500, 0700 or 0800 contains them, so 0600 can run
  after all of them (rehearsed: 0600 ran last).
- The frontend must be live before 0600 (it reads `module_id`/`my_module_progress` with a fallback to the
  old names) and must go live immediately after 0200 (it stops sending `preferred_slot`/`main_device`,
  which the database only accepts as optional after 0200).

Rules: never `supabase db push` to production; production has no migration-history table; apply files
one at a time (SQL Editor, or `npx supabase db query --remote=onnibnneaxlzlyewhrnf --yes -f <file>`);
stop at the first error. Each file is a single transaction.

## Production status (23 Nov 2026)

The redesign release is **live**: migrations 0100 → 0300 → 0700 → 0400 → 0500 → 0200 → 0800 were applied to production
on 22 Nov 2026 (each verified; integrity unchanged; student-ID mapping exported) and PR #3 was merged into `main`
(Vercel production deploy). **0600 is still pending** (separate approval). The production smoke test after the merge
has not been recorded yet.

## Follow-up release (round 2, branch `feature/portal-ui-round2`) — not yet in production

| Change | Notes |
|---|---|
| `20261123000900_brochure_download_user_details` | New table `public.brochure_download_user_details` (name, email, contact number, user_id, created_at) + RPC `public.submit_brochure_request` (anon + authenticated; honeypot; 5/hour per email, 300/hour overall). RLS on, no policies, no table grants: readable only in the dashboard. Depends only on Migrations 1–14. **Staging: applied and tested** (verification 6/6, `brochure_request_checks.sql` passed, re-run idempotent, negative control failed as expected). **Production: not applied** — apply it **before** merging the round-2 PR (the brochure form needs it). Rollback: `supabase/rollback/20261123000900_brochure_download_user_details.down.sql` (keeps the table if it has rows unless the data-loss override is set) |
| Frontend | Brochure button opens a details form; download starts after the details are saved. `/explore` page removed (links scroll to `/#explore`; `/explore` redirects). Dashboard: Student ID removed (still on Profile), "Your cohort" card replaced by "AI news". Assignments: reference layout, upload / jury summary locked until Module 1 is released (unchanged behaviour), quiz history moved to Grades. New "Live sessions" page + sidebar tab. Profile: Settings card (learning mode: Online unavailable; notification switches shown, not functional yet). Quiz: unanswered questions are highlighted and opened when Submit is pressed. Safari: `-webkit-backdrop-filter`, explicit `transform-box` for pixel-origin SVG animations |
| Placeholders | AI-news sample headlines only (placeholder events and the placeholder due date were removed 23 Nov; the calendar shows the real programme schedule): **on by default in the local dev server, off in every build** (Production, Preview) unless `VITE_SHOW_DEMO_EVENTS=true`; `false` turns them off locally. Set `VITE_SHOW_DEMO_EVENTS=true` for **Vercel Preview only**. Verified: the production bundle contains none of the placeholder text |
| Round 3 | `/modules`: Module 0 lesson list removed. Lesson view: full-screen reading button (Fullscreen API; full-window mode where unsupported, e.g. iPhone Safari). Explore links always scroll to `#explore` on the home page (also on repeated clicks). More placeholder sessions and sample news |

Production steps for round 2 (each needs explicit approval): read-only
`20261123000900_brochure_download_user_details_readonly_verification.sql` (all false) → apply 0900 → the same file
(6/6 true, 0 rows) → merge the round-2 PR → smoke test (brochure form saves and downloads; Explore scrolls; Live
sessions shows "Sessions will appear here…"; no placeholder content).

## Online is closed for everyone

Policy: **Offline is the only learning mode, for new and existing students, until the program team
explicitly reopens Online** (that would need a new migration and a frontend change; there is no setting).
Historical data is preserved: stored `learning_mode = 'online'` values are never rewritten.

| Layer | Enforcement |
|---|---|
| New registrations | 0200: `learning_mode` must be `offline` (`invalid_registration:learning_mode`), also for an existing Online profile completing its registration |
| Changing mode | 0200: students cannot change `profiles.learning_mode` (`mode_locked`, 42501); no workaround exists |
| Online-only data | 0800: Online-only events are not readable; recorded-session (`video`) progress cannot be written (`online_locked`, 42501). Existing rows are kept |
| Frontend | `src/lib/learningMode.ts`: a stored `online` is treated as `offline` for access; every `/online/...` URL redirects to the matching `/offline/...` page, or to `/online-closed` (recordings); `ModeRedirect` defaults to Offline; Online page components are no longer routed |
| Wording | "Online mode — Closed", "Online learning is currently unavailable"; the Explore FAQ says Online is unavailable to everyone. No reopening is promised |

Online-only RPCs: none exist (audited: no policy, RPC or function grants access based on `learning_mode`).

## Rehearsal status (staging `luqrxeagwfwevhskjomn`, 21 Nov 2026) — completed

Everything below actually ran on staging. Commands: `npx --no-install supabase db query --remote=luqrxeagwfwevhskjomn
[--read-only] [--yes] [--output-format json] -f <file>`. Browser checks: headless Chrome (CDP) against the local dev
server connected to staging; the previous frontend was commit `7e82c88` served separately on another port.

### A. 0700 rollback and re-apply
- Rollback run with only `set aiw.rollback_allow_data_loss = 'on';` before the unmodified file: exit 0. 3 codes
  back to `AIW-YYYY-NNNNNN`, unique; generator removed; triggers enabled; other registration columns' fingerprint
  unchanged; 0300 verification + `student_code_checks.sql` passed.
- 0700 re-applied: exit 0; verification + `student_code_apw_checks.sql` (300 IDs) passed.
- **Observed:** each student's ID changed twice and the original APW IDs were lost. Export IDs before any rollback.
- The rollback's refusal without the override was inspected, not exercised.

### B. Full forward rehearsal from the pre-0100 state
1. **Exports** (verified: row counts equal, local md5 = database md5, unchanged on a second read): 1 enquiry,
   3 cohort profiles, 3 student-ID mappings. Baseline captured: schema fingerprints, all function bodies,
   migration state, row counts, data fingerprints, CLI migration history (14 entries).
2. **Reset = full rollback rehearsal** in the documented order: 0600 → 0200 (`aiw.rollback_keep_nullable = 'on'`;
   1 registration has no slot/device) → 0500 → 0400 → 0700 → 0300 → 0100 (data-loss override where required;
   each wrapper diff-checked to be the unmodified file plus one `set` line). All exit 0. Afterwards every redesign
   object was gone, all 27 functions matched the original pre-redesign snapshot (body, definer, config, owner,
   grants), and progress, attempts, profiles, auth users and curriculum data had identical fingerprints.
3. **Forward sequence actually executed:** 0100 → 0300 → 0700 → 0400 → 0500 → 0200 → 0800 → (frontend checks) → 0600.
   Every migration exit 0; every read-only verification all `*_ok` true immediately after it (0100: 6, 0300: 10,
   0700: 8, 0400: 5, 0500: 7, 0200: 7, 0800: 7, 0600: 14). Each step's behaviour test passed (after the test-data
   corrections below).
4. **Previous frontend (`7e82c88`)** — sign-in + 11 pages, no exceptions, no failed Supabase requests — passed on the
   pre-0100 database and after every step: 0100, 0300, 0700, 0400, 0500, 0200 (+0800). Not run after 0600 (the old
   frontend only knows the level names; that is why 0600 comes after the new frontend).
5. **Regression tests** after 0200 (+0800), before 0600 — all passed: `registration_offline_checks`,
   `registration_checks`, `college_id_checks`, `enquiries_checks`, `student_code_apw_checks`,
   `cohort_profiles_checks`, `cohort_events_checks`, `level_release_checks`, `online_lock_checks`; plus every
   applied migration's verification again.
6. **0800 security tests:** `online_lock_checks.sql` passed (existing Online student and Online profile through the
   Data API: Online-only events hidden, mode change refused, video progress refused, Online registration refused,
   Offline registration works, stored values untouched). **Negative controls** (lock removed inside a rolled-back
   transaction) made it fail exactly at A1 (events) and A3 (video), so the test detects each gap.
7. **Redesigned frontend before 0600** (fresh isolated browser sessions):
   smoke (dashboard, modules, Module 0/1, calendar, cohort, assignments, grades, profile, explore, contact) passed;
   Module 0: subtopics `module_id` 400 → `level_id` 200, hub + outline + lesson shown, confirmation 6 → 7 of 7
   persisted across a full reload, no exceptions; cohort profile edit + save persisted (headline, visibility);
   end-to-end review 24/24 (Student ID + copy/clipboard, journey colours, calendar dropdown/page/times/navigation,
   Modules at 1440/768/390 px, View Score of the older attempt, Back to history, unknown attempt, logo → home,
   enrollment summary), no browser errors.
   **Online lock (browser + direct backend with the student's own session):** existing Online student lands on the
   Offline dashboard; 22 Online/legacy URLs redirect correctly (recordings → `/online-closed`); Online event hidden;
   mode change `42501 mode_locked`; video progress `42501 online_locked`; historical registration unchanged.
   Existing Online profile completing registration: Online refused (`invalid_registration:learning_mode`), Online
   card disabled ("Online mode — Closed"), Offline registration + waived enrollment complete, lands on the Offline
   dashboard, registration stored `offline` with an APW ID, stored profile value not rewritten.
8. **0600** applied separately; verification 14/14; `curriculum_checks`, `module_release_checks`,
   `quiz_reading_prerequisite_checks`, `rls_and_scoring_checks` passed; all regression tests above (with
   `module_release_checks` in place of `level_release_checks`) passed; all verifications true.
9. **Redesigned frontend after 0600:** smoke passed with no level-name fallback requests; Module 0 (subtopics 200
   with `module_id`, 6 → 7 of 7 persisted) passed; cohort save passed; review 24/24; both Online-lock browser
   suites passed.
10. **Restore:** the 3 original cohort profiles were re-inserted from the export (insert trigger suspended inside the
    transaction so `created_at` stays exact, re-enabled and checked): hash of the restored rows = export hash.
11. **Cleanup:** the 3 temporary users (`portal-preview@`, `online-existing@`, `online-completing@example.test`,
    identity-checked) and their identities, sessions, profiles, registrations, progress, attempts and cohort
    profile (via `ON DELETE CASCADE`), plus the rehearsal event, were removed. Verified: 0 left.
12. **Final integrity (read-only), all passed:** auth users, profiles, registrations, lesson progress (21),
    quiz attempts (6), assignments, curriculum, questions, answer keys, storage — counts and content hashes equal
    to the pre-reset baseline; 3 registrations, all `APW` + 7 digits, unique; other registration columns
    unchanged; CLI migration history unchanged (14); all three export files intact.

### Failures found and how they were corrected
| # | Failure | Cause | Correction |
|---|---|---|---|
| 1 | `student_code_checks` at step 0300: `invalid_registration:preferred_slot` | test registration data assumed 0200 | added `preferred_slot`/`main_device` to the test registration JSON (`student_code_checks`, `student_code_apw_checks`, `cohort_profiles_checks`) |
| 2 | `cohort_events_checks` at step 0500: same | same | same fix in `cohort_events_checks` |
| 3 | `level_release_checks` after 0200: `invalid_registration:learning_mode` | throwaway fixture registered as `online` | fixture changed to `offline` (assertions unchanged) |
| 4 | `curriculum_upgrade_checks`: "seed data missing" | LOCAL-only upgrade test; staging already has Migration 9 | **excluded** (see below) |
| 5 | Policy: Online must be closed for everyone | build allowed existing Online students | frontend lock + migration 0800 + `online_lock_checks.sql` + wording |
| 6 | **Product bug:** Module 0 showed "content is not available yet" before 0600 | race in the level/module name fallback: a concurrent request retried with the *current* shared names instead of the opposite of the names it used | `src/lib/schemaNameFallback.ts` (retry derived from the names captured before awaiting); regression test `tests/schemaNameFallback.test.ts` (`npm run test:unit`, 7 tests incl. a control reproducing the race) |
| 7 | `curriculum_checks` after 0600: `online_locked` | test inserted a legacy `video` row expecting acceptance | 0800 kept; fixture writes only the legacy reading row, plus an explicit negative test expecting `online_locked` |
| — | several browser-harness defects (case-sensitive label, preservation query scope, string escaping, stale tab, DOM nodes returned by value) | test scripts, not the app | fixed in the scratch scripts after evidence; app behaviour confirmed |

### Test exclusions (and why)
- `curriculum_upgrade_checks.sql` / `curriculum_upgrade_seed.sql`: "LOCAL TEST DATABASES ONLY"; need a database
  without Migration 9; the seed commits data. Never run on staging or production.
- `level_release_checks.sql` after 0600: historical (level names); replaced by `module_release_checks.sql`.
- `student_code_checks.sql` and the 0300 verification after 0700: they check the superseded `AIW-` format;
  0700's verification and `student_code_apw_checks.sql` cover student IDs from then on.
- Previous frontend after 0600: unsupported by design.

### Not rehearsed / limitations
- **0800 rollback** and the **frontend redeploy** part of the rollback have not been run.
- **pgcrypto** on production and the number of existing **`video` progress rows** on production are unknown (preflight).
- The production **build** compiles; the browser tests ran against the dev server (same source).
- `student_code_checks.sql` / `student_code_apw_checks.sql` contain direct `insert into student_registrations`
  statements without slot/device: they only work where those columns are nullable (after 0200, or on staging,
  which kept them nullable). Do not run them on a database where the columns are still NOT NULL.
- Staging's original **enquiry** was deleted by the reset and has not been restored (it is in the verified export).
- Staging's 3 student IDs were re-issued by the rehearsal (originals kept in the export).
- Behaviour tests are staging-only. The Online page components remain in the code base but are not routed.

## 0. Production preparation results (21 Nov 2026, read-only — nothing written to production)

| Item | Result |
|---|---|
| Identity (Supabase account API, not the CLI link) | `onnibnneaxlzlyewhrnf` = "ai-product-wizardry", ap-northeast-1, ACTIVE_HEALTHY, **Postgres 17.11.0.019** (staging: 17.12.0.000). CLI link unchanged (staging) |
| Migration state | Migrations 1–14 present (object checks; production has no migration-history table). **None** of the 8 redesign migrations applied |
| pgcrypto | `extensions.gen_random_bytes(integer)` present (pgcrypto 1.3) |
| Counts | auth users 7; profiles 7 (offline 6, no mode 1, **online 0**); registrations 6 (offline 6, **online 0**, all with slot/device); progress 7 (**video 0**); quiz attempts 4; assignments 0; subtopics 6; release rows 12 (released: Module 0 only); storage objects 0 |
| Verification files before apply | 6 of 8 ran (all "applied" checks false). **0700's and 0800's crashed** (they referenced `student_code` / `cohort_events` directly) → both **guarded** (test files only; nothing weakened); on the restored copy all 8 then ran cleanly before apply |
| Function grants | Production is **stricter** than staging's starting point (13 functions lack staging's extra `service_role` / `PUBLIC` execute grants); bodies identical |
| Backup | `Downloads/aiw-production-backup-20261121-185632-pre-redesign/` (7z, AES, encrypted file names; MANIFEST, RESTORE, SHA256SUMS; folder ACL = owner only). Passphrase in `%USERPROFILE%/aiw-backup-keys/` (owner only — move it to a password manager). Earlier backups untouched |
| Restore test | Isolated Docker `supabase/postgres:17.11.0.019`, network none: data counts + content hashes 31/31; columns, indexes, triggers, policies, functions identical; one CHECK printed with equivalent parentheses; effective API privileges identical (132); FK orphans 0; Migration 11 (12/12) and 12/13 (13/13) checks true |
| **Release rehearsal on the restored production copy** | 0100 → 0300 → 0700 → 0400 → 0500 → 0200 → 0800, then 0600: every migration exit 0, every verification all true (6/10/8/5/7/7/7/14), all behaviour + regression tests passed with production's grants and data, data preserved, 6/6 registrations got unique APW IDs |
| Frontend | `npm run test:unit` 7/7; `npm run build` OK. A **local** build embeds the staging URL (`.env.local`) → the production bundle must be built **by Vercel with the Production environment**. No test credentials or debug code in `src` |
| Not verifiable from this machine | Vercel project settings (no `.vercel` link, no Vercel CLI): Production env → `onnibnneaxlzlyewhrnf`, Preview env → `luqrxeagwfwevhskjomn`, production branch |
| Release configuration (decided 22 Nov 2026) | Demo events: build flag `VITE_SHOW_DEMO_EVENTS`, **off unless exactly `true`**; Production must not set it (verified: a build without it contains no placeholder events). Batch 1 start date: **not confirmed** → `PROGRAM.batchStart = null`: home shows "Batch 1 · start date to be announced · in person", dashboard shows no countdown / week number |

## 1. Before the window

1. Vercel Production must **not** define `VITE_SHOW_DEMO_EVENTS` (Preview may set it to `true`). When the Batch 1 date is officially
   confirmed, set `batchStart` (YYYY-MM-DD) in `src/config/program.ts` in a reviewed commit; until then it stays `null`.
2. `npm run test:unit` and `npm run build` pass on the exact commit to be deployed.
3. In the Vercel dashboard: Production env vars = production project URL + publishable key; Preview env vars = staging; note the production branch.
4. Approved commit/push of the release commit (Vercel builds it). Have the deployment ready, so the gap after step 7 below is minutes.
5. The backup above is valid only while production is unchanged; take a new one (same procedure, RESTORE.txt) if the window is on another day or data changed.

## 2. Release window — exact commands (production; only after explicit approval)

All commands from the repo root. Never `supabase db push`. Never relink. Stop at the first failure.

```
A="npx --no-install supabase db query --remote=onnibnneaxlzlyewhrnf"
# Preflight (read-only)
$A --read-only --output-format json -f supabase/tests/release_integrity_readonly.sql      # record as the baseline
for f in supabase/tests/20261121000*_readonly_verification.sql; do $A --read-only --output-format json -f "$f"; done   # all "applied" checks false
```

| Step | Command | Expected (stop if different) |
|---|---|---|
| 1 | `$A --yes -f supabase/migrations/20261121000100_enquiries.sql` | exit 0; `…000100…_readonly_verification.sql` 6/6 true, `snapshot_enquiries` 0 |
| 2 | `$A --yes -f supabase/migrations/20261121000300_student_code.sql` | exit 0; **immediately** `…000300…` 10/10 true, `snapshot_rows_with_code` = registrations |
| 3 | `$A --yes -f supabase/migrations/20261121000700_student_code_apw.sql` | exit 0; `…000700…` 8/8 true; then export `release_student_id_mapping_readonly.sql` (store privately) |
| 4 | `$A --yes -f supabase/migrations/20261121000400_cohort_profiles.sql` | exit 0; `…000400…` 5/5 true |
| 5 | `$A --yes -f supabase/migrations/20261121000500_cohort_events.sql` | exit 0; `…000500…` 7/7 true |
| 6 | `$A --yes -f supabase/migrations/20261121000200_registration_offline_only.sql` | exit 0; `…000200…` 7/7 true; mode snapshots unchanged |
| 7 | `$A --yes -f supabase/migrations/20261121000800_online_mode_locked.sql` | exit 0; `…000800…` 7/7 true; snapshots = preflight counts; `…000500…` still 7/7 |
| 8 | Deploy/promote the approved Vercel production build **immediately** | deployment ready on the production URL |
| 9 | Smoke test (below) + `release_integrity_readonly.sql` | all pass; counts and hashes equal the baseline |
| later | `$A --yes -f supabase/migrations/20261121000600_rename_level_to_module.sql` — separate approval, quiet period | `…000600…` 14/14 true; counts identical before/after; smoke test again |

After every step also run `release_integrity_readonly.sql` and compare it with the baseline.

Why this order:
- Steps 1–5 are additive and invisible to the **current** frontend (rehearsed: the previous frontend passed after each).
- 0700 directly after 0300: students never see an old-format ID.
- Steps 6–8 back to back: until step 8 the old frontend is live — an Online choice there gets an account without a
  saved registration (completed offline after sign-in), and existing Online students (production: 0) would still see
  old Online pages. Keep this gap to minutes.
- 0600 only after the new frontend is stable; the new frontend works before and after it (rehearsed both).

**Smoke test after step 8** (team account): home, Explore (round 2: scrolls to the journey section), Contact (one test enquiry, then
mark it `closed`), sign in, dashboard (Student ID `APW…`), modules, Module 0 (content loads; confirm a lesson; reload),
calendar (no placeholder events unless approved), cohort, assignments → View Score → Back, profile;
`/online/dashboard` → `/offline/dashboard`; `/online/module/1/recordings` → "Online learning is closed".

The behaviour tests (`supabase/tests/*_checks.sql`) create rows inside a rolled-back transaction — staging or an
isolated restored copy only, **never production**.

## 3. (Optional) seed calendar events

Events are added by the program team in the SQL Editor (no admin screen yet). Example:

```sql
insert into public.cohort_events (title, description, category, start_at, end_at, location, learning_mode, is_published)
values ('Module 0 orientation', 'Welcome session for Batch 1.', 'live_session',
        '<YYYY-MM-DD> 10:00+05:30', '<YYYY-MM-DD> 11:30+05:30', 'Lecture Hall 1', 'offline', true);   -- confirmed date only
```

Only real, confirmed events. `learning_mode` null = all students, `offline` = offline cohort. Rows marked `online` are
not shown to anyone while Online is closed. Unpublished rows are invisible. Allowed categories: `live_session`,
`guest_lecture`, `assignment_due`, `jury`, `workshop`, `other`.

## Rollback and incidents

**Rules (production):** never run a rollback automatically; any rollback, destructive recovery or change to the
Online lock needs separate explicit approval. **Never redeploy the previous frontend** as a routine rollback (it shows
the Online portal to existing Online students). **Never roll back 0800** as a routine measure.

| Situation | Action |
|---|---|
| A migration or verification fails | Stop the release. No later migrations, no improvised SQL. Each file is one transaction, so a failed file changed nothing; capture the output and `release_integrity_readonly.sql`, report |
| Frontend deployment fails after steps 1–7 | Keep all database restrictions. Offline students keep working on the old frontend (rehearsed); prepare a compatible frontend fix and deploy it |
| New frontend live but defective | Fix forward with a new build; the database supports it before and after 0600 |
| 0600 causes a problem | `…000600…down.sql` restores the level names; the new frontend keeps working (rehearsed). Needs approval |

Database rollbacks that exist (all need approval; data-loss guards refuse unless overridden):

| Order | File | Notes |
|---|---|---|
| 1 | `…000600…down.sql` | No data change. Rehearsed |
| 2 | `…000800…down.sql` | Re-opens Online-only events and video-progress writes — **against the policy**; not rehearsed |
| 3 | `…000200…down.sql` | Needs the previous frontend live (requires slot/device again), which the policy forbids redeploying; `aiw.rollback_keep_nullable` if registrations lack slot/device. Rehearsed |
| 4 | `…000500…down.sql` | Deletes events with the override (export first). Rehearsed |
| 5 | `…000400…down.sql` | Deletes cohort profiles with the override (export first). Rehearsed |
| 6 | `…000700…down.sql` | **Changes every student's ID** (AIW format); re-applying issues new APW IDs, originals lost. Export the mapping first. Must run before 0300's. Rehearsed |
| 7 | `…000300…down.sql` | Removes all student IDs. Rehearsed |
| 8 | `…000100…down.sql` | Deletes enquiries with the override (export first). Rehearsed |

Last resort: the encrypted pre-redesign backup (RESTORE.txt) — only into a new project or by separate decision; it
would discard everything written after the backup.

## Programme calendar (real events) and the demo flag

Placeholder calendar events were **removed** (23 Nov 2026). The calendar, dashboard Upcoming, calendar
dropdown and Live sessions now show only the published Product Management Programme learning calendar
(`src/config/programSchedule.ts`, tested in `tests/programSchedule.test.ts`): orientation 13 Nov 2026, and for
Modules 1–11 the first class, last class and assignment due date (all-day entries), plus any rows in
`public.cohort_events`. The Assignments page shows the real Module 1 due date (Tue 15 Dec 2026) in every
environment. To change a date, edit `programSchedule.ts` and redeploy.

`VITE_SHOW_DEMO_EVENTS` (in `src/data/demoEvents.ts`) now controls **only the sample AI news headlines**:
on in the local dev server, off in builds unless set to exactly `true`. Production must never set it.

## Routine operations (program team, SQL Editor)

- **Release a module** (e.g. Module 1 = `module_id` 2): `update public.curriculum_module_releases set released = true, updated_at = now() where module_id = 2;`
  **and** add `2` to `RELEASED_MODULE_IDS` in `src/lib/moduleStatus.ts`, then deploy. Both are required.
  (Before 0600 the table is `curriculum_level_releases` with column `level_id`.)
- **Read enquiries:** `select * from public.enquiries order by created_at desc;`
  mark handled: `update public.enquiries set status = 'closed' where id = …;`
- **Publish / edit events:** insert or update `public.cohort_events` (see section 3).

## Not included in this release

- **Payment gateway, invoices and email delivery** (see `supabase/PAYMENT_RECEIPTS.md`). Payment remains simulated and stored in user metadata (which a
  student can edit); the current batch is free. A real flow needs a gateway, issuer/GST details, an email provider
  and a server-written payments table.
- **Admin screens** for events, enquiries and releases (SQL Editor for now).
- **Reopening Online** (needs a new migration reversing 0800's restrictions and a frontend change).
- The `framer-motion` dependency is no longer imported and can be removed from `package.json` in a later change.
