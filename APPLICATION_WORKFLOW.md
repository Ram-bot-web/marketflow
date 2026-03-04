# MarketFlow Dashboard — Application Workflow

**Document Version:** 1.0  
**Last Updated:** February 2025

---

## 1. Authentication & Entry Points

### Public Routes (Unauthenticated)

| Route | Purpose |
|-------|---------|
| `/` | Landing page — features, benefits, CTA to Login/Register |
| `/login` | User login |
| `/register` | New client registration |
| `/admin-setup` | **First-time only** — creates the first admin account when no admins exist |

### Post-Login Routing

- **Client users** → redirected to `/dashboard`
- **Admin users** (email in `admins` collection) → redirected to `/admin`
- **Unauthenticated** → redirected to `/login` when accessing protected routes

### Route Protection

- **ProtectedRoute** — requires authenticated user; redirects to `/login` if not logged in
- **AdminRoute** — requires authenticated user **and** email in `admins` collection; redirects to `/login` if unauthorized

---

## 2. Client Workflow

### 2.1 Registration & Onboarding

1. **Register** (`/register`) — client signs up with email, password, business name
2. **Onboarding** (`/onboarding`) — if `onboardingCompleted` is false:
   - Client selects industry, budget tier, and other preferences
   - On completion, `clients/{uid}` is updated; client record created

### 2.2 Client Dashboard Layout

- **Sidebar:** Dashboard, Marketing Plan, Results, Invoices, Activity, Calendar
- **Topbar:** Search, theme toggle, notifications bell, user dropdown (Profile & Settings, Notifications, Log out)

### 2.3 Client Pages & Workflow

| Page | Route | Purpose |
|------|-------|---------|
| **Dashboard** | `/dashboard` | Overview: performance summary, monthly goals, quick actions, weekly plan progress, activity feed |
| **Marketing Plan** | `/plan` | View marketing strategy and roadmap; read-only for client |
| **Results** | `/results` | Campaign reports: leads, ad spend, CPL; comparison view; goals vs actual; ROI/funnel; export CSV |
| **Invoices** | `/invoices` | View invoices, filter by status, sort, print, PDF placeholder |
| **Activity** | `/activity-timeline` | Timeline of activities; search, filter by type/date; export CSV |
| **Calendar** | `/calendar` | Monthly view of tasks, reports, invoices |
| **Profile & Settings** | `/profile` | Via topbar dropdown — update profile, set monthly goals, manage email notification preferences |
| **Notifications** | `/notifications` | Via topbar bell — activity feed, mark as read |
| **Tasks** | `/tasks` | View assigned tasks, change status (todo → in progress → done), add comments |

### 2.4 Client Data Flow

- **Firestore:** `clients`, `marketingPlans`, `weeklyPlans`, `reports`, `invoices`, `tasks`, `activities`
- **Real-time:** `onSnapshot` used for dashboards, reports, tasks, invoices
- **Goals:** Stored in `clients/{uid}` (`monthlyGoalLeads`, `monthlyGoalSpend`)

---

## 3. Admin Workflow

### 3.1 Admin Setup (First Time)

1. Navigate to `/admin-setup` (only works when `admins` collection is empty)
2. Create first admin account (name, email, password)
3. Admin is added to `admins` and redirected to `/admin`

### 3.2 Admin Dashboard Layout

- **Sidebar sections:**
  - **Overview:** Clients, Analytics
  - **Campaigns:** Reports, Onboarding, Activity, Client Health
  - **Tools:** Tasks, Marketing Plans
  - **Business:** Billing, Plan Manager
  - **Settings:** Manage Admins, Automation

### 3.3 Admin Pages & Workflow

| Page | Route | Purpose |
|------|-------|---------|
| **Clients** | `/admin` | Client list; search; filter by status, budget, industry; bulk actions; tags; health scores |
| **Client Detail** | `/admin/client/:id` | Single client: status, budget, reports, tasks; add reports; change status |
| **Analytics** | `/admin/analytics` | KPIs; revenue trend; client growth; date range; revenue forecasting; client segmentation |
| **Reports** | `/admin/reports` | All reports; total ad spend; avg CPL; add/edit reports |
| **Onboarding** | `/admin/onboarding` | View clients in onboarding; track completion |
| **Activity** | `/admin/activity` | System-wide activity feed |
| **Client Health** | `/admin/health` | Client health scores; at-risk alerts; risk distribution |
| **Tasks** | `/admin/tasks` | Manage tasks across clients; generate from weekly plans |
| **Task Templates** | `/admin/task-templates` | Create and manage reusable task templates |
| **Marketing Plans** | `/admin/plan-editor` | Select client; edit marketing plan and weekly plan; auto-generate tasks |
| **Plan Templates** | `/admin/plan-templates` | Create and manage marketing plan templates |
| **Report Templates** | `/admin/report-templates` | Create report templates with custom fields |
| **Billing** | `/admin/billing` | Create invoices; mark paid; revenue summary (Collected, Pending, Overdue) |
| **Plan Manager** | `/admin/plan-manager` | Create and manage subscription plans (price, features) |
| **Manage Admins** | `/admin/manage-admins` | Add/remove admin users |
| **Automation** | `/admin/automation` | Manually trigger automations (invoices, payment reminders) |

### 3.4 Admin Data Flow

- **Firestore:** `admins`, `clients`, `reports`, `tasks`, `marketingPlans`, `weeklyPlans`, `invoices`, `activities`, `plans` (Plan Manager)
- **Admin checks:** `admins` collection queried by email for access control

---

## 4. Shared Behaviors

### Navigation

- **Client:** Sidebar + topbar user menu (Profile, Notifications)
- **Admin:** Sectioned sidebar; admin menu (Admin Dashboard, Manage Admins)

### Theme

- Light/dark/system via theme toggle in sidebar and topbar

### Session & Security

- Session monitoring and auth state tracking
- Client-side rate limiting (login, registration)
- Input validation and sanitization on forms

### Currency

- All monetary values displayed in **₹** (Indian Rupee)

---

## 5. Workflow Summary Diagrams

### Client Journey

```
Register → Login → [Onboarding if new] → Dashboard
    ↓
Dashboard (goals, quick actions, weekly plan)
    ↓
├── Marketing Plan (view strategy)
├── Results (reports, comparison, goals, ROI)
├── Invoices (view, print)
├── Activity (timeline)
├── Calendar (tasks, reports, invoices)
├── Tasks (view/complete, comments)
└── Profile (goals, email preferences)
```

### Admin Journey

```
Admin Setup (first time) OR Login (existing admin) → /admin
    ↓
Clients (overview, filters, bulk actions)
    ↓
├── Client Detail (manage single client)
├── Analytics (revenue, forecasting, segmentation)
├── Reports (all reports)
├── Onboarding (track new clients)
├── Activity (system feed)
├── Client Health (risk monitoring)
├── Tasks (manage, generate from plans)
├── Marketing Plans (edit per client)
├── Billing (invoices)
├── Plan Manager (subscription plans)
├── Manage Admins
└── Automation (manual triggers)
```

---

## 6. Route Reference

### Client Routes

| Route | Component |
|-------|-----------|
| `/dashboard` | Dashboard |
| `/onboarding` | Onboarding |
| `/plan` | Plan |
| `/results` | Results |
| `/profile` | Profile |
| `/notifications` | Notifications |
| `/tasks` | ClientTasks |
| `/invoices` | Invoices |
| `/activity-timeline` | ActivityTimeline |
| `/calendar` | Calendar |

### Admin Routes

| Route | Component |
|-------|-----------|
| `/admin` | AdminDashboard |
| `/admin/client/:id` | AdminClientDetail |
| `/admin/analytics` | AdminAnalytics |
| `/admin/reports` | AdminReports |
| `/admin/onboarding` | AdminOnboarding |
| `/admin/activity` | AdminActivity |
| `/admin/health` | AdminHealthDashboard |
| `/admin/tasks` | AdminTasks |
| `/admin/task-templates` | AdminTaskTemplates |
| `/admin/plan-editor` | AdminPlanEditor |
| `/admin/plan-editor/:clientId` | AdminPlanEditor |
| `/admin/plan-templates` | AdminPlanTemplates |
| `/admin/report-templates` | AdminReportTemplates |
| `/admin/billing` | AdminBilling |
| `/admin/plan-manager` | AdminPlanManager |
| `/admin/manage-admins` | AdminManage |
| `/admin/automation` | AdminAutomation |
