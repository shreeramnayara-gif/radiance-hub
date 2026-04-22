import { ROLES, type Role } from "./roles";

/* ------------------------------------------------------------------ */
/* JWT decoding                                                        */
/* ------------------------------------------------------------------ */

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: string;
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") {
    try {
      // atob -> binary string -> UTF-8
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return "";
    }
  }
  return "";
}

export function decodeJwt(token: string | undefined | null): DecodedJwt | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(base64UrlDecode(parts[0])) as Record<string, unknown>;
    const payload = JSON.parse(base64UrlDecode(parts[1])) as Record<string, unknown>;
    return { header, payload, signature: parts[2], raw: token };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Role extraction & mapping                                           */
/* ------------------------------------------------------------------ */

/**
 * Optional alias map for environments where Keycloak realm role names don't
 * exactly match the app's canonical role IDs (kebab/camel/PascalCase, etc.).
 * Extend as needed without touching call sites.
 */
const ROLE_ALIASES: Record<string, Role> = {
  superadmin: ROLES.SUPER_ADMIN,
  "super-admin": ROLES.SUPER_ADMIN,
  subadmin: ROLES.SUB_ADMIN,
  "sub-admin": ROLES.SUB_ADMIN,
  rad: ROLES.RADIOLOGIST,
  radiologist: ROLES.RADIOLOGIST,
  hospital: ROLES.HOSPITAL,
  "diagnostic-centre": ROLES.DIAGNOSTIC_CENTRE,
  "diagnostic-center": ROLES.DIAGNOSTIC_CENTRE,
  diagnosticcentre: ROLES.DIAGNOSTIC_CENTRE,
  pacs: ROLES.PACS,
  "pacs-integration": ROLES.PACS,
};

const KNOWN_ROLES = new Set<string>(Object.values(ROLES));

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/_/g, "-");
}

function tryMap(raw: string): Role | null {
  const direct = raw.trim().toLowerCase();
  if (KNOWN_ROLES.has(direct)) return direct as Role;
  const norm = normalize(raw);
  if (ROLE_ALIASES[norm]) return ROLE_ALIASES[norm];
  // also try snake_case form of the alias
  const snake = norm.replace(/-/g, "_");
  if (KNOWN_ROLES.has(snake)) return snake as Role;
  return null;
}

export interface ClaimSource {
  /** Where in the token this set of role strings came from. */
  path: string;
  values: string[];
}

export interface RoleMappingReport {
  sources: ClaimSource[];
  /** All raw role strings found anywhere in the token, deduped. */
  rawRoles: string[];
  /** Successfully mapped to the app's Role set. */
  mapped: Role[];
  /** Strings that looked like roles but didn't map to the app's known set. */
  unmapped: string[];
  /** App roles that nobody granted in this token (informational). */
  missing: Role[];
}

/**
 * Pull every plausible role-bearing claim from a Keycloak/OIDC payload.
 * Covers: realm_access.roles, resource_access.<client>.roles, flat `roles`,
 * `groups`, and Keycloak's `authorization.permissions[*].scopes`.
 */
export function collectRoleSources(
  payload: Record<string, unknown> | null | undefined,
): ClaimSource[] {
  if (!payload) return [];
  const sources: ClaimSource[] = [];

  const flat = payload["roles"];
  if (Array.isArray(flat)) {
    sources.push({ path: "roles", values: flat.filter((v): v is string => typeof v === "string") });
  }

  const realm = payload["realm_access"] as { roles?: unknown } | undefined;
  if (realm && Array.isArray(realm.roles)) {
    sources.push({
      path: "realm_access.roles",
      values: realm.roles.filter((v): v is string => typeof v === "string"),
    });
  }

  const resource = payload["resource_access"] as
    | Record<string, { roles?: unknown }>
    | undefined;
  if (resource && typeof resource === "object") {
    for (const [client, val] of Object.entries(resource)) {
      if (val && Array.isArray(val.roles)) {
        sources.push({
          path: `resource_access.${client}.roles`,
          values: val.roles.filter((v): v is string => typeof v === "string"),
        });
      }
    }
  }

  const groups = payload["groups"];
  if (Array.isArray(groups)) {
    sources.push({
      path: "groups",
      values: groups
        .filter((v): v is string => typeof v === "string")
        .map((g) => g.replace(/^\/+/, "")),
    });
  }

  return sources;
}

export function buildRoleMappingReport(
  payload: Record<string, unknown> | null | undefined,
): RoleMappingReport {
  const sources = collectRoleSources(payload);
  const rawSet = new Set<string>();
  for (const s of sources) for (const v of s.values) rawSet.add(v);

  const mappedSet = new Set<Role>();
  const unmapped: string[] = [];
  for (const raw of rawSet) {
    const m = tryMap(raw);
    if (m) mappedSet.add(m);
    else unmapped.push(raw);
  }

  const allApp = new Set<Role>(Object.values(ROLES));
  const missing = [...allApp].filter((r) => !mappedSet.has(r));

  return {
    sources,
    rawRoles: [...rawSet].sort(),
    mapped: [...mappedSet].sort(),
    unmapped: unmapped.sort(),
    missing: missing.sort(),
  };
}

/* ------------------------------------------------------------------ */
/* Fix-it suggestions for unmapped claims                              */
/* ------------------------------------------------------------------ */

export interface FixSuggestion {
  /** The unmapped raw claim string. */
  claim: string;
  /** Where this claim was found in the token (e.g. resource_access.foo.roles). */
  source: string;
  /** Closest app role this claim probably refers to (if any). */
  likelyRole: Role | null;
  /** Which Keycloak admin screen to open. */
  mapper:
    | "Realm Roles"
    | "Client Role Mapper"
    | "Group Mapper"
    | "Hardcoded Claim / Role Name Mapper"
    | "Client Scope: roles";
  /** Step-by-step fix the operator can follow. */
  steps: string[];
}

const APP_ROLES = Object.values(ROLES) as Role[];

/** Cheap Levenshtein for short strings — picks the closest app role for a typo'd claim. */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const dp = Array.from({ length: al + 1 }, (_, i) => [i, ...Array(bl).fill(0)]);
  for (let j = 1; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[al][bl];
}

function closestRole(claim: string): Role | null {
  const norm = claim.trim().toLowerCase().replace(/[-\s]/g, "_");
  let best: Role | null = null;
  let bestD = Infinity;
  for (const r of APP_ROLES) {
    const d = distance(norm, r);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  // Only suggest if reasonably close (< 40% of role length).
  return best && bestD <= Math.max(2, Math.floor(best.length * 0.4)) ? best : null;
}

export function buildFixSuggestions(report: RoleMappingReport): FixSuggestion[] {
  const out: FixSuggestion[] = [];
  // Map claim -> first source path that contained it.
  const sourceFor = new Map<string, string>();
  for (const s of report.sources) {
    for (const v of s.values) if (!sourceFor.has(v)) sourceFor.set(v, s.path);
  }

  for (const claim of report.unmapped) {
    const source = sourceFor.get(claim) ?? "unknown";
    const likely = closestRole(claim);

    if (source.startsWith("resource_access.")) {
      const client = source.split(".")[1] ?? "<client>";
      out.push({
        claim,
        source,
        likelyRole: likely,
        mapper: "Client Role Mapper",
        steps: [
          `Open Keycloak → Clients → ${client} → Roles.`,
          likely
            ? `Rename role "${claim}" to "${likely}" so the app maps it directly, OR add an alias to ROLE_ALIASES in src/lib/tokenClaims.ts.`
            : `This client role doesn't match any app role. Either delete it or add a mapping in ROLE_ALIASES.`,
          `Move it to realm-level roles if every client should see it: Clients → ${client} → Client scopes → Dedicated → add a "User Realm Role" mapper.`,
        ],
      });
      continue;
    }

    if (source === "groups") {
      out.push({
        claim,
        source,
        likelyRole: likely,
        mapper: "Group Mapper",
        steps: [
          `Open Keycloak → Client Scopes → roles → Mappers (or your client's Dedicated scope).`,
          `Add a "Group Membership" mapper if missing — token claim name "groups", "Full group path" OFF.`,
          likely
            ? `Either rename the group "${claim}" to "${likely}" in Groups, or assign realm role "${likely}" to that group so it appears in realm_access.roles.`
            : `Map this group to a realm role via Groups → ${claim} → Role mappings → assign one of: ${APP_ROLES.join(", ")}.`,
        ],
      });
      continue;
    }

    if (source === "realm_access.roles") {
      out.push({
        claim,
        source,
        likelyRole: likely,
        mapper: "Realm Roles",
        steps: [
          `Open Keycloak → Realm roles.`,
          likely
            ? `Rename "${claim}" → "${likely}" (Realm roles → ${claim} → Action → Rename), then re-assign to users/groups.`
            : `This realm role isn't recognised. Either delete it or add it to ROLE_ALIASES in src/lib/tokenClaims.ts.`,
          `Verify the client scope "roles" is assigned to your client (Clients → <id> → Client scopes).`,
        ],
      });
      continue;
    }

    if (source === "roles") {
      out.push({
        claim,
        source,
        likelyRole: likely,
        mapper: "Hardcoded Claim / Role Name Mapper",
        steps: [
          `A flat "roles" claim is non-standard for Keycloak — it usually comes from a custom protocol mapper.`,
          `Open Keycloak → Clients → <your client> → Client scopes → Dedicated → Mappers.`,
          `Edit the mapper that emits "roles" and ensure values match: ${APP_ROLES.join(", ")}.`,
          likely ? `Likely intended app role: "${likely}".` : `No close match — remove this claim or extend ROLE_ALIASES.`,
        ],
      });
      continue;
    }

    out.push({
      claim,
      source,
      likelyRole: likely,
      mapper: "Client Scope: roles",
      steps: [
        `Claim "${claim}" came from "${source}" which the app doesn't inspect.`,
        `Move it into realm_access.roles via Keycloak → Client Scopes → roles → Mappers → "realm roles".`,
        likely ? `Likely intended app role: "${likely}".` : `Add a matching ROLE_ALIASES entry if you want to keep this name.`,
      ],
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Console diagnostics                                                 */
/* ------------------------------------------------------------------ */

let lastSignature = "";

/**
 * Log mismatches once per token (deduped by signature) so refresh cycles
 * don't spam the console. Safe to call on every render.
 */
export function logRoleMismatches(report: RoleMappingReport, tokenSig?: string): void {
  const sig = `${tokenSig ?? ""}|${report.mapped.join(",")}|${report.unmapped.join(",")}`;
  if (sig === lastSignature) return;
  lastSignature = sig;

  if (report.rawRoles.length === 0) {
    console.warn(
      "[token-claims] No roles found in token. Check Keycloak client mappers (realm_access.roles).",
    );
    return;
  }
  if (report.unmapped.length > 0) {
    console.warn(
      `[token-claims] ${report.unmapped.length} role claim(s) did not map to app roles:`,
      report.unmapped,
      "→ extend ROLE_ALIASES in src/lib/tokenClaims.ts or rename in Keycloak.",
    );
  }
  console.info(
    `[token-claims] mapped roles: [${report.mapped.join(", ") || "none"}] · sources: ${report.sources
      .map((s) => `${s.path}(${s.values.length})`)
      .join(", ") || "none"}`,
  );
}
