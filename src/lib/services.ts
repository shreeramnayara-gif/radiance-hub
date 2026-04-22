import { apiFetch } from "./api";
import type {
  AppUser,
  Comment,
  LandingCms,
  Report,
  ReportBundle,
  Study,
  StudyListQuery,
  StudyListResponse,
  UserStatus,
  ViewerUrl,
} from "./types";
import type { WorkflowStatus } from "./workflow";
import type {
  BillingLine,
  BillingLinesQuery,
  BillingLinesResponse,
  RateCard,
  RateCardInput,
} from "./billing";
import type {
  IngestionListResponse,
  IngestionQuery,
  PacsEndpoint,
  PacsEndpointInput,
  PacsHealthSummary,
  PacsTestResult,
  SyncLogListResponse,
  SyncLogQuery,
} from "./pacs";
import type {
  BillingAnalytics,
  HospitalAnalytics,
  RadiologistAnalytics,
  SearchQuery,
  SearchResponse,
  SystemAnalytics,
} from "./analytics";
import { env } from "./env";

export const usersService = {
  list: (params?: { status?: UserStatus }) => {
    const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
    return apiFetch<AppUser[]>(`/users${q}`);
  },
  approve: (id: string) => apiFetch<AppUser>(`/users/${id}/approve`, { method: "POST" }),
  reject: (id: string, reason: string) =>
    apiFetch<AppUser>(`/users/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  suspend: (id: string) => apiFetch<AppUser>(`/users/${id}/suspend`, { method: "POST" }),
  /** Lightweight directory lookup for assignment dropdowns (admin-only on the backend). */
  listRadiologists: () => apiFetch<AppUser[]>(`/users?status=approved&role=radiologist`),
};

export const cmsService = {
  getLanding: () => apiFetch<LandingCms>("/cms/landing"),
  saveLanding: (cms: Partial<LandingCms>) =>
    apiFetch<LandingCms>("/cms/landing", { method: "PUT", body: JSON.stringify(cms) }),
};

function buildStudyQuery(q?: StudyListQuery): string {
  if (!q) return "";
  const sp = new URLSearchParams();
  if (q.status?.length) sp.set("status", q.status.join(","));
  if (q.modality?.length) sp.set("modality", q.modality.join(","));
  if (q.bodyPart) sp.set("bodyPart", q.bodyPart);
  if (q.assigneeId) sp.set("assigneeId", q.assigneeId);
  if (q.mine) sp.set("mine", "true");
  if (q.from) sp.set("from", q.from);
  if (q.to) sp.set("to", q.to);
  if (q.q) sp.set("q", q.q);
  if (q.page) sp.set("page", String(q.page));
  if (q.pageSize) sp.set("pageSize", String(q.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const studiesService = {
  list: (q?: StudyListQuery) => apiFetch<StudyListResponse>(`/studies${buildStudyQuery(q)}`),
  get: (id: string) => apiFetch<Study>(`/studies/${id}`),
  freePool: (modality?: string[]) =>
    apiFetch<StudyListResponse>(
      `/free-pool${modality?.length ? `?modality=${modality.join(",")}` : ""}`,
    ),
  transition: (id: string, to: WorkflowStatus, extra?: { assigneeId?: string; reason?: string }) =>
    apiFetch<Study>(`/studies/${id}/transition`, {
      method: "POST",
      body: JSON.stringify({ to, ...extra }),
    }),
  claim: (id: string) => apiFetch<Study>(`/studies/${id}/claim`, { method: "POST" }),
  assign: (id: string, assigneeId: string) =>
    apiFetch<Study>(`/studies/${id}/assign`, { method: "POST", body: JSON.stringify({ assigneeId }) }),
  release: (id: string, reason?: string) =>
    apiFetch<Study>(`/studies/${id}/release`, { method: "POST", body: JSON.stringify({ reason }) }),
  open: (id: string) => apiFetch<Study>(`/studies/${id}/open`, { method: "POST" }),
  finalize: (id: string) => apiFetch<Study>(`/studies/${id}/finalize`, { method: "POST" }),
  viewerUrl: (id: string) => apiFetch<ViewerUrl>(`/studies/${id}/viewer-url`),
  /**
   * Upload one or more DICOM files (or a zipped study) from a hospital/centre
   * portal. Backend ingests into Orthanc and creates Study records.
   */
  upload: (files: File[], meta?: { referringHospital?: string; referringCentre?: string; notes?: string }) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f, f.name));
    if (meta?.referringHospital) fd.append("referringHospital", meta.referringHospital);
    if (meta?.referringCentre) fd.append("referringCentre", meta.referringCentre);
    if (meta?.notes) fd.append("notes", meta.notes);
    return apiFetch<{ uploaded: number; studies: Study[] }>(`/studies/upload`, {
      method: "POST",
      body: fd,
    });
  },
};

export const reportsService = {
  get: (studyId: string) => apiFetch<ReportBundle>(`/studies/${studyId}/report`),
  saveDraft: (studyId: string, contentHtml: string, contentText: string) =>
    apiFetch<Report>(`/studies/${studyId}/report`, {
      method: "PUT",
      body: JSON.stringify({ contentHtml, contentText }),
    }),
  submit: (studyId: string) =>
    apiFetch<Report>(`/studies/${studyId}/report/submit`, { method: "POST" }),
  versions: (studyId: string) => apiFetch<Report[]>(`/studies/${studyId}/report/versions`),
};

function buildBillingQuery(q?: BillingLinesQuery): string {
  if (!q) return "";
  const sp = new URLSearchParams();
  if (q.kind) sp.set("kind", q.kind);
  if (q.partyId) sp.set("partyId", q.partyId);
  if (q.studyId) sp.set("studyId", q.studyId);
  if (q.status?.length) sp.set("status", q.status.join(","));
  if (q.from) sp.set("from", q.from);
  if (q.to) sp.set("to", q.to);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const billingService = {
  listRateCards: (params?: { ownerRole?: string; ownerId?: string; active?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.ownerRole) sp.set("ownerRole", params.ownerRole);
    if (params?.ownerId) sp.set("ownerId", params.ownerId);
    if (typeof params?.active === "boolean") sp.set("active", String(params.active));
    const s = sp.toString();
    return apiFetch<RateCard[]>(`/billing/rate-cards${s ? `?${s}` : ""}`);
  },
  getRateCard: (id: string) => apiFetch<RateCard>(`/billing/rate-cards/${id}`),
  myRateCard: () => apiFetch<RateCard>(`/billing/my-rate-card`),
  createRateCard: (input: RateCardInput) =>
    apiFetch<RateCard>(`/billing/rate-cards`, { method: "POST", body: JSON.stringify(input) }),
  updateRateCard: (id: string, patch: Partial<RateCardInput>) =>
    apiFetch<RateCard>(`/billing/rate-cards/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteRateCard: (id: string) => apiFetch<void>(`/billing/rate-cards/${id}`, { method: "DELETE" }),

  listLines: (q?: BillingLinesQuery) =>
    apiFetch<BillingLinesResponse>(`/billing/lines${buildBillingQuery(q)}`),
  recalculate: (studyId: string) =>
    apiFetch<BillingLine[]>(`/billing/recalculate/${studyId}`, { method: "POST" }),
  markPaid: (id: string) =>
    apiFetch<BillingLine>(`/billing/lines/${id}/mark-paid`, { method: "POST" }),

  /** Direct CSV download URL — opens the export endpoint with the user's bearer token via fetch + blob. */
  exportCsvUrl: (q: BillingLinesQuery & { kind: "PAYOUT" | "INVOICE" }) =>
    `${env.api.baseUrl}/billing/export${buildBillingQuery(q).replace(/^\?/, "?format=csv&")}`,
};

export const commentsService = {
  list: (studyId: string) => apiFetch<Comment[]>(`/studies/${studyId}/comments`),
  create: (studyId: string, body: string, parentId?: string) =>
    apiFetch<Comment>(`/studies/${studyId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, parentId }),
    }),
};

/* -------- Slice 4: PACS Integration -------- */

function buildIngestionQuery(q?: IngestionQuery): string {
  if (!q) return "";
  const sp = new URLSearchParams();
  if (q.endpointId) sp.set("endpointId", q.endpointId);
  if (q.status?.length) sp.set("status", q.status.join(","));
  if (q.from) sp.set("from", q.from);
  if (q.to) sp.set("to", q.to);
  if (q.q) sp.set("q", q.q);
  if (q.page) sp.set("page", String(q.page));
  if (q.pageSize) sp.set("pageSize", String(q.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function buildLogsQuery(q?: SyncLogQuery): string {
  if (!q) return "";
  const sp = new URLSearchParams();
  if (q.endpointId) sp.set("endpointId", q.endpointId);
  if (q.level?.length) sp.set("level", q.level.join(","));
  if (q.from) sp.set("from", q.from);
  if (q.to) sp.set("to", q.to);
  if (q.page) sp.set("page", String(q.page));
  if (q.pageSize) sp.set("pageSize", String(q.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const pacsService = {
  listEndpoints: () => apiFetch<PacsEndpoint[]>(`/pacs/endpoints`),
  getEndpoint: (id: string) => apiFetch<PacsEndpoint>(`/pacs/endpoints/${id}`),
  createEndpoint: (input: PacsEndpointInput) =>
    apiFetch<PacsEndpoint>(`/pacs/endpoints`, { method: "POST", body: JSON.stringify(input) }),
  updateEndpoint: (id: string, patch: Partial<PacsEndpointInput>) =>
    apiFetch<PacsEndpoint>(`/pacs/endpoints/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteEndpoint: (id: string) => apiFetch<void>(`/pacs/endpoints/${id}`, { method: "DELETE" }),
  testEndpoint: (id: string) =>
    apiFetch<PacsTestResult>(`/pacs/endpoints/${id}/test`, { method: "POST" }),
  syncEndpoint: (id: string) =>
    apiFetch<{ queued: true }>(`/pacs/endpoints/${id}/sync`, { method: "POST" }),
  enableEndpoint: (id: string) =>
    apiFetch<PacsEndpoint>(`/pacs/endpoints/${id}/enable`, { method: "POST" }),
  disableEndpoint: (id: string) =>
    apiFetch<PacsEndpoint>(`/pacs/endpoints/${id}/disable`, { method: "POST" }),

  listIngestion: (q?: IngestionQuery) =>
    apiFetch<IngestionListResponse>(`/pacs/ingestion${buildIngestionQuery(q)}`),
  listLogs: (q?: SyncLogQuery) =>
    apiFetch<SyncLogListResponse>(`/pacs/logs${buildLogsQuery(q)}`),
  health: () => apiFetch<PacsHealthSummary>(`/pacs/health`),
};

/* -------- Slice 5: Search & Analytics -------- */

function buildSearchQuery(q: SearchQuery): string {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.modality?.length) sp.set("modality", q.modality.join(","));
  if (q.status?.length) sp.set("status", q.status.join(","));
  if (q.from) sp.set("from", q.from);
  if (q.to) sp.set("to", q.to);
  if (q.page) sp.set("page", String(q.page));
  if (q.pageSize) sp.set("pageSize", String(q.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const searchService = {
  search: (q: SearchQuery) => apiFetch<SearchResponse>(`/search${buildSearchQuery(q)}`),
};

export const analyticsService = {
  system: () => apiFetch<SystemAnalytics>(`/analytics/system`),
  radiologists: () => apiFetch<RadiologistAnalytics[]>(`/analytics/radiologists`),
  hospitals: () => apiFetch<HospitalAnalytics[]>(`/analytics/hospitals`),
  billing: () => apiFetch<BillingAnalytics>(`/analytics/billing`),
};
