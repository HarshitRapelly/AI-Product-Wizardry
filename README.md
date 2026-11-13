# AI Product Wizardry — Professional Academy (Prototype 01)

> **Executive Concept Prototype 01:** Clean, minimal, premium, professional, and corporate design language for executive EdTech product education.

AI Product Wizardry is an executive education platform engineered specifically for Product Managers, Senior Architects, and Technology Leaders transitioning from deterministic code to probabilistic, AI-native software systems.

---

## 1. Technical Stack & Architecture

- **Core Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5
- **Styling & Design System:** Tailwind CSS with custom executive slate/cobalt tokens
- **Routing:** React Router v6 (SPA with full route guards for Auth, Payment, and Cohort Modality)
- **Icons:** Lucide React
- **Celebration Effects:** Canvas Confetti (celebratory payment & quiz completion)
- **Document Generation:** jsPDF (official 2-page curriculum brochure specification)
- **State Persistence:** LocalStorage API with simulated session management
- **Deployment Target:** Vercel (includes `vercel.json` SPA rewrite rules)

---

## 2. Design System & Palette

Designed around a corporate, minimal, high-trust executive palette:

| Token | Hex Value | Application |
|---|---|---|
| **PRIMARY COLOR** | `#0F172A` (Deep Slate / Navy) | Primary branding, headers, executive cards, active badges |
| **SECONDARY COLOR** | `#334155` (Slate 700) | Secondary text, subtitled descriptions, labels |
| **ACCENT COLOR** | `#2563EB` (Cobalt Royal) | Primary call-to-actions, progress rings, links, highlights |
| **BACKGROUND COLOR** | `#F8FAFC` (Canvas Slate 50) | Base page background canvas |
| **SURFACE COLOR** | `#FFFFFF` (Pure White) | Elevated cards, forms, modals |
| **TEXT COLOR** | `#0F172A` (Slate 900) | High-contrast readable typography |
| **MUTED TEXT COLOR** | `#64748B` (Slate 500) | Timestamps, metadata, secondary instructions |
| **BORDER COLOR** | `#E2E8F0` (Slate 200) | Restrained dividing borders |
| **TYPOGRAPHY** | `Inter`, `system-ui`, sans-serif | Balanced scale, generous whitespace, accessible contrast |

---

## 3. Complete Information Architecture & Routes

### Public Pages
- `/` — Homepage: Executive hero, program overview, interactive telemetry visual, 12-level curriculum highlights, learning journey, brochure download banner, FAQs, and corporate footer.
- `/login` — Student authentication with demo pre-fill, form validation, show/hide password toggle, simulated Google SSO, and forgot-password modal.
- `/register` — Account creation with full name, email, password validation, and simulated Google SSO.
- `/checkout` — Executive checkout ($999 USD tuition), order summary, student identity verification, payment method selector (Card, Corporate PO, Digital Wallet), and trust seals.
- `/payment-success` — Official transaction confirmation, generated mock reference ID, celebratory confetti, and onward navigation to modality selection.
- `/choose-learning-mode` — High-impact decision card interface between **Online Learning** and **Offline Learning**.

### Online Learning Portal (`/online/*`)
- `/online/dashboard` — Live dashboard featuring personalized greeting, digital attendance tracker (attendance %, classes attended, interactive "Mark Today's Attendance" demo), Level 01 hub, upcoming Zoom masterclasses, and cohort leaderboard preview.
- `/online/levels` — 12-level curriculum roadmap (Level 01 unlocked; Levels 02–12 locked with prerequisite guidance).
- `/online/level/1` — Level 01 hub with direct links to Reading Material, Recorded Sessions, and Practice Quiz.
- `/online/level/1/reading` — Interactive 4-part reading handbook with executive PRD pro-tips, key takeaways, and an interactive "Mark as Completed" button.
- `/online/level/1/recordings` — Video masterclass lectures from Anthropic Research & DeepScale AI fellows, with interactive modal video player.
- `/online/level/1/quiz` — 5 scenario-based MCQs with instant scoring, architectural explanations, pass/fail thresholds, and retake functionality.
- `/online/classes` — Schedule of upcoming live online Zoom masterclasses with interactive seat reservation toggle.
- `/online/leaderboard` — Real-time cohort standings table and podium highlighting the current logged-in fellow.
- `/online/profile` — Student profile, enrollment status, quiz metrics, and prototype demo mode switcher.

### Offline Learning Portal (`/offline/*`)
- `/offline/dashboard` — Campus-based dashboard. **Strictly adheres to requirement: NO attendance tracker, NO attendance percentage, NO Mark Attendance button, and NO recorded sessions.** Displays physical campus lecture coordinates, Level 01 hub, in-person seminars, and campus leaderboard.
- `/offline/levels` — 12-level roadmap with in-person seminar syllabus.
- `/offline/level/1` — Campus Level 01 hub featuring **Reading Material and Practice Quiz ONLY** (no recorded sessions).
- `/offline/level/1/reading` — Pre-reading curriculum handbook for in-person workshops.
- `/offline/level/1/quiz` — In-classroom scenario evaluation quiz with instant grading and review.
- `/offline/classes` — Physical campus schedule with room coordinates (Lecture Hall 4B, Lab 204) and interactive seat reservation.
- `/offline/leaderboard` — Physical cohort leaderboard.
- `/offline/profile` — Campus profile and prototype switcher.

---

## 4. Key Behavioral & Architectural Safeguards

1. **Frontend Route Guards:**
   - Unauthenticated visitors accessing `/checkout` or any `/online/*` / `/offline/*` routes are redirected to `/login`.
   - Unpaid users accessing portals or mode selectors are redirected to `/checkout`.
   - Modality Guard: An online student accessing an offline route (or vice versa) is presented with cohort guidance and redirected to their active dashboard.
2. **Persistent LocalStorage State:**
   - Mock credentials, payment status, transaction ID, chosen modality, class registrations, quiz attempts/scores, reading completion, and attendance records persist across page reloads.
3. **Official PDF Brochure:**
   - Generated at `/public/assets/ai-product-wizardry-brochure.pdf` and verified in `dist/assets/ai-product-wizardry-brochure.pdf`. Clicking any "Download Brochure" button triggers a direct download of this real document.
4. **Cohort Switching & Prototype Reset:**
   - Reviewers can seamlessly switch between Online and Offline modes via the "Switch Cohort" button in the navigation header or profile screen.
   - A "Reset Prototype Data" button is available in the profile and header to wipe localStorage and restart testing fresh.

---

## 5. Local Setup & Execution Instructions

### Prerequisites
- Node.js version 18+ (tested on Node v22.15.0)
- npm version 9+

### Steps
```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev
```
Navigate to `http://localhost:3000` in your web browser.

### Building for Production
```bash
npm run build
```
This generates the optimized production bundle in `/dist` with zero TypeScript errors.

---

## 6. Vercel Deployment Instructions

1. Push this repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com), click **Add New** > **Project** and import the repository.
3. Keep default settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. The included `vercel.json` ensures all client-side SPA routes (e.g. `/online/dashboard`, `/offline/level/1/quiz`) resolve directly to `/index.html` without 404 errors.
5. Click **Deploy**. Your EdTech prototype will be live globally.
