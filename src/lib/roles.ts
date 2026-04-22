export const ROLES = {
  SUPER_ADMIN: "super_admin",
  SUB_ADMIN: "sub_admin",
  RADIOLOGIST: "radiologist",
  DIAGNOSTIC_CENTRE: "diagnostic_centre",
  HOSPITAL: "hospital",
  PACS: "pacs",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  sub_admin: "Sub Admin",
  radiologist: "Radiologist",
  diagnostic_centre: "Diagnostic Centre",
  hospital: "Hospital",
  pacs: "PACS Integration",
};

/**
 * Extract roles from a Keycloak/OIDC token's claims. Covers realm_access.roles,
 * resource_access.<client>.roles, a flat `roles` claim, and `groups` (with
 * leading `/` stripped). For richer diagnostics see `src/lib/tokenClaims.ts`.
 */
export function extractRoles(profile: Record<string, unknown> | undefined | null): Role[] {
  if (!profile) return [];
  const known = new Set<string>(Object.values(ROLES));
  const out = new Set<Role>();

  const push = (v: unknown) => {
    if (typeof v !== "string") return;
    const s = v.trim().toLowerCase().replace(/^\/+/, "");
    if (known.has(s)) out.add(s as Role);
    const snake = s.replace(/-/g, "_");
    if (known.has(snake)) out.add(snake as Role);
  };

  const flat = profile["roles"];
  if (Array.isArray(flat)) flat.forEach(push);

  const realm = profile["realm_access"] as { roles?: unknown } | undefined;
  if (realm && Array.isArray(realm.roles)) realm.roles.forEach(push);

  const resource = profile["resource_access"] as Record<string, { roles?: unknown }> | undefined;
  if (resource && typeof resource === "object") {
    for (const v of Object.values(resource)) {
      if (v && Array.isArray(v.roles)) v.roles.forEach(push);
    }
  }

  const groups = profile["groups"];
  if (Array.isArray(groups)) groups.forEach(push);

  return Array.from(out);
}
