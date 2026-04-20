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

export const commentsService = {
  list: (studyId: string) => apiFetch<Comment[]>(`/studies/${studyId}/comments`),
  create: (studyId: string, body: string, parentId?: string) =>
    apiFetch<Comment>(`/studies/${studyId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, parentId }),
    }),
};
