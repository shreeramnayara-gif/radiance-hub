import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/studies")({ component: () => <Stub title="Studies" hint="Coming next slice: live Orthanc /studies feed with modality and date filters." /> });

function Stub({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-display font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground mt-2">{hint}</p>
      <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">Module pending implementation.</div>
    </div>
  );
}
