/**
 * Centralized route paths.
 * Use R.* and helper functions for consistent navigation across the app.
 */

export const R = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ADMIN_SETUP: '/admin-setup',

  // Client
  DASHBOARD: '/dashboard',
  ONBOARDING: '/onboarding',
  PLAN: '/plan',
  RESULTS: '/results',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  TASKS: '/tasks',
  MESSAGES: '/messages',
  INVOICES: '/invoices',
  ACTIVITY_TIMELINE: '/activity-timeline',
  CALENDAR: '/calendar',

  // Admin
  ADMIN: '/admin',
  ADMIN_CLIENT: '/admin/client',
  ADMIN_MANAGE_ADMINS: '/admin/manage-admins',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_ONBOARDING: '/admin/onboarding',
  ADMIN_ACTIVITY: '/admin/activity',
  ADMIN_HEALTH: '/admin/health',
  ADMIN_TASKS: '/admin/tasks',
  ADMIN_TASK_TEMPLATES: '/admin/task-templates',
  ADMIN_PLAN_EDITOR: '/admin/plan-editor',
  ADMIN_PLAN_TEMPLATES: '/admin/plan-templates',
  ADMIN_REPORT_TEMPLATES: '/admin/report-templates',
  ADMIN_BILLING: '/admin/billing',
  ADMIN_PLAN_MANAGER: '/admin/plan-manager',
  ADMIN_AUTOMATION: '/admin/automation',
} as const;

/** Get admin client detail path */
export function adminClientPath(id: string): string {
  return R.ADMIN_CLIENT + '/' + encodeURIComponent(id);
}

/** Get admin plan editor path (optional clientId) */
export function adminPlanEditorPath(clientId?: string): string {
  if (clientId) return R.ADMIN_PLAN_EDITOR + '/' + encodeURIComponent(clientId);
  return R.ADMIN_PLAN_EDITOR;
}
