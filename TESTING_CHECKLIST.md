# MarketFlow — Testing Checklist

Use this checklist to verify critical flows before going live.

---

## 1. Authentication

- [ ] **Register** — New user can create account
- [ ] **Login (client)** — Client logs in → Dashboard (if onboarding complete)
- [ ] **Login (incomplete onboarding)** — Client who didn't finish onboarding → redirected to Onboarding
- [ ] **Login (admin)** — Admin logs in → Admin Dashboard
- [ ] **Admin Setup** — First-time setup creates admin (only when no admins exist)

---

## 2. Client Flows

- [ ] **Dashboard** — Stats, goals, weekly plan progress, activity feed load
- [ ] **Marketing Plan** — Plan content displays correctly
- [ ] **Results** — Reports list, charts, comparison tab, goals tab work (no crash on missing adSpend/costPerLead)
- [ ] **Tasks** — Tasks visible in sidebar, list loads, status updates, comments work
- [ ] **Invoices** — Invoice list, filters, print
- [ ] **Activity Timeline** — Activities load, filters work
- [ ] **Calendar** — Tasks, reports, invoices show on calendar
- [ ] **Profile** — Goals and notification preferences save

---

## 3. Admin Flows

- [ ] **Clients** — Client list, search, filters, bulk actions, tags
- [ ] **Client Detail** — View client, add report, change status
- [ ] **Analytics** — KPIs, revenue trend, client growth, forecasting
- [ ] **Reports** — All reports load
- [ ] **Onboarding** — Clients in onboarding visible
- [ ] **Activity** — System activity feed
- [ ] **Client Health** — Health scores and at-risk clients
- [ ] **Tasks** — Generate from plan, view tasks
- [ ] **Marketing Plans** — Edit plan, weekly plan, auto-generate tasks
- [ ] **Billing** — Create invoice, mark paid
- [ ] **Plan Manager** — Create/manage plans
- [ ] **Manage Admins** — Add/remove admins
- [ ] **Automation** — Manual triggers run without error

---

## 4. Navigation

- [ ] All sidebar links work (client + admin)
- [ ] Topbar dropdown (Profile, Notifications, Logout)
- [ ] Back links and breadcrumbs
- [ ] No 404 on known routes

---

## 5. Edge Cases

- [ ] **Results with incomplete reports** — No crash when adSpend or costPerLead is missing
- [ ] **Empty states** — No reports, no tasks, no invoices show appropriate messages
- [ ] **Firestore errors** — Index missing errors: run `firebase deploy --only firestore:indexes` if needed

---

## Quick Commands

```bash
# Install dependencies (including SendGrid)
npm install

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Run dev server
npm run dev
```

---

## Pre-Launch Checklist

1. Set `VITE_EMAIL_PROVIDER=sendgrid` and `VITE_SENDGRID_API_KEY` in production
2. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
3. Set `VITE_APP_URL` to your production URL
4. Run through all items above
