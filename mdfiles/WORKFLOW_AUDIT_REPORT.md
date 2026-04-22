# MarketFlow — Workflow Audit Report

**Last updated:** April 2025 (workflow pass)

---

## Implemented workflow fixes

| Item | Change |
|------|--------|
| **Client onboarding gate** | `RequireClientOnboarding` wraps client routes except `/onboarding` and `/profile` (profile stays reachable during onboarding). Incomplete users hitting `/dashboard`, `/plan`, etc. are redirected to `/onboarding`. Admins skip the gate (same email check as Login). |
| **Login → onboarding** | Already present: clients without `onboardingCompleted` go to `/onboarding`. |
| **Messages reachable** | Route `R.MESSAGES` (`/messages`), lazy-loaded in `App.tsx`, **Messages** item in client sidebar. |
| **Firestore: messages & tickets** | Rules for `messages` and `supportTickets`; composite indexes in `firestore.indexes.json`; `firebase.json` references indexes for deploy. |
| **Admin Reports real-time** | `AdminReports` uses `onSnapshot(collectionGroup('reports'))` instead of one-shot `getDocs`. |
| **Client lifecycle model** | `src/lib/client-lifecycle.ts` — single mapping from `onboardingCompleted` + `projectStatus` to phase; used by AdminDashboard, AdminClientDetail, AdminAnalytics. |
| **Notification badge** | Client topbar counts only **highlight** activity types (reports, tasks, invoices, plans, status, onboarding completed) in the last 7 days — not the full feed including noisy types. |
| **Search placeholder** | Admin vs client contextual placeholder on the topbar search field. |

---

## Client sidebar

- **Tasks** and **Messages** are listed for discoverability.

---

## Deploy notes

After pulling these changes, deploy rules and indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

(or your project’s equivalent).

---

## Optional follow-ups

- Wire topbar search to real client-side filtering or navigation.
- Admin UI to read/reply in `messages` (rules already allow admin create/read).
- Bulk status update in AdminDashboard still writes `projectStatus` only; align with `LIFECYCLE_PHASE_TO_CLIENT_DOC` if you need `onboardingCompleted` toggles from bulk actions.
