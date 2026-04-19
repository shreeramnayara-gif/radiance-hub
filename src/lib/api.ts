import { env } from "./env";
import { getUserManager } from "./oidc";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  try {
    const user = await getUserManager().getUser();
    if (user?.access_token) return { Authorization: `Bearer ${user.access_token}` };
  } catch {
    /* unauthenticated */
  }
  return {};
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(await authHeader()),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${env.api.baseUrl}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
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
