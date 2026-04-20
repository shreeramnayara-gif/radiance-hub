import type { Role } from "./roles";

export type Currency = string;

export type BillingPartyRole = "radiologist" | "hospital" | "diagnostic_centre";
export type BillingLineKind = "PAYOUT" | "INVOICE";
export type BillingLineStatus = "PENDING" | "LOCKED" | "VOID" | "SUPERSEDED" | "PAID";

export interface RateRule {
  id: string;
  modality: string;
  bodyPart?: string | null;
  amount: number;
}

export interface RateCard {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerRole: BillingPartyRole;
  currency: Currency;
  defaultAmount?: number | null;
  rules: RateRule[];
  active: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RateCardInput = Omit<RateCard, "id" | "createdAt" | "updatedAt" | "ownerName">;

export interface BillingLine {
  id: string;
  kind: BillingLineKind;
  studyId: string;
  studyInstanceUID: string;
  modality: string;
  bodyPart?: string | null;
  partyId: string;
  partyName: string;
  partyRole: BillingPartyRole;
  rateCardId: string;
  reportVersion: number;
  amount: number;
  currency: Currency;
  status: BillingLineStatus;
  warning?: "MISSING_RULE" | null;
  createdAt: string;
  lockedAt?: string | null;
  paidAt?: string | null;
}

export interface BillingLinesResponse {
  items: BillingLine[];
  total: number;
  subtotalsByCurrency: Record<Currency, number>;
}

export interface BillingLinesQuery {
  kind?: BillingLineKind;
  partyId?: string;
  studyId?: string;
  status?: BillingLineStatus[];
  from?: string;
  to?: string;
}

/** UI-only mapping: which billing role a Lovable role maps to (if any). */
export function billingRoleForUser(roles: Role[]): BillingPartyRole | null {
  if (roles.includes("radiologist")) return "radiologist";
  if (roles.includes("hospital")) return "hospital";
  if (roles.includes("diagnostic_centre")) return "diagnostic_centre";
  return null;
}

export const BILLING_LINE_STATUS_TONE: Record<BillingLineStatus, string> = {
  PENDING: "bg-warning/15 text-warning-foreground border-warning/30",
  LOCKED: "bg-primary/15 text-primary border-primary/30",
  VOID: "bg-muted text-muted-foreground border-border line-through",
  SUPERSEDED: "bg-muted text-muted-foreground border-border",
  PAID: "bg-success/15 text-success-foreground border-success/30",
};
