import { env } from "./env";
import { getUserManager } from "./oidc";
import { isOidcConfigured } from "./oidc";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

/**
 * Returns a fresh Bearer header. If the access token is expired (or about to
 * expire) and OIDC is configured, attempts a silent renewal first to avoid the
 * race where every request 401s during the refresh window.
 */
async function authHeader(forceRenew = false): Promise<Record<string, string>> {
  if (!isOidcConfigured()) return {};
  try {
    const mgr = getUserManager();
    let user = await mgr.getUser();

    const isExpired = !user || user.expired || (user.expires_in ?? 0) <= 5;
    if ((forceRenew || isExpired) && user) {
      try {
        const renewed = await mgr.signinSilent();
        if (renewed?.access_token) user = renewed;
      } catch {
        /* fall through — request will likely 401 and trigger retry */
      }
    }
    if (user?.access_token) return { Authorization: `Bearer ${user.access_token}` };
  } catch {
    /* unauthenticated */
  }
  return {};
}

async function doFetch<T>(path: string, init: RequestInit, forceRenew: boolean): Promise<{ res: Response; body: unknown }> {
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    Accept: "application/json",
    ...(await authHeader(forceRenew)),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${env.api.baseUrl}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  return { res, body };
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let { res, body } = await doFetch<T>(path, init, false);

  // Single retry cycle on 401: force a silent renewal then replay once.
  if (res.status === 401 && isOidcConfigured()) {
    const retry = await doFetch<T>(path, init, true);
    res = retry.res;
    body = retry.body;
  }

  if (!res.ok) {
    throw new ApiError(res.status, (body as { message?: string })?.message ?? res.statusText, body);
  }
  return body as T;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
