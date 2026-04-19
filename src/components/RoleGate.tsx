import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import type { Role } from "@/lib/roles";

export function RoleGate({ allow, children, fallback = null }: { allow: Role[]; children: ReactNode; fallback?: ReactNode }) {
  const { roles } = useAuth();
  const ok = roles.some((r) => allow.includes(r));
  return <>{ok ? children : fallback}</>;
}
