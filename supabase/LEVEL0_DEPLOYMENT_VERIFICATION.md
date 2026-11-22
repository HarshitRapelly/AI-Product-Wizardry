# Level 0 — deployment verification (Storage files)

The SQL tests (`supabase/tests/curriculum_checks.sql`) check the **storage policies** only:
who can see, add, rename or delete objects in the `course-documents` bucket. They use a
placeholder `storage.objects` row with no file bytes, so they do **not** prove that the real
documents were uploaded or that their contents are correct. That is verified separately,
after deployment, with the steps below.

Do these steps only after the production rollout of Migrations 9 and 10 has been approved.
(Migration 11 — the server-side reading prerequisite — is covered at the end of this document.)

## 1. Files to upload (unchanged originals)

| Storage path (bucket `course-documents`) | Original file | Bytes | SHA-256 |
|---|---|---|---|
| `level-0/module-0-welcome-to-the-program.docx` | `Product Wizardry (Offline)_Module 0_Welcome to the Program.docx` | 18,733 | `29f2bd4132d1c56b73482059cd8533e0582add9aa24f1d6a1b9da2d305ddd63b` |
| `level-0/module-0-ground-rules-and-setup.docx` | `Product Wizardry_Module 0_Ground Rules & Setup.docx` | 20,866 | `b739d207425c5319e60e27d866a9a6187e8f7236f8b56b4f517ca817a4e618e4` |

Before uploading, confirm the local files still match (Windows: `certutil -hashfile "<file>" SHA256`;
macOS/Linux/Git Bash: `sha256sum "<file>"`). If a hash differs, stop: the document changed and
Migration 10 must be regenerated and re-reviewed first.

## 2. Upload

Supabase dashboard → Storage → `course-documents` → create folder `level-0` → upload each file,
then rename it to the exact storage path above. Do not open, edit or re-save the files in Word.
(The bucket allows only DOCX up to 10 MB; students have no upload policy.)

## 3. Verify contents (required)

```bash
SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
node scripts/verify-level0-storage.mjs
```

The script is read-only. It checks:

- the database has six Level 0 subtopics that reference exactly these two paths and hashes;
- the bucket is private;
- each file downloads, has the expected size, SHA-256, zip/DOCX signature and DOCX content type.

Expected last line: `STORAGE VERIFICATION PASSED`. Use the key from your environment only. Do not
paste it into files or commit it.

## 4. Access spot-check (manual)

1. As a registered student, request a signed URL for one file. It should download.
2. As a signed-in user without a registration record, the same request should fail (no object visible).
3. Signed out, the request should fail.
4. Dashboard → Storage → bucket settings: **Public** is off.

## 5. Record the result

Note the date, who ran it, and the script output (it contains no secrets) in the deployment log.

---

# Migration 11 — reading prerequisite for the Plagiarism quiz

File: `supabase/migrations/20261118120011_quiz_reading_prerequisite.sql`
(rollback: `supabase/rollback/20261118120011_quiz_reading_prerequisite.down.sql`)

Requires Migrations 1–10 (applied to production and verified). On a database without
Migration 9 it is refused as a whole and changes nothing. It changes no table, column or row.

## What it enforces (server side)

1. **Reading confirmation** — `lesson_progress` row `l0-plagiarism-reading` (written by the
   app's "Plagiarism" reading module): only after Level 0 subtopics 1–4; one-way.
2. **Quiz submission** — `submit_quiz_attempt('l0-plagiarism-quiz', …)` additionally needs that
   confirmation. Students who already have an attempt (or acknowledged the subtopic) may submit
   again, so retakes and students from before Migration 11 are never locked out.
3. **Final acknowledgment** — `l0-plagiarism` still needs an attempt first (Migration 9, unchanged).

Dependencies only point backwards (3 → 2 → 1 → subtopics 1–4); there is no cycle. Idempotent
retries, attempt numbering, scoring and answer-key privacy are unchanged.

## Order of deployment

1. Deploy the new frontend first and smoke-test it. It works on Migrations 1–10 unchanged
   (service contract tests run against both 1–10 and 1–11).
2. Then, promptly, apply Migration 11. Until it is applied, the reading prerequisite is enforced
   by the app only (direct API calls could skip it, exactly as before).
3. Never re-run Migration 9 after Migration 11 without re-running Migration 11 afterwards: re-running
   Migration 9 restores the Migration 9 version of `submit_quiz_attempt` (no reading gate).

## Verify (read-only, safe on production)

Run `supabase/tests/migration11_readonly_verification.sql` **before** and **after** applying:

- before: `m11_*` columns `false`; every other `*_ok` column `true`; note the `snapshot_*` values.
- after: every `*_ok` column `true`; `snapshot_*` values identical (in a quiet window).

`supabase/tests/quiz_reading_prerequisite_checks.sql` (and the other `supabase/tests/*_checks.sql`)
create throw-away users and roll back; run them on a staging / branch database, not on production.

## Rollback

Run `supabase/rollback/20261118120011_quiz_reading_prerequisite.down.sql` (single transaction).
It restores the Migration 9 `submit_quiz_attempt` verbatim first, then drops the trigger and the
two helper functions. No data is changed; reading-confirmation rows stay and are inert. The current
frontend keeps working after a rollback. Do not roll back Migrations 9 or 10 (they hold student data).

---

# Migrations 12 and 13 — College ID Number; only Level 0 open

The curriculum has exactly 12 levels, Level 0 – Level 11 (`level_id` 1–12). Only Level 0 is
released; Levels 1–11 stay locked, also after Level 0 is complete.

| File | What it does | Rollback |
|---|---|---|
| `supabase/migrations/20261118120012_college_id_number.sql` | `student_registrations.college_id_number` (text, nullable, 1–40 chars, letters/digits and `space . / _ -`, not unique); registration functions store it | `supabase/rollback/20261118120012_college_id_number.down.sql` (keeps the column and its data) |
| `supabase/migrations/20261118120013_level_release_lock.sql` | `curriculum_level_releases` (only Level 0 released); `my_level_progress()` requires a release; write guards on `lesson_progress` / `quiz_attempts`; restrictive read policies on `course_subtopics` / `quiz_questions` | `supabase/rollback/20261118120013_level_release_lock.down.sql` |

Both are re-runnable, change no existing student row and fabricate nothing (existing
registrations keep `college_id_number = NULL`; nobody is marked complete).

## Order (manual, SQL Editor)

1. **Migration 12 first, before the new frontend.** It is backward compatible with the old
   frontend (the field is optional in the database). Applying it first means the College ID
   typed by students who register after the frontend deploy is stored, not silently dropped.
2. Deploy the new frontend and smoke-test it.
3. **Migration 11** (reading prerequisite — see above).
4. **Migration 13.** The frontend already keeps Levels 1–11 locked on its own
   (`src/lib/moduleStatus.ts`, formerly `levelStatus.ts`), so Migration 13 can follow at any time; it adds the server-side
   enforcement (API writes, quiz submissions, content reads).

## Verify (read-only, safe on production)

Run `supabase/tests/migrations_12_13_readonly_verification.sql` before and after:
before → `m12_*` / `m13_*` false; after → every `*_ok` true, `snapshot_*` unchanged.
On staging run `college_id_checks.sql` and `level_release_checks.sql` (they write inside a
transaction and roll back — not on production).

## Releasing Level 1 later (administrator)

```sql
update public.curriculum_level_releases set released = true, updated_at = now() where level_id = 2; -- Level 1
```
and add `2` to `RELEASED_MODULE_IDS` in `src/lib/moduleStatus.ts` (after migration 20261121000600 the table is `curriculum_module_releases` / column `module_id`; see `supabase/REDESIGN_RELEASE.md`) (then deploy). Both are needed:
the database enforces, the app displays.

---

# 20261120000100 — quiz release gate (after Migration 13)

File: `supabase/migrations/20261120000100_enforce_quiz_level_release.sql`
(rollback: `supabase/rollback/20261120000100_enforce_quiz_level_release.down.sql`)

Re-creates `public.submit_quiz_attempt` (Migration 11 logic) with one addition: a quiz of an
unreleased level is refused **up front** (`level_locked: this level has not been released`),
before scoring, answer-key validation and the idempotency lookup. Migration 13's
`quiz_attempts_level_release_guard` trigger stays as a second line of defence. No data change;
existing grants are kept (`authenticated` only).

- **Order:** apply after Migration 13 (it calls `private.level_released`).
- **Behaviour change:** retrying an existing submission id for an *unreleased* level is now
  refused (Migration 13 alone returned the stored attempt). The stored attempt is unchanged and
  stays readable. Level 0 (released) retries are unaffected.
- **Verify (read-only):** `migrations_12_13_readonly_verification.sql` → `m13_submit_release_gate_ok`
  true; `migration11_readonly_verification.sql` → `m11_submit_gate_ok` true (reading gate kept).
- **Rollback order:** `20261120000100` rollback **first**, then Migration 13, then 11 / 12. The
  Migration 13 rollback refuses to run while `submit_quiz_attempt` still calls `private.level_released`.
