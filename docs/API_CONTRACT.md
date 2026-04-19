# Aspire Reporting Hub — Frontend ↔ Backend API Contract (Slice 1)

The frontend is fully API-driven. Authentication is **OIDC only** (Keycloak by default).
This document covers the endpoints used by the **Auth + Roles + Approval + Landing CMS** slice.
Subsequent slices (workflow, billing, PACS) will append to this contract.

---

## Environment variables

Set these in the build environment (Lovable build secrets / `.env.production`):

| Variable | Example | Notes |
|---|---|---|
| `VITE_OIDC_AUTHORITY` | `https://keycloak.example.com/realms/aspire` | Keycloak realm URL |
| `VITE_OIDC_CLIENT_ID` | `aspire-frontend` | Public OIDC client (PKCE, no secret) |
| `VITE_OIDC_REDIRECT_URI` | `https://app.example.com/auth/callback` | Must match Keycloak client config |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | `https://app.example.com` | |
| `VITE_OIDC_SCOPE` | `openid profile email roles` | Must include the role-bearing scope |
| `VITE_API_BASE_URL` | `https://api.example.com/api` | Base URL for all backend calls below |
| `VITE_ORTHANC_BASE_URL` | `https://orthanc.example.com` | Used in workflow slice |
| `VITE_OHIF_VIEWER_URL` | `https://ohif.example.com/viewer` | Used in workflow slice |

## Auth

- Login is initiated by `oidc-client-ts` `signinRedirect()` to the Keycloak authorize endpoint.
- The frontend route `/auth/callback` calls `signinRedirectCallback()` to complete the code exchange.
- Every API request includes `Authorization: Bearer <access_token>`.
- Roles are extracted from the ID token in this order: top-level `roles` claim, then `realm_access.roles`.
- Recognized role strings (case-sensitive, snake_case): `super_admin`, `sub_admin`, `radiologist`, `diagnostic_centre`, `hospital`, `pacs`.

> Configure your Keycloak client with these realm roles and a token mapper that places them into `realm_access.roles` (default) or a flat `roles` claim.

## Common conventions

- All requests/responses are JSON.
- Error response shape: `{ "message": "human readable", "code": "OPTIONAL_CODE" }` with appropriate HTTP status.
- Timestamps are ISO-8601 strings (UTC).

---

## Users

### `GET /users?status={pending|approved|rejected|suspended}`
Returns users filtered by status. Requires role `super_admin` or `sub_admin`.

Response: `AppUser[]`

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

### `POST /users/{id}/approve`
Marks a pending user as approved. Returns the updated `AppUser`. Audit logged server-side.

### `POST /users/{id}/reject`
Body: `{ "reason": string }`. Returns the updated `AppUser`.

### `POST /users/{id}/suspend`
Suspends an approved user. Returns the updated `AppUser`.

---

## Landing CMS

### `GET /cms/landing`
Public endpoint (no auth required). Returns the active landing-page content.

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

### `PUT /cms/landing`
Saves a new version. Requires role `super_admin`. Body is `Partial<LandingCms>`.
Server should bump `version` and `updatedAt`, persist a version history row, and return the new full `LandingCms`.

---

## What's next (future slices)

- `GET /studies`, `POST /studies/{uid}/assign`, state-machine transitions
- `GET /free-pool`, `POST /free-pool/{uid}/claim`
- `GET/POST /reports/{uid}`, version history
- `GET /billing/rate-cards`, `POST /billing/recalculate/{uid}`
- `GET /pacs/sources`, ingestion logs
- `POST /certificates`, Super Admin certificate review queue
