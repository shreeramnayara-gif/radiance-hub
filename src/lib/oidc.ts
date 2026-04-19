import { UserManager, WebStorageStateStore, type UserManagerSettings } from "oidc-client-ts";
import { env } from "./env";

let _manager: UserManager | null = null;

export function getUserManager(): UserManager {
  if (_manager) return _manager;
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
