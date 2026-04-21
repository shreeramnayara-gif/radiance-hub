/**
 * Slice 4 — PACS Integration types & helpers.
 *
 * The frontend never talks to Orthanc/DICOM nodes directly. The backend mediates all
 * traffic: we expose endpoint configuration, ingestion telemetry, sync logs, and
 * health rollups via `/pacs/*` REST endpoints (see docs/API_CONTRACT.md).
 */

export type PacsProtocol = "DIMSE" | "DICOMWEB" | "ORTHANC_REST";

export type PacsEndpointStatus = "active" | "disabled" | "error";

export interface PacsEndpoint {
  id: string;
  name: string;
  protocol: PacsProtocol;
  /** Hostname or base URL depending on protocol. */
  host: string;
  port?: number | null;
  /** AE Title for DIMSE; ignored otherwise. */
  aeTitle?: string | null;
  /** Display label for the source organization (hospital, centre, etc.). */
  sourceLabel?: string | null;
  /** Whether the endpoint auto-pulls or just receives pushed studies. */
  pullEnabled: boolean;
  pollIntervalSec?: number | null;
  status: PacsEndpointStatus;
  lastSyncAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PacsEndpointInput {
  name: string;
  protocol: PacsProtocol;
  host: string;
  port?: number | null;
  aeTitle?: string | null;
  sourceLabel?: string | null;
  pullEnabled: boolean;
  pollIntervalSec?: number | null;
}

export type IngestionEventStatus = "received" | "processing" | "ingested" | "rejected" | "duplicate";

export interface IngestionEvent {
  id: string;
  endpointId: string;
  endpointName: string;
  studyInstanceUID: string;
  modality?: string | null;
  patientLabel?: string | null;
  /** Server-side anonymization flag — radiologists never see PHI here. */
  anonymized: boolean;
  status: IngestionEventStatus;
  receivedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
  /** Created Study UUID once ingestion succeeds. */
  studyId?: string | null;
}

export interface IngestionQuery {
  endpointId?: string;
  status?: IngestionEventStatus[];
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface IngestionListResponse {
  items: IngestionEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export type SyncLogLevel = "info" | "warn" | "error";

export interface SyncLogEntry {
  id: string;
  endpointId: string;
  endpointName: string;
  level: SyncLogLevel;
  message: string;
  /** Operation tag: `c-find`, `c-move`, `qido`, `wado`, `poll`, `auth`, ... */
  op?: string | null;
  durationMs?: number | null;
  createdAt: string;
}

export interface SyncLogQuery {
  endpointId?: string;
  level?: SyncLogLevel[];
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface SyncLogListResponse {
  items: SyncLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PacsEndpointHealth {
  endpointId: string;
  endpointName: string;
  status: PacsEndpointStatus;
  reachable: boolean;
  latencyMs?: number | null;
  /** Counts in the last 24 h. */
  ingested24h: number;
  rejected24h: number;
  lastSyncAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  /** Throughput sparkline buckets (newest last). */
  throughput?: number[];
}

export interface PacsHealthSummary {
  totalEndpoints: number;
  active: number;
  errored: number;
  disabled: number;
  ingested24h: number;
  rejected24h: number;
  endpoints: PacsEndpointHealth[];
}

export interface PacsTestResult {
  ok: boolean;
  latencyMs?: number | null;
  message?: string | null;
}

export const PACS_PROTOCOL_LABELS: Record<PacsProtocol, string> = {
  DIMSE: "DICOM DIMSE (C-FIND/C-MOVE)",
  DICOMWEB: "DICOMweb (QIDO/WADO)",
  ORTHANC_REST: "Orthanc REST",
};

export const INGESTION_STATUS_LABELS: Record<IngestionEventStatus, string> = {
  received: "Received",
  processing: "Processing",
  ingested: "Ingested",
  rejected: "Rejected",
  duplicate: "Duplicate",
};
