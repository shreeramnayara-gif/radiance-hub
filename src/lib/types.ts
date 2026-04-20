import type { Role } from "./roles";
import type { WorkflowStatus } from "./workflow";

export type UserStatus = "pending" | "approved" | "rejected" | "suspended";

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  organization?: string | null;
  roles: Role[];
  status: UserStatus;
  createdAt: string;
  certificatesStatus?: "pending" | "verified" | "rejected" | "expired" | "none";
}

export interface LandingCms {
  brand: { name: string; tagline: string };
  hero: { headline: string; subheadline: string; ctaLabel: string; ctaHref: string };
  nav: Array<{ label: string; href: string }>;
  contact: { email: string; phone?: string; address?: string };
  footer: { copyright: string; links: Array<{ label: string; href: string }> };
  theme?: { primary?: string };
  version: number;
  updatedAt: string;
}

/* -------- Slice 2: Workflow -------- */

export interface StudyPatient {
  id: string;
  name?: string | null;
  sex?: "M" | "F" | "O" | null;
  birthDate?: string | null;
}

export interface Study {
  id: string;
  studyInstanceUID: string;
  accessionNumber?: string | null;
  modality: string;
  bodyPart?: string | null;
  studyDate: string;
  description?: string | null;
  patient: StudyPatient;
  status: WorkflowStatus;
  assignee?: { id: string; fullName: string } | null;
  referringHospital?: string | null;
  referringCentre?: string | null;
  pacsSourceName?: string | null;
  reportVersion?: number;
  updatedAt: string;
  createdAt: string;
}

export interface StudyListResponse {
  items: Study[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StudyListQuery {
  status?: WorkflowStatus[];
  modality?: string[];
  bodyPart?: string;
  assigneeId?: string;
  mine?: boolean;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ViewerUrl {
  url: string;
  expiresAt: string;
}

export type ReportStatus = "DRAFT" | "SUBMITTED" | "FINALIZED";

export interface Report {
  id: string;
  studyId: string;
  status: ReportStatus;
  contentHtml: string;
  contentText: string;
  version: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  finalizedAt?: string | null;
}

export interface ReportBundle {
  draft?: Report;
  latest?: Report;
}

export interface Comment {
  id: string;
  studyId: string;
  parentId?: string | null;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  createdAt: string;
}
