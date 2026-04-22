/**
 * Single source of truth for client lifecycle phase (onboarding → completed).
 * Maps Firestore `onboardingCompleted` + `projectStatus` to a stable phase key.
 */

export type ClientLifecyclePhase =
  | "onboarding"
  | "planning"
  | "active"
  | "paused"
  | "completed";

/** When admin sets a phase, these values are written to `clients/{id}`. */
export const LIFECYCLE_PHASE_TO_CLIENT_DOC: Record<
  ClientLifecyclePhase,
  { projectStatus: string; onboardingCompleted: boolean }
> = {
  onboarding: { projectStatus: "Strategy", onboardingCompleted: false },
  planning: { projectStatus: "Planning", onboardingCompleted: true },
  active: { projectStatus: "Active", onboardingCompleted: true },
  paused: { projectStatus: "Paused", onboardingCompleted: true },
  completed: { projectStatus: "Completed", onboardingCompleted: true },
};

export const LIFECYCLE_LABELS: Record<ClientLifecyclePhase, string> = {
  onboarding: "Onboarding",
  planning: "Planning",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export const LIFECYCLE_BADGE_CLASSES: Record<ClientLifecyclePhase, string> = {
  onboarding: "bg-warning/10 text-warning",
  planning: "bg-primary/10 text-primary",
  active: "bg-success/10 text-success",
  paused: "bg-muted text-muted-foreground",
  completed: "bg-secondary text-secondary-foreground",
};

/** Hex colors for charts (e.g. AdminAnalytics). */
export const LIFECYCLE_CHART_COLORS: Record<ClientLifecyclePhase, string> = {
  onboarding: "#f59e0b",
  planning: "#6366f1",
  active: "#22c55e",
  paused: "#94a3b8",
  completed: "#64748b",
};

export function getClientLifecyclePhase(data: {
  onboardingCompleted?: boolean;
  projectStatus?: string;
}): ClientLifecyclePhase {
  if (!data.onboardingCompleted) return "onboarding";
  switch (data.projectStatus) {
    case "Strategy":
    case "Planning":
      return "planning";
    case "Active":
      return "active";
    case "Paused":
      return "paused";
    case "Completed":
      return "completed";
    default:
      return "planning";
  }
}
