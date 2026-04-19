import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { ROLE_LABELS } from "@/lib/roles";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

function Overview() {
  const { user, roles } = useAuth();
  const name = (user?.profile?.name as string) ?? user?.profile?.preferred_username ?? "Clinician";

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Overview</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Welcome, {name}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Active role: {roles.map((r) => ROLE_LABELS[r]).join(", ") || "None"}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
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

      <div className="mt-8 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        This dashboard is fully API-driven. Data sources, workflow state, and billing all populate from your backend services as they come online.
      </div>
    </div>
  );
}
