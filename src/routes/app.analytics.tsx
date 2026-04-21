import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";
import { SystemAnalyticsView } from "@/components/analytics/SystemAnalyticsView";
import { RadiologistsAnalyticsView } from "@/components/analytics/RadiologistsAnalyticsView";
import { HospitalsAnalyticsView } from "@/components/analytics/HospitalsAnalyticsView";
import { BillingAnalyticsView } from "@/components/analytics/BillingAnalyticsView";

export const Route = createFileRoute("/app/analytics")({ component: AnalyticsPage });

type TabKey = "system" | "radiologists" | "hospitals" | "billing";

function AnalyticsPage() {
  const { roles } = useAuth();
  const isSuperAdmin = roles.includes(ROLES.SUPER_ADMIN);
  const isSubAdmin = roles.includes(ROLES.SUB_ADMIN);
  const isRad = roles.includes(ROLES.RADIOLOGIST);
  const isClient = roles.includes(ROLES.HOSPITAL) || roles.includes(ROLES.DIAGNOSTIC_CENTRE);

  const tabs: Array<{ key: TabKey; label: string; show: boolean }> = ([
    { key: "system" as TabKey, label: "System", show: isSuperAdmin || isSubAdmin },
    { key: "radiologists" as TabKey, label: "Radiologists", show: isSuperAdmin || isSubAdmin || isRad },
    { key: "hospitals" as TabKey, label: isClient ? "My uploads" : "Hospitals", show: isSuperAdmin || isSubAdmin || isClient },
    { key: "billing" as TabKey, label: "Billing", show: isSuperAdmin },
  ]).filter((t) => t.show);

  const [active, setActive] = useState<TabKey>(tabs[0]?.key ?? "radiologists");

  if (tabs.length === 0) {
    return (
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-display font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-2">No analytics surfaces are available for your role.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Insights</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Analytics</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Role-scoped KPIs. The backend enforces visibility — you only see what your role permits.
        </p>
      </header>

      <div className="flex gap-2 mb-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              active === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "system" && <SystemAnalyticsView />}
      {active === "radiologists" && <RadiologistsAnalyticsView />}
      {active === "hospitals" && <HospitalsAnalyticsView />}
      {active === "billing" && <BillingAnalyticsView />}
    </div>
  );
}
