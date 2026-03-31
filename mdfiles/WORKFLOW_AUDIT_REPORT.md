# MarketFlow — Workflow Audit Report

**Audit Date:** February 2025  
**Status:** Not-Working Flows Identified

---

## Not-Working Flows

### 1. **Client: Tasks Not in Sidebar**
- **Flow:** Client navigating to Tasks page
- **Issue:** "Tasks" is not listed in the client sidebar (`clientNavItems`). Clients can only reach `/tasks` via direct URL.
- **Impact:** Most clients won't discover or access the Tasks page.
- **Location:** `src/components/layout/DashboardSidebar.tsx` (lines 48-55)

---

### 2. **Client: Results Page Crash on Undefined Values**
- **Flow:** Viewing campaign results when a report has missing `adSpend` or `costPerLead`
- **Issue:** `report.adSpend.toLocaleString()` and `report.costPerLead.toFixed(2)` can throw `TypeError` when values are `undefined`/`null`.
- **Impact:** Results page crashes for reports with incomplete data.
- **Location:** `src/pages/Results.tsx` (lines 934-935)

---

### 3. **Auth: Login Bypasses Onboarding Check**
- **Flow:** User registers → skips/closes onboarding → later logs in
- **Issue:** Login always redirects to Dashboard. No check for `onboardingCompleted`. Users who never finished onboarding land on Dashboard instead of Onboarding.
- **Impact:** Incomplete onboarding users see Dashboard with limited/empty data; may be confused.
- **Location:** `src/pages/Login.tsx` (lines 59-60)

---

### 4. **Admin: Reports Not Real-Time**
- **Flow:** Admin viewing Reports list; new reports added by clients
- **Issue:** Uses `getDocs()` once on mount instead of `onSnapshot()`. New reports don’t appear until page refresh.
- **Impact:** Admin may miss newly added reports.
- **Location:** `src/pages/AdminReports.tsx` (data fetch logic)

---

### 5. **Navigation: Messages Page Unreachable**
- **Flow:** Accessing the Messages page
- **Issue:** `Messages.tsx` exists but has no route in `App.tsx`. Previously removed from client nav per user request.
- **Impact:** Messages page is unreachable; any links to it will 404.

---

### 6. **Firestore: Composite Indexes Required**
- **Flow:** Activities, Tasks, Invoices queries
- **Issue:** Composite queries (e.g. `where('clientId','==',uid)` + `orderBy('ts','desc')`) need Firestore composite indexes. No `firestore.indexes.json` present.
- **Impact:** Queries may fail in production with “index required” errors.
- **Affected:** `activities`, `tasks`, `invoices` collections

---

## Working Flows (Summary)

| Flow | Status |
|------|--------|
| Login → Dashboard/Admin | Working |
| Register → Onboarding → Dashboard | Working |
| Admin Setup (first-time) | Working |
| Client: Dashboard, Plan, Results, Invoices, Activity, Calendar, Profile, Notifications | Working |
| Admin: Clients, Analytics, Reports, Onboarding, Activity, Health, Tasks, Plan Editor, Billing, Plan Manager, Manage Admins, Automation | Working |
| Navigation (R.* routes, adminClientPath) | Working |
| ProtectedRoute / AdminRoute guards | Working |

---

## Recommended Fixes (Priority Order)

1. **High:** Add optional chaining to `report.adSpend` and `report.costPerLead` in Results.tsx (lines 934-935).
2. **High:** Add Tasks to client sidebar for discoverability.
3. **Medium:** Add onboarding check in Login; redirect to Onboarding when `onboardingCompleted` is false.
4. **Medium:** Switch Admin Reports to `onSnapshot` for real-time updates.
5. **Low:** Add Firestore composite indexes (or `firestore.indexes.json`) for activities, tasks, invoices.
6. **Info:** Messages page has no route; add one if you want it back.
