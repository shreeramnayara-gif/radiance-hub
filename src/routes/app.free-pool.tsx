import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studiesService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";
import { StudyTable } from "@/components/workflow/StudyTable";
import { ModalityFilter } from "@/components/workflow/ModalityFilter";
import { AssignDialog } from "@/components/workflow/AssignDialog";
import { Button } from "@/components/ui/button";
import { Loader2, HandIcon, UserPlus } from "lucide-react";

export const Route = createFileRoute("/app/free-pool")({ component: FreePoolPage });

function FreePoolPage() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const isRad = roles.includes(ROLES.RADIOLOGIST);
  const isAdmin = roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.SUB_ADMIN);
  const [modality, setModality] = useState<string[]>([]);

  const queryKey = useMemo(() => ["free-pool", modality], [modality]);
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () => studiesService.freePool(modality.length ? modality : undefined),
    refetchInterval: 20_000,
  });

  const claim = useMutation({
    mutationFn: (id: string) => studiesService.claim(id),
    onSuccess: () => { toast.success("Study claimed"); qc.invalidateQueries({ queryKey: ["free-pool"] }); qc.invalidateQueries({ queryKey: ["studies"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const assign = useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string }) => studiesService.assign(id, assigneeId),
    onSuccess: () => { toast.success("Study assigned"); qc.invalidateQueries({ queryKey: ["free-pool"] }); qc.invalidateQueries({ queryKey: ["studies"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Workflow</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Free Pool</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Unassigned studies awaiting a radiologist.{" "}
          {isRad ? "Filter by modality and claim what matches your specialty." : "Assign to an approved radiologist."}
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4 mb-4 flex items-center justify-between gap-4 flex-wrap">
        <ModalityFilter selected={modality} onChange={setModality} />
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading free pool…</div>}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-4 text-sm">
          Failed to load free pool: {(error as Error).message}.
        </div>
      )}

      {data && (
        <StudyTable
          studies={data.items}
          roles={roles}
          emptyHint="The free pool is empty for the selected filters."
          renderActions={(s) => (
            <div className="flex justify-end gap-2">
              {isRad && (
                <Button size="sm" disabled={claim.isPending} onClick={() => claim.mutate(s.id)}>
                  <HandIcon className="h-4 w-4 mr-1" /> Claim
                </Button>
              )}
              {isAdmin && (
                <AssignDialog
                  trigger={<Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Assign</Button>}
                  pending={assign.isPending}
                  onAssign={(assigneeId) => assign.mutate({ id: s.id, assigneeId })}
                />
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
