/**
 * Slice 5 — Global search & analytics types.
 *
 * The frontend never aggregates locally — all KPIs come from `/analytics/*`.
 * Search is a thin pass-through to a backend index keyed by patient/UID/modality/date.
 */

import type { WorkflowStatus } from "./workflow";

export interface SearchQuery {
  q?: string;
  modality?: string[];
  status?: WorkflowStatus[];
  from?: string; // ISO date
  to?: string;   // ISO date
  page?: number;
  pageSize?: number;
}

export type SearchHitKind = "study" | "report" | "patient";

export interface SearchHit {
  id: string;
  kind: SearchHitKind;
  /** Title — patient name (anonymized for radiologists), accession, or UID. */
  title: string;
  subtitle?: string | null;
  modality?: string | null;
  bodyPart?: string | null;
  status?: WorkflowStatus | null;
  studyId?: string | null;
  studyInstanceUID?: string | null;
  studyDate?: string | null;
  matchedField?: string | null;
}

export interface SearchResponse {
  items: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  tookMs?: number;
}

/* ---------- Analytics ---------- */

export interface SystemAnalytics {
  totalStudies: number;
  freePool: number;
  assigned: number;
  inReporting: number;
  submitted: number;
  finalized: number;
  /** Average turn-around-time (study creation → finalized), in hours. */
  avgTatHours: number;
  /** Daily volume buckets, newest last. */
  dailyVolume: Array<{ date: string; count: number }>;
  /** Status distribution snapshot. */
  byStatus: Array<{ status: WorkflowStatus; count: number }>;
}

export interface RadiologistAnalytics {
  radiologistId: string;
  radiologistName: string;
  inProgress: number;
  submitted24h: number;
  finalized24h: number;
  finalized30d: number;
  avgReportingMinutes: number;
  /** Modality mix for this radiologist (top buckets). */
  byModality: Array<{ modality: string; count: number }>;
}

export interface HospitalAnalytics {
  hospitalId: string;
  hospitalName: string;
  uploaded24h: number;
  uploaded30d: number;
  awaitingReport: number;
  finalized30d: number;
  avgTatHours: number;
  byModality: Array<{ modality: string; count: number }>;
}

export interface BillingAnalytics {
  /** Sums grouped by currency to avoid mixing units. */
  payoutsThisMonth: Array<{ currency: string; amount: number }>;
  invoicesThisMonth: Array<{ currency: string; amount: number }>;
  outstandingInvoices: Array<{ currency: string; amount: number }>;
  topRadiologists: Array<{ id: string; name: string; currency: string; amount: number }>;
  topClients: Array<{ id: string; name: string; currency: string; amount: number }>;
}

export const SEARCH_KIND_LABELS: Record<SearchHitKind, string> = {
  study: "Study",
  report: "Report",
  patient: "Patient",
};
