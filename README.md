# AI Product Wizardry — Learning Portal

AI Product Wizardry is a six-month, 12-module program (Module 0 – Module 11) that adds product
thinking to the technical skills of undergraduate students. This repository contains the public
website and the student learning portal.

---

## 1. Technical stack

- **Frontend:** React 18 + TypeScript, Vite 5, React Router v6, Tailwind CSS 3
- **Design system:** `src/styles/wizardry.css` (ported from the approved reference design, scoped
  under `.aiw`), fonts Source Serif 4 + Inter, icons in `src/components/aiw/Icon.tsx`
- **Backend:** Supabase (Auth, Postgres with Row Level Security, Storage)
- **Deployment:** Vercel (`vercel.json` rewrites every route to the SPA)

Database changes live in `supabase/migrations/` (never edited once applied), their rollbacks in
`supabase/rollback/`, and read-only verification / behaviour tests in `supabase/tests/`.
Release procedure: `supabase/REDESIGN_RELEASE.md`.

---

## 2. Routes

### Public
- `/` — Home page (hero, three questions, six-month journey, why choose the program, certificate, contact and CTA bands)
- `/explore` — Program details: curriculum, certificate rules, fee, FAQs, brochure, admissions contact
- `/contact` — Contact form, stored in Supabase (`public.submit_enquiry` → `public.enquiries`)
- `/login`, `/register`, `/auth/callback`, `/reset-password`

### Portal (`/online/*` for existing online students, `/offline/*` for everyone else)
- `dashboard` — Journey bar, welcome, Spell of the Day, continue learning (Module 0), upcoming events, cohort card
- `modules`, `module/0` (lessons + quizzes), `module/0/quiz/:quizId`, `module/1` (locked until released)
- `calendar` — Published cohort events (`public.cohort_events`)
- `assignments`, `grades`
- `cohort` — Cohort profile editor and opt-in directory (`public.cohort_profiles`, `public.list_cohort_profiles()`)
- `profile` — Account, AI Wizardry Student ID (`public.my_student_code()`), progress, registration details

Old links keep working: `/:mode/level/...` → `/:mode/module/...`, `/:mode/levels` → `/:mode/modules`,
`/:mode/classes` → `/:mode/calendar`, `/:mode/leaderboard` → `/:mode/dashboard`.

---

## 3. Key rules

1. **Module release lock.** A module opens only when it is released in `public.curriculum_module_releases`
   (database, enforced by triggers, restrictive RLS policies and `submit_quiz_attempt`) **and** listed in
   `RELEASED_MODULE_IDS` (`src/lib/moduleStatus.ts`). Only Module 0 is released.
2. **Offline-only registration.** New registrations are offline (enforced by `private.normalize_registration`);
   online mode shows "Unlocking soon". Existing students keep their mode; students cannot change their mode
   (trigger `private.profiles_learning_mode_guard`).
3. **No invented data.** Grades, assignments, events and cohort members come only from the database; empty
   states are shown when nothing exists.
4. **Cohort privacy.** Cohort profiles are opt-in (hidden by default). The directory returns only the name,
   headline, bio, product idea and LinkedIn link of students who chose to share.
5. **Payment is simulated.** The enrollment record is stored in the student's Supabase user metadata; there is
   no payment gateway, invoice or email service yet.

---

## 4. Local setup

```bash
npm install
npm run dev      # http://localhost:3000 (needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local)
npm run build    # type-checks (tsc -b) and builds to /dist
```

`npm run build` rewrites the committed `tsconfig.tsbuildinfo` cache; restore it with
`git checkout -- tsconfig.tsbuildinfo` if you did not mean to change it.

---

## 5. Deployment (Vercel)

Framework preset Vite, build command `npm run build`, output directory `dist`. Set the two `VITE_SUPABASE_*`
environment variables per environment. Follow `supabase/REDESIGN_RELEASE.md` for the database steps and the
required deployment order.
