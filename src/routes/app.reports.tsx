import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/app/reports")({ component: () => (
  <div className="p-8 max-w-3xl">
    <h1 className="text-3xl font-display font-bold tracking-tight">Reports</h1>
    <p className="text-sm text-muted-foreground mt-2">Versioned reports, signature-bound, audit-logged. Implemented in the workflow slice.</p>
    <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">Module pending implementation.</div>
  </div>
)});
