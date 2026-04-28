import { Link } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES, type Role } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Inbox,
  FileImage,
  FileText,
  Users,
  BarChart3,
  Activity,
  Wallet,
  Search,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  to: string;
  label: string;
  icon: LucideIcon;
  allow: Role[];
}

const ALL_ACTIONS: QuickAction[] = [
  { to: "/app/upload", label: "Upload Cases", icon: Upload, allow: [ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE] },
  { to: "/app/fetch-cases", label: "Fetch Cases", icon: Inbox, allow: [ROLES.RADIOLOGIST] },
  { to: "/app/studies", label: "Studies", icon: FileImage, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST, ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE] },
  { to: "/app/reports", label: "Reports", icon: FileText, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST] },
  { to: "/app/approvals", label: "Approvals", icon: Users, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN] },
  { to: "/app/free-pool", label: "Free Pool", icon: Activity, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN] },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST, ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE] },
  { to: "/app/billing", label: "Billing", icon: Wallet, allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST, ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE] },
  { to: "/app/search", label: "Search", icon: Search, allow: Object.values(ROLES) },
];

interface QuickActionsProps {
  /** Hide the action that points to the current page (pass current route's `to`). */
  exclude?: string;
  className?: string;
}

export function QuickActions({ exclude, className }: QuickActionsProps) {
  const { roles } = useAuth();
  const items = ALL_ACTIONS.filter(
    (a) => a.to !== exclude && a.allow.some((r) => roles.includes(r)),
  );
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      {items.map((a) => (
        <Button key={a.to} asChild size="sm" variant="outline">
          <Link to={a.to}>
            <a.icon className="h-4 w-4 mr-2" />
            {a.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
