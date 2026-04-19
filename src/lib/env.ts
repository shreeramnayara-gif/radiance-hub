/**
 * Environment configuration. Set these in your build environment / Lovable secrets.
 * No secrets are committed; placeholders point to the openidc-ohif-orthanc reference defaults.
 */
export const env = {
  oidc: {
    authority: import.meta.env.VITE_OIDC_AUTHORITY ?? "http://localhost:8080/realms/aspire",
    clientId: import.meta.env.VITE_OIDC_CLIENT_ID ?? "aspire-frontend",
    redirectUri:
      import.meta.env.VITE_OIDC_REDIRECT_URI ??
      (typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : ""),
    postLogoutRedirectUri:
      import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI ??
      (typeof window !== "undefined" ? window.location.origin : ""),
    scope: import.meta.env.VITE_OIDC_SCOPE ?? "openid profile email roles",
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api",
  },
  orthanc: {
    baseUrl: import.meta.env.VITE_ORTHANC_BASE_URL ?? "",
  },
  ohif: {
    viewerUrl: import.meta.env.VITE_OHIF_VIEWER_URL ?? "",
  },
  /**
   * DEV-ONLY: bypasses OIDC and assumes a mock Super Admin session.
   * Hard-gated to import.meta.env.DEV so production builds always see `false`,
   * even if VITE_DEV_MODE were somehow set during a prod build.
   */
  devMode: import.meta.env.DEV && import.meta.env.VITE_DEV_MODE === "true",
} as const;
