import type { Role } from "./roles";

export type UserStatus = "pending" | "approved" | "rejected" | "suspended";

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  organization?: string | null;
  roles: Role[];
  status: UserStatus;
  createdAt: string;
  certificatesStatus?: "pending" | "verified" | "rejected" | "expired" | "none";
}

export interface LandingCms {
  brand: { name: string; tagline: string };
  hero: { headline: string; subheadline: string; ctaLabel: string; ctaHref: string };
  nav: Array<{ label: string; href: string }>;
  contact: { email: string; phone?: string; address?: string };
  footer: { copyright: string; links: Array<{ label: string; href: string }> };
  theme?: { primary?: string };
  version: number;
  updatedAt: string;
}
