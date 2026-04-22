import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { DevRoleSwitcher } from "@/components/DevRoleSwitcher";
import { TokenClaimsInspector } from "@/components/TokenClaimsInspector";
import { LogOut, LayoutDashboard, Users, FileImage, FileText, Wallet, Plug, Settings, Activity, Search, BarChart3 } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allow: Role[];
}

const NAV: NavItem[] = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, allow: Object.values(ROLES) },
  { to: "/app/search", label: "Search", icon: Search, allow: Object.values(ROLES) },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST, ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE] },
  { to: "/app/approvals", label: "User Approvals", icon: Users, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN] },
  { to: "/app/studies", label: "Studies", icon: FileImage, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST, ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE] },
  { to: "/app/free-pool", label: "Free Pool", icon: Activity, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST] },
  { to: "/app/reports", label: "Reports", icon: FileText, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST] },
  { to: "/app/billing", label: "Billing", icon: Wallet, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST, ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE] },
  { to: "/app/pacs", label: "PACS", icon: Plug, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.PACS] },
  { to: "/app/cms", label: "Landing CMS", icon: Settings, allow: [ROLES.SUPER_ADMIN] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, logout } = useAuth();
  const navigate = useNavigate();

  const items = NAV.filter((n) => n.allow.some((r) => roles.includes(r)));
  const displayRole = roles[0] ? ROLE_LABELS[roles[0]] : "No Role";

  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr] bg-background">
      <aside className="flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="font-display text-lg font-semibold tracking-tight">Aspire</div>
          <div className="text-xs text-sidebar-foreground/70">Reporting Hub</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/app" }}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <DevRoleSwitcher />
          <TokenClaimsInspector />
          <div className="text-sm font-medium truncate">{(user?.profile?.name as string) ?? user?.profile?.preferred_username ?? "Unknown user"}</div>
          <div className="text-xs text-sidebar-foreground/60 mb-3">{displayRole}</div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            onClick={async () => {
              await logout();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex flex-col min-h-screen">{children}</main>
    </div>
  );
}
