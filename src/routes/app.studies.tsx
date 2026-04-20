import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { studiesService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";
import { StudyTable } from "@/components/workflow/StudyTable";
import { ModalityFilter } from "@/components/workflow/ModalityFilter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WORKFLOW_LABELS, type WorkflowStatus, WORKFLOW_STATUS } from "@/lib/workflow";
import { Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/app/studies")({ component: StudiesPage });

const STATUS_OPTIONS: WorkflowStatus[] = Object.values(WORKFLOW_STATUS);

function StudiesPage() {
  const { roles } = useAuth();
  const [modality, setModality] = useState<string[]>([]);
  const [status, setStatus] = useState<WorkflowStatus[]>([]);
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(roles.includes(ROLES.RADIOLOGIST));

  const query = useMemo(
    () => ({
      modality: modality.length ? modality : undefined,
      status: status.length ? status : undefined,
      q: q.trim() || undefined,
      mine: mine || undefined,
      pageSize: 100,
    }),
    [modality, status, q, mine],
  );

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["studies", query],
    queryFn: () => studiesService.list(query),
    refetchInterval: 30_000,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Workflow</p>
          <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Studies</h1>
          <p className="text-muted-foreground mt-2 text-sm">Live feed from PACS. Filter, search, and open the reporting workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/free-pool" className="text-sm text-primary underline-offset-4 hover:underline">Free Pool →</Link>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search StudyUID, accession, patient ID…"
              className="pl-9"
            />
          </div>
          {roles.includes(ROLES.RADIOLOGIST) && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
              Assigned to me
            </label>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <ModalityFilter selected={modality} onChange={setModality} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Status</span>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                className={`text-xs px-2.5 py-1 rounded-md border transition ${
                  status.includes(s)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {WORKFLOW_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading studies…
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-4 text-sm">
          Failed to load studies: {(error as Error).message}. Verify <code>VITE_API_BASE_URL</code> and that the backend exposes <code>GET /studies</code>.
        </div>
      )}
      {data && (
        <>
          <div className="text-xs text-muted-foreground mb-2">{data.total} result{data.total === 1 ? "" : "s"}</div>
          <StudyTable studies={data.items} roles={roles} renderActions={(s) => (
            <Link to="/app/studies/$studyId" params={{ studyId: s.id }} className="text-sm text-primary hover:underline">Open →</Link>
          )} />
        </>
      )}
    </div>
  );
}
