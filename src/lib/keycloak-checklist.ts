import { env } from "./env";
import { isOidcConfigured } from "./oidc";
import { decodeJwt } from "./tokenClaims";

export type WarningSeverity = "error" | "warning" | "info";

export interface KeycloakWarning {
  id: string;
  severity: WarningSeverity;
  title: string;
  detail: string;
  /** Step-by-step fix in the Keycloak admin console. */
  steps: string[];
}

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i;

/**
 * Inspect the current OIDC config + (optional) decoded ID/access token and
 * surface concrete misconfigurations. Used by KeycloakSetupBanner and the
 * TokenClaimsInspector dialog.
 */
export function inspectKeycloakSetup(accessToken?: string | null): KeycloakWarning[] {
  const out: KeycloakWarning[] = [];

  // ---- Config-level checks (no token required) ----
  if (!isOidcConfigured()) {
    out.push({
      id: "oidc-not-configured",
      severity: "error",
      title: "Keycloak (OIDC) is not configured",
      detail: "VITE_OIDC_AUTHORITY and/or VITE_OIDC_CLIENT_ID are missing or pointing at localhost in a production build.",
      steps: [
        "Set VITE_OIDC_AUTHORITY to your realm issuer URL (e.g. https://auth.example.com/realms/aspire).",
        "Set VITE_OIDC_CLIENT_ID to the public client configured in Keycloak.",
        "Rebuild and redeploy — VITE_* vars are baked at build time.",
      ],
    });
  } else if (LOCALHOST_RE.test(env.oidc.authority)) {
    out.push({
      id: "authority-localhost",
      severity: "warning",
      title: "OIDC authority is pointing at localhost",
      detail: `VITE_OIDC_AUTHORITY = "${env.oidc.authority}". Browsers from other machines or production users won't reach this.`,
      steps: [
        "Replace with a publicly resolvable Keycloak URL.",
        "If running locally for development, add VITE_DEV_MODE=true to bypass OIDC entirely.",
      ],
    });
  }

  if (env.oidc.scope && !/\broles\b/.test(env.oidc.scope)) {
    out.push({
      id: "scope-missing-roles",
      severity: "warning",
      title: "OIDC scope is missing 'roles'",
      detail: `Without the "roles" scope, Keycloak won't include realm_access.roles in the token and the app will see no roles.`,
      steps: [
        `Set VITE_OIDC_SCOPE="openid profile email roles" (current: "${env.oidc.scope}").`,
        "In Keycloak: Client Scopes → roles must exist and be assigned to your client as a Default scope.",
      ],
    });
  }

  if (!env.api.baseUrl || LOCALHOST_RE.test(env.api.baseUrl)) {
    out.push({
      id: "api-localhost",
      severity: env.api.baseUrl ? "warning" : "error",
      title: env.api.baseUrl ? "Backend API is pointing at localhost" : "Backend API base URL is not set",
      detail: `VITE_API_BASE_URL = "${env.api.baseUrl || "(empty)"}".`,
      steps: ["Set VITE_API_BASE_URL to your backend's public URL and rebuild."],
    });
  }

  // ---- Token-level checks ----
  const decoded = decodeJwt(accessToken ?? null);
  if (decoded) {
    const p = decoded.payload;

    const iss = typeof p.iss === "string" ? p.iss : "";
    if (iss && !iss.includes("/realms/")) {
      out.push({
        id: "issuer-not-realm",
        severity: "warning",
        title: "Token issuer doesn't look like a Keycloak realm",
        detail: `iss = "${iss}". Keycloak issuers contain "/realms/<realm>".`,
        steps: ["Confirm VITE_OIDC_AUTHORITY matches the realm URL exactly (no trailing slash)."],
      });
    }

    const aud = p.aud;
    const audOk =
      typeof aud === "string"
        ? aud === env.oidc.clientId
        : Array.isArray(aud)
          ? aud.includes(env.oidc.clientId)
          : false;
    if (aud && !audOk) {
      out.push({
        id: "audience-mismatch",
        severity: "warning",
        title: "Token audience doesn't include this client",
        detail: `aud = ${JSON.stringify(aud)}, expected to include "${env.oidc.clientId}".`,
        steps: [
          `Open Keycloak → Clients → ${env.oidc.clientId} → Client scopes → Dedicated → Mappers.`,
          `Add an "Audience" mapper: Included Client Audience = ${env.oidc.clientId}, Add to access token = ON.`,
        ],
      });
    }

    const realm = p["realm_access"] as { roles?: unknown } | undefined;
    const hasRealmRoles = !!(realm && Array.isArray(realm.roles) && realm.roles.length > 0);
    if (!hasRealmRoles) {
      out.push({
        id: "no-realm-roles",
        severity: "error",
        title: "Token has no realm_access.roles",
        detail: "Without realm roles in the token the app cannot authorise the user for any role-gated screen.",
        steps: [
          "Keycloak → Client Scopes → roles → Mappers → ensure 'realm roles' mapper exists with claim name 'realm_access.roles'.",
          "Keycloak → Clients → <id> → Client scopes → assign 'roles' as Default.",
          "Assign at least one realm role to the user (Users → <user> → Role mapping).",
        ],
      });
    }

    const azp = typeof p.azp === "string" ? p.azp : null;
    if (azp && azp !== env.oidc.clientId) {
      out.push({
        id: "azp-mismatch",
        severity: "info",
        title: "Authorized party (azp) differs from configured client",
        detail: `azp="${azp}" vs VITE_OIDC_CLIENT_ID="${env.oidc.clientId}". Often harmless if you intentionally share scopes between clients.`,
        steps: [
          "If unintentional, set VITE_OIDC_CLIENT_ID to match the client that minted the token.",
        ],
      });
    }
  }

  return out;
}

export function hasBlockingKeycloakIssue(warnings: KeycloakWarning[]): boolean {
  return warnings.some((w) => w.severity === "error");
}
