import { createFileRoute } from "@tanstack/react-router";
import { QuickActions } from "@/components/QuickActions";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Workflow</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Reports</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Versioned reports, signature-bound, audit-logged. Implemented in the workflow slice.
        </p>
        <QuickActions exclude="/app/reports" className="mt-4" />
      </header>
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        Module pending implementation.
      </div>
    </div>
  );
}
