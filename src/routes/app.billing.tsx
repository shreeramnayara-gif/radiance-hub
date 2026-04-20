import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";

export const Route = createFileRoute("/app/billing")({ component: BillingLayout });

function BillingLayout() {
  const { roles } = useAuth();
  const isAdmin = roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.SUB_ADMIN);
  const isRad = roles.includes(ROLES.RADIOLOGIST);
  const isClient = roles.includes(ROLES.HOSPITAL) || roles.includes(ROLES.DIAGNOSTIC_CENTRE);
  const path = useLocation({ select: (l) => l.pathname });

  const tabs: Array<{ to: string; label: string; show: boolean }> = [
    { to: "/app/billing", label: "Overview", show: true },
    { to: "/app/billing/rate-cards", label: "Rate Cards", show: isAdmin },
    { to: "/app/billing/payouts", label: "Payouts", show: isAdmin || isRad },
    { to: "/app/billing/invoices", label: "Invoices", show: isAdmin || isClient },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Finance</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Billing</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Per-user rate cards. Lines are generated automatically when a report is <strong>SUBMITTED</strong> and locked at <strong>FINALIZED</strong>.
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
