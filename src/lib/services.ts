import { apiFetch } from "./api";
import type { AppUser, LandingCms, UserStatus } from "./types";

export const usersService = {
  list: (params?: { status?: UserStatus }) => {
    const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
    return apiFetch<AppUser[]>(`/users${q}`);
  },
  approve: (id: string) => apiFetch<AppUser>(`/users/${id}/approve`, { method: "POST" }),
  reject: (id: string, reason: string) =>
    apiFetch<AppUser>(`/users/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  suspend: (id: string) => apiFetch<AppUser>(`/users/${id}/suspend`, { method: "POST" }),
};

export const cmsService = {
  getLanding: () => apiFetch<LandingCms>("/cms/landing"),
  saveLanding: (cms: Partial<LandingCms>) =>
    apiFetch<LandingCms>("/cms/landing", { method: "PUT", body: JSON.stringify(cms) }),
};
