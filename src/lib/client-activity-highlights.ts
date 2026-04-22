import type { ActivityType } from "@/lib/activityLogger";

/**
 * Activity types counted in the client topbar “updates” badge (excludes noisy types like raw registration).
 */
export const CLIENT_ACTIVITY_HIGHLIGHT_TYPES: readonly ActivityType[] = [
  "report",
  "task_created",
  "task_completed",
  "invoice_created",
  "invoice_paid",
  "plan_created",
  "plan_updated",
  "onboarding_completed",
  "status_change",
];

export function isClientActivityHighlightType(type: unknown): boolean {
  if (typeof type !== "string") return false;
  return (CLIENT_ACTIVITY_HIGHLIGHT_TYPES as readonly string[]).includes(type);
}
