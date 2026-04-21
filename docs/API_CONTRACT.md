# Aspire Reporting Hub — Frontend ↔ Backend API Contract

The frontend is fully API-driven. Authentication is **OIDC only** (Keycloak by default).
This document covers Slice 1 (Auth + Roles + Approval + Landing CMS) and Slice 2 (Workflow Core).

---

## Environment variables

| Variable | Example | Notes |
|---|---|---|
| `VITE_OIDC_AUTHORITY` | `https://keycloak.example.com/realms/aspire` | Keycloak realm URL |
| `VITE_OIDC_CLIENT_ID` | `aspire-frontend` | Public OIDC client (PKCE) |
| `VITE_OIDC_REDIRECT_URI` | `https://app.example.com/auth/callback` | |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | `https://app.example.com` | |
| `VITE_OIDC_SCOPE` | `openid profile email roles` | Must include role-bearing scope |
| `VITE_API_BASE_URL` | `https://api.example.com/api` | Base URL for all backend calls |
| `VITE_ORTHANC_BASE_URL` | `https://orthanc.example.com` | Used by backend; not called from browser |
| `VITE_OHIF_VIEWER_URL` | `https://ohif.example.com/viewer` | Iframe target for the reporting workspace |

## Auth

- Login is initiated by `oidc-client-ts` `signinRedirect()`.
- `/auth/callback` completes the code exchange.
- Every API request includes `Authorization: Bearer <access_token>`.
- Roles extracted from ID token: top-level `roles` claim, then `realm_access.roles`.
- Recognized role strings: `super_admin`, `sub_admin`, `radiologist`, `diagnostic_centre`, `hospital`, `pacs`.

## Common conventions

- All requests/responses are JSON.
- Error response: `{ "message": string, "code"?: string }` with appropriate HTTP status.
- Timestamps are ISO-8601 UTC.

---

## Users

### `GET /users?status={pending|approved|rejected|suspended}`
Requires `super_admin` or `sub_admin`. Returns `AppUser[]`.

```ts
interface AppUser {
  id: string;
  email: string;
  fullName: string;
  organization?: string | null;
  roles: ("super_admin"|"sub_admin"|"radiologist"|"diagnostic_centre"|"hospital"|"pacs")[];
  status: "pending"|"approved"|"rejected"|"suspended";
  createdAt: string;
  certificatesStatus?: "pending"|"verified"|"rejected"|"expired"|"none";
}
```

### `POST /users/{id}/approve` · `POST /users/{id}/reject` (`{reason}`) · `POST /users/{id}/suspend`

Returns the updated `AppUser`. Audit-logged server-side.

---

## Landing CMS

### `GET /cms/landing` (public) · `PUT /cms/landing` (`super_admin`)

```ts
interface LandingCms {
  brand:   { name: string; tagline: string };
  hero:    { headline: string; subheadline: string; ctaLabel: string; ctaHref: string };
  nav:     { label: string; href: string }[];
  contact: { email: string; phone?: string; address?: string };
  footer:  { copyright: string; links: { label: string; href: string }[] };
  theme?:  { primary?: string };
  version: number;
  updatedAt: string;
}
```

---

# SLICE 2 — Workflow Core (Studies → Free Pool → Reporting → Finalized)

## State machine

```
FREE_POOL ──claim──▶ ASSIGNED ──open──▶ IN_REPORTING ──submit──▶ SUBMITTED ──finalize──▶ FINALIZED
    ▲                    │                    │
    │                    │ release            │ release (before submit)
    └────────────────────┴────────────────────┘
```

Allowed transitions (server MUST enforce; frontend mirrors for UX guards):

| From | To | Action | Required role |
|---|---|---|---|
| `FREE_POOL` | `ASSIGNED` | claim | `radiologist` (self) |
| `FREE_POOL` | `ASSIGNED` | assign | `super_admin` \| `sub_admin` |
| `ASSIGNED` | `IN_REPORTING` | open | assignee |
| `ASSIGNED` | `FREE_POOL` | release | assignee \| admin |
| `IN_REPORTING` | `FREE_POOL` | release | assignee \| admin |
| `IN_REPORTING` | `SUBMITTED` | submit | assignee |
| `SUBMITTED` | `IN_REPORTING` | revise | assignee \| admin |
| `SUBMITTED` | `FINALIZED` | finalize | `super_admin` \| `sub_admin` |

`FINALIZED` is terminal for workflow + comments.

## Anonymization rule

For users whose **only** non-PACS role is `radiologist` (i.e. not also admin/hospital/centre), the backend MUST replace these fields with `null` (frontend then displays "Anonymous Referral Case"):

- `referringHospital`
- `referringCentre`
- `pacsSourceName`
- `patient.name` → preserve `patient.id` only if it is the anonymized DICOM PatientID

## Studies

### `GET /studies`

Query params (all optional):

- `status` — comma-separated `WorkflowStatus`
- `modality` — comma-separated DICOM modality codes (e.g. `CT,MR,XR`)
- `bodyPart` — substring match
- `assigneeId`, `mine=true` (assignee = current user)
- `from`, `to` — ISO date range on `studyDate`
- `q` — search across StudyInstanceUID, patient.id, accession
- `page` (default 1), `pageSize` (default 50, max 200)

Response: `{ items: Study[], total: number, page: number, pageSize: number }`

```ts
type WorkflowStatus = "FREE_POOL" | "ASSIGNED" | "IN_REPORTING" | "SUBMITTED" | "FINALIZED";

interface Study {
  id: string;                     // internal DB id
  studyInstanceUID: string;
  accessionNumber?: string | null;
  modality: string;               // primary modality
  bodyPart?: string | null;
  studyDate: string;              // ISO
  description?: string | null;
  patient: { id: string; name?: string | null; sex?: "M"|"F"|"O"|null; birthDate?: string | null };
  status: WorkflowStatus;
  assignee?: { id: string; fullName: string } | null;
  referringHospital?: string | null;   // null if anonymized
  referringCentre?: string | null;     // null if anonymized
  pacsSourceName?: string | null;      // null if anonymized
  reportVersion?: number;              // latest submitted version, if any
  updatedAt: string;
  createdAt: string;
}
```

### `GET /studies/{id}` — single Study

### `POST /studies/{id}/transition`
Body: `{ "to": WorkflowStatus, "assigneeId"?: string, "reason"?: string }`
Server validates the transition is allowed for the caller and current status.
Returns the updated `Study`.

Convenience aliases (server SHOULD also accept):

- `POST /studies/{id}/claim` → transition to `ASSIGNED` (assignee=self)
- `POST /studies/{id}/assign` body `{ assigneeId }` → `ASSIGNED`
- `POST /studies/{id}/release` → back to `FREE_POOL` (only valid from `ASSIGNED` or `IN_REPORTING`)
- `POST /studies/{id}/open` → `IN_REPORTING`
- `POST /studies/{id}/finalize` → `FINALIZED`

### `GET /free-pool?modality=CT,MR`
Convenience: equivalent to `GET /studies?status=FREE_POOL&modality=…`.

### `GET /studies/{id}/viewer-url`
Returns `{ url: string, expiresAt: string }`. Backend mints a short-lived signed URL for the OHIF viewer (so the browser never sees raw PACS credentials). Frontend embeds this in an iframe.

## Reports

```ts
interface Report {
  id: string;
  studyId: string;
  status: "DRAFT" | "SUBMITTED" | "FINALIZED";
  contentHtml: string;            // sanitized HTML from TipTap
  contentText: string;            // plaintext mirror for search
  version: number;                // increments on each SUBMITTED snapshot
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  finalizedAt?: string | null;
}
```

### `GET /studies/{studyId}/report` — current draft + latest submitted, shape: `{ draft?: Report, latest?: Report }`
### `PUT /studies/{studyId}/report` — body `{ contentHtml, contentText }`. Upserts the DRAFT. Returns the draft `Report`.
### `POST /studies/{studyId}/report/submit` — snapshots the draft as a new immutable `SUBMITTED` version, transitions study to `SUBMITTED`. Returns `Report`.
### `GET /studies/{studyId}/report/versions` — `Report[]` ordered by `version` desc.

## Comments

```ts
interface Comment {
  id: string;
  studyId: string;
  parentId?: string | null;       // for threading (one level deep)
  authorId: string;
  authorName: string;
  authorRole: "super_admin"|"sub_admin"|"radiologist"|"diagnostic_centre"|"hospital"|"pacs";
  body: string;
  createdAt: string;
}
```

### `GET /studies/{studyId}/comments` — `Comment[]` chronological
### `POST /studies/{studyId}/comments` — body `{ body: string, parentId?: string }`. Rejected with `409` when study is `FINALIZED`.

---

# SLICE 3 — Billing Engine (contract-driven)

Triggered automatically by the backend on `SUBMITTED`, recalculated on revision and refunded/voided on release-back-to-pool. Frontend never computes prices — it reads/writes rate cards and reads payouts/invoices.

## Concepts

- **RateCard** — owned by a single user (radiologist, hospital, or diagnostic centre). Contains a list of **rules** matched by `modality` + optional `bodyPart`.
- **Rule resolution** (server-side, deterministic):
  1. exact `(modality, bodyPart)` match
  2. `(modality, bodyPart=null)` fallback
  3. card `defaultAmount` if defined
  4. otherwise → `0` and a `MISSING_RULE` warning is attached to the line item
- A radiologist's card produces **payout** lines. A hospital/centre's card produces **invoice** lines.
- Currency is per-card (ISO 4217). Mixing currencies across users is allowed; aggregation is per currency.

## Triggers (server-enforced)

| Workflow event | Billing effect |
|---|---|
| Study `→ SUBMITTED` | create payout line for assignee + invoice line for referring hospital/centre, status `PENDING` |
| Report version `> 1` (revision) | upsert lines against latest report version, mark prior as `SUPERSEDED` |
| Study `→ FREE_POOL` (release) | void any non-finalized lines for that study |
| Study `→ FINALIZED` | mark lines as `LOCKED` (immutable, eligible for payout/invoice run) |

## Types

```ts
type Currency = string; // ISO 4217, e.g. "USD", "EUR", "INR"

interface RateRule {
  id: string;
  modality: string;            // DICOM modality code, required
  bodyPart?: string | null;    // null = any body part for this modality
  amount: number;              // minor units NOT used; this is decimal in card.currency
}

interface RateCard {
  id: string;
  ownerId: string;             // user id
  ownerName: string;
  ownerRole: "radiologist" | "hospital" | "diagnostic_centre";
  currency: Currency;
  defaultAmount?: number | null;
  rules: RateRule[];
  active: boolean;
  effectiveFrom: string;       // ISO
  effectiveTo?: string | null; // ISO; null = open-ended
  createdAt: string;
  updatedAt: string;
}

type BillingLineStatus = "PENDING" | "LOCKED" | "VOID" | "SUPERSEDED" | "PAID";
type BillingLineKind   = "PAYOUT" | "INVOICE";

interface BillingLine {
  id: string;
  kind: BillingLineKind;
  studyId: string;
  studyInstanceUID: string;
  modality: string;
  bodyPart?: string | null;
  partyId: string;             // radiologist (PAYOUT) or hospital/centre (INVOICE)
  partyName: string;
  partyRole: "radiologist" | "hospital" | "diagnostic_centre";
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
```

## Endpoints

### Rate cards (admin: `super_admin` | `sub_admin`)

- `GET /billing/rate-cards?ownerRole=&ownerId=&active=` → `RateCard[]`
- `GET /billing/rate-cards/{id}` → `RateCard`
- `POST /billing/rate-cards` body `Omit<RateCard,"id"|"createdAt"|"updatedAt">` → `RateCard`
- `PUT /billing/rate-cards/{id}` body `Partial<RateCard>` → `RateCard`
- `DELETE /billing/rate-cards/{id}` → `204` (soft-delete sets `active=false`)
- `GET /billing/my-rate-card` → the caller's own active card (any role) or `404`

### Lines

- `GET /billing/lines?kind=PAYOUT|INVOICE&partyId=&from=&to=&status=&studyId=` — admins see all; radiologists implicitly scoped to `partyId=self,kind=PAYOUT`; hospital/centre to `partyId=self,kind=INVOICE`.
  Response: `{ items: BillingLine[]; total: number; subtotalsByCurrency: Record<Currency, number> }`
- `POST /billing/recalculate/{studyId}` (admin) → recomputes lines for a study. Returns the new `BillingLine[]`.
- `POST /billing/lines/{id}/mark-paid` (admin) → returns updated `BillingLine`.
- `GET /billing/export?kind=PAYOUT|INVOICE&from=&to=&format=csv` → CSV stream (handled by the browser as a download).

---

# SLICE 4 — PACS Integration Dashboard

Manages external imaging sources (Orthanc, DICOMweb peers, DIMSE nodes) and surfaces
ingestion telemetry to admins. The frontend never speaks DICOM directly — the
backend mediates everything and only exposes the JSON shapes below.

**Roles:** `super_admin` and `pacs` can read & write endpoints; `sub_admin` may
read everything (monitoring); other roles have no access.

## Endpoints (configuration)

- `GET    /pacs/endpoints` → `PacsEndpoint[]`
- `POST   /pacs/endpoints` body `PacsEndpointInput` → `PacsEndpoint`
- `GET    /pacs/endpoints/{id}` → `PacsEndpoint`
- `PUT    /pacs/endpoints/{id}` body `Partial<PacsEndpointInput>` → `PacsEndpoint`
- `DELETE /pacs/endpoints/{id}` → `204`
- `POST   /pacs/endpoints/{id}/test` → `PacsTestResult` (probes connectivity)
- `POST   /pacs/endpoints/{id}/sync` → `{ queued: true }` (triggers a manual pull)
- `POST   /pacs/endpoints/{id}/enable` / `/disable` → `PacsEndpoint`

## Ingestion monitoring

- `GET /pacs/ingestion?endpointId=&status=&from=&to=&q=&page=&pageSize=` → `IngestionListResponse`
- Each event records the originating endpoint, the resulting `studyId` (once
  ingested), and an `anonymized` flag. Backend MUST anonymize PHI before any
  radiologist-visible payload is exposed elsewhere.

## Sync logs

- `GET /pacs/logs?endpointId=&level=&from=&to=&page=&pageSize=` → `SyncLogListResponse`
- `level` is one of `info | warn | error`. `op` is a free-form tag identifying
  the protocol op (`c-find`, `qido`, `poll`, `auth`, ...).

## Health

- `GET /pacs/health` → `PacsHealthSummary` — rollup across all endpoints with
  per-endpoint reachability, 24 h ingested/rejected counters, and an optional
  throughput sparkline.

State machine implications: `IngestionEvent.status = "ingested"` is what creates
a `Study` in `FREE_POOL`. Workflow transitions take it from there.


---

# SLICE 5 — Global Search & Analytics

## Search

- `GET /search?q=&modality=&status=&from=&to=&page=&pageSize=` → `SearchResponse`
- Indexes patient name, accession, `studyInstanceUID`, modality, body part,
  report text. Backend MUST anonymize patient fields in hits returned to
  radiologists (replace name with "Anonymous Referral Case").

## Analytics

All analytics are role-scoped on the server. Frontend just calls the endpoint
that matches the active role; the server enforces visibility.

- `GET /analytics/system` → `SystemAnalytics`
  Roles: `super_admin`, `sub_admin`. System-wide counters, daily volume, status
  distribution, and average TAT (hours from study creation to FINALIZED).

- `GET /analytics/radiologists` → `RadiologistAnalytics[]`
  Roles: `super_admin`, `sub_admin` see all; `radiologist` gets only their own
  row. Workload, finalized counters, modality mix, average reporting minutes.

- `GET /analytics/hospitals` → `HospitalAnalytics[]`
  Roles: `super_admin`, `sub_admin` see all; `hospital` / `diagnostic_centre`
  get only their own row. Upload volume, awaiting-report, finalized 30 d, TAT.

- `GET /analytics/billing` → `BillingAnalytics`
  Roles: `super_admin` only. Payouts/invoices grouped by currency, outstanding
  invoices, and top-N radiologists/clients for the current month.
