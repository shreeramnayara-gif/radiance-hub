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

/** Extract roles from a Keycloak/OIDC token's claims. Supports realm_access and a flat `roles` claim. */
export function extractRoles(profile: Record<string, unknown> | undefined | null): Role[] {
  if (!profile) return [];
  const known = new Set<string>(Object.values(ROLES));
  const out = new Set<Role>();

  const flat = profile["roles"];
  if (Array.isArray(flat)) {
    for (const r of flat) if (typeof r === "string" && known.has(r)) out.add(r as Role);
  }

  const realmAccess = profile["realm_access"] as { roles?: unknown } | undefined;
  if (realmAccess && Array.isArray(realmAccess.roles)) {
    for (const r of realmAccess.roles) if (typeof r === "string" && known.has(r)) out.add(r as Role);
  }
  return Array.from(out);
}
