import { UserManager, WebStorageStateStore, type UserManagerSettings } from "oidc-client-ts";
import { env } from "./env";

let _manager: UserManager | null = null;

/**
 * True when VITE_OIDC_AUTHORITY is set to a non-empty, non-placeholder value.
 * The default localhost authority counts as "configured" only in dev — in
 * production we treat it as missing so the app can degrade gracefully.
 */
export function isOidcConfigured(): boolean {
  const a = env.oidc.authority?.trim();
  if (!a) return false;
  if (!env.oidc.clientId?.trim()) return false;
  // In production, refuse to bootstrap against localhost — almost certainly unconfigured.
  if (!import.meta.env.DEV && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(a)) return false;
  return true;
}

export function getUserManager(): UserManager {
  if (_manager) return _manager;
  if (!isOidcConfigured()) {
    throw new Error(
      "[oidc] OIDC is not configured. Set VITE_OIDC_AUTHORITY and VITE_OIDC_CLIENT_ID, or enable dev bypass.",
    );
  }
  const settings: UserManagerSettings = {
    authority: env.oidc.authority,
    client_id: env.oidc.clientId,
    redirect_uri: env.oidc.redirectUri,
    post_logout_redirect_uri: env.oidc.postLogoutRedirectUri,
    response_type: "code",
    scope: env.oidc.scope,
    automaticSilentRenew: true,
    loadUserInfo: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  };
  _manager = new UserManager(settings);
  return _manager;
}
