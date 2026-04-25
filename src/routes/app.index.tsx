import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Inbox,
  FileImage,
  FileText,
  Users,
  Wallet,
  BarChart3,
  Search,
  Plug,
  Settings,
  Activity,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

interface QuickAction {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  allow: Role[];
  primary?: boolean;
}

const ACTIONS: QuickAction[] = [
  {
    to: "/app/upload",
    label: "Upload Cases",
    description: "Send patient studies for reporting",
    icon: Upload,
    allow: [ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE],
    primary: true,
  },
  {
    to: "/app/fetch-cases",
    label: "Fetch Cases",
    description: "Pull new studies by modality",
    icon: Inbox,
    allow: [ROLES.RADIOLOGIST],
    primary: true,
  },
  {
    to: "/app/studies",
    label: "Studies",
    description: "Browse and open active studies",
    icon: FileImage,
    allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST, ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE],
  },
  {
    to: "/app/reports",
    label: "Reports",
    description: "Drafts, finals and amendments",
    icon: FileText,
    allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST],
  },
  {
    to: "/app/free-pool",
    label: "Free Pool",
    description: "Unassigned studies queue",
    icon: Activity,
    allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN],
  },
  {
    to: "/app/approvals",
    label: "User Approvals",
    description: "Review pending account requests",
    icon: Users,
    allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN],
  },
  {
    to: "/app/billing",
    label: "Billing",
    description: "Invoices, rate cards and payouts",
    icon: Wallet,
    allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST, ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE],
  },
  {
    to: "/app/analytics",
    label: "Analytics",
    description: "Volumes, turnaround and SLAs",
    icon: BarChart3,
    allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.RADIOLOGIST, ROLES.HOSPITAL, ROLES.DIAGNOSTIC_CENTRE],
  },
  {
    to: "/app/search",
    label: "Search",
    description: "Find studies, patients, reports",
    icon: Search,
    allow: Object.values(ROLES),
  },
  {
    to: "/app/pacs",
    label: "PACS",
    description: "Endpoints, ingestion, health",
    icon: Plug,
    allow: [ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN, ROLES.PACS],
  },
  {
    to: "/app/cms",
    label: "Landing CMS",
    description: "Edit public marketing site",
    icon: Settings,
    allow: [ROLES.SUPER_ADMIN],
  },
];

function Overview() {
  const { user, roles } = useAuth();
  const name = (user?.profile?.name as string) ?? user?.profile?.preferred_username ?? "Clinician";
  const actions = ACTIONS.filter((a) => a.allow.some((r) => roles.includes(r)));
  const primary = actions.filter((a) => a.primary);
  const secondary = actions.filter((a) => !a.primary);

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Overview</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Welcome, {name}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Active role: {roles.map((r) => ROLE_LABELS[r]).join(", ") || "None"}
        </p>
      </header>

      {primary.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Quick actions</h2>
          <div className="flex flex-wrap gap-3">
            {primary.map((a) => (
              <Button key={a.to} asChild size="lg" className="h-auto py-3">
                <Link to={a.to}>
                  <a.icon className="h-4 w-4 mr-2" />
                  {a.label}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {[
          { k: "Pending Approvals", v: "—" },
          { k: "Active Studies", v: "—" },
          { k: "Awaiting Reports", v: "—" },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-border bg-card p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{c.k}</div>
            <div className="text-3xl font-display font-bold mt-2">{c.v}</div>
            <div className="text-xs text-muted-foreground mt-1">Live data — wire to backend</div>
          </div>
        ))}
      </div>

      {secondary.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Workspace</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {secondary.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="group rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <a.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{a.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
