import { ROLES, type Role } from "./roles";

export const WORKFLOW_STATUS = {
  FREE_POOL: "FREE_POOL",
  ASSIGNED: "ASSIGNED",
  IN_REPORTING: "IN_REPORTING",
  SUBMITTED: "SUBMITTED",
  FINALIZED: "FINALIZED",
} as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  FREE_POOL: "Free Pool",
  ASSIGNED: "Assigned",
  IN_REPORTING: "In Reporting",
  SUBMITTED: "Submitted",
  FINALIZED: "Finalized",
};

export const WORKFLOW_TONE: Record<WorkflowStatus, string> = {
  FREE_POOL: "bg-muted text-muted-foreground border-border",
  ASSIGNED: "bg-accent/15 text-accent-foreground border-accent/30",
  IN_REPORTING: "bg-warning/15 text-warning-foreground border-warning/30",
  SUBMITTED: "bg-primary/15 text-primary border-primary/30",
  FINALIZED: "bg-success/15 text-success-foreground border-success/30",
};

/** Allowed transitions per source state. */
const TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  FREE_POOL: ["ASSIGNED"],
  ASSIGNED: ["IN_REPORTING", "FREE_POOL"],
  IN_REPORTING: ["SUBMITTED", "FREE_POOL"],
  SUBMITTED: ["FINALIZED", "IN_REPORTING"],
  FINALIZED: [],
};

export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

interface PermissionInput {
  status: WorkflowStatus;
  roles: Role[];
  isAssignee: boolean;
}

export function canClaim({ status, roles }: PermissionInput) {
  return status === "FREE_POOL" && roles.includes(ROLES.RADIOLOGIST);
}
export function canAssign({ status, roles }: PermissionInput) {
  return status !== "FINALIZED" && (roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.SUB_ADMIN));
}
export function canOpen({ status, isAssignee }: PermissionInput) {
  return status === "ASSIGNED" && isAssignee;
}
export function canRelease({ status, isAssignee, roles }: PermissionInput) {
  return (status === "ASSIGNED" || status === "IN_REPORTING") &&
    (isAssignee || roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.SUB_ADMIN));
}
export function canSubmit({ status, isAssignee }: PermissionInput) {
  return status === "IN_REPORTING" && isAssignee;
}
export function canFinalize({ status, roles }: PermissionInput) {
  return status === "SUBMITTED" && (roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.SUB_ADMIN));
}
export function canComment(status: WorkflowStatus) {
  return status !== "FINALIZED";
}

/** True if the current user is acting solely as a radiologist (anonymization required). */
export function isAnonymizedAudience(roles: Role[]): boolean {
  if (!roles.includes(ROLES.RADIOLOGIST)) return false;
  return !roles.some((r) =>
    r === ROLES.SUPER_ADMIN || r === ROLES.SUB_ADMIN || r === ROLES.HOSPITAL || r === ROLES.DIAGNOSTIC_CENTRE,
  );
}

export const ANON_LABEL = "Anonymous Referral Case";
