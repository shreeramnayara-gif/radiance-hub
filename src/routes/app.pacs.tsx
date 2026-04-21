import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";

export const Route = createFileRoute("/app/pacs")({ component: PacsLayout });

function PacsLayout() {
  const { roles } = useAuth();
  const canEdit = roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.PACS);
  const canMonitor = canEdit || roles.includes(ROLES.SUB_ADMIN);
  const path = useLocation({ select: (l) => l.pathname });

  if (!canMonitor) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-display font-bold tracking-tight">PACS Integration</h1>
        <p className="text-sm text-muted-foreground mt-2">You don't have access to this module.</p>
      </div>
    );
  }

  const tabs: Array<{ to: string; label: string; show: boolean }> = [
    { to: "/app/pacs", label: "Health", show: true },
    { to: "/app/pacs/endpoints", label: "Endpoints", show: canEdit },
    { to: "/app/pacs/ingestion", label: "Ingestion", show: true },
    { to: "/app/pacs/logs", label: "Sync logs", show: true },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Integration</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">PACS</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Configure imaging sources, monitor live ingestion, and inspect protocol-level sync logs.
          PHI is anonymized server-side before any radiologist sees it.
        </p>
      </header>

      <div className="flex gap-2 mb-6 border-b border-border">
        {tabs.filter((t) => t.show).map((t) => {
          const active = path === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
