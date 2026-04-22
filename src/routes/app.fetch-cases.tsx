import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studiesService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";
import { StudyTable } from "@/components/workflow/StudyTable";
import { ModalityFilter } from "@/components/workflow/ModalityFilter";
import { Button } from "@/components/ui/button";
import { Loader2, HandIcon, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/app/fetch-cases")({ component: FetchCasesPage });

function FetchCasesPage() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const isRad = roles.includes(ROLES.RADIOLOGIST);
  const [modality, setModality] = useState<string[]>([]);

  const queryKey = useMemo(() => ["fetch-cases", modality], [modality]);
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () => studiesService.freePool(modality.length ? modality : undefined),
    enabled: isRad && modality.length > 0,
    refetchInterval: modality.length > 0 ? 20_000 : false,
  });

  const claim = useMutation({
    mutationFn: (id: string) => studiesService.claim(id),
    onSuccess: () => {
      toast.success("Case claimed — added to your worklist");
      qc.invalidateQueries({ queryKey: ["fetch-cases"] });
      qc.invalidateQueries({ queryKey: ["studies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isRad) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="rounded-xl border border-border bg-card p-6 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h2 className="font-display text-lg font-semibold">Radiologists only</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This workspace is reserved for radiologists to fetch cases by modality.
            </p>
            <Link to="/app" className="text-sm text-primary underline-offset-4 hover:underline mt-3 inline-block">
              Back to overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Workflow</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Fetch Cases</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Select one or more modalities matching your specialty to pull unassigned cases. Claim a case to add it to your worklist.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
        <ModalityFilter selected={modality} onChange={setModality} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching || modality.length === 0}
        >
          {isFetching ? "Fetching…" : "Refresh"}
        </Button>
      </div>

      {modality.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Pick at least one modality above to fetch matching cases.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching cases…
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-4 text-sm">
          Failed to fetch cases: {(error as Error).message}.
        </div>
      )}

      {data && (
        <StudyTable
          studies={data.items}
          roles={roles}
          emptyHint="No matching cases right now. Try a different modality or refresh shortly."
          renderActions={(s) => (
            <div className="flex justify-end gap-2">
              <Button size="sm" disabled={claim.isPending} onClick={() => claim.mutate(s.id)}>
                <HandIcon className="h-4 w-4 mr-1" /> Claim
              </Button>
            </div>
          )}
        />
      )}
    </div>
  );
}
