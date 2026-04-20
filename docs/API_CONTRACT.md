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

## What's next (future slices)

- Slice 3: `GET /billing/rate-cards`, `POST /billing/recalculate/{studyId}`, payouts, invoices
- Slice 4: `GET /pacs/sources`, ingestion logs, health
- Slice 5: `GET /search`, `GET /analytics/*`
