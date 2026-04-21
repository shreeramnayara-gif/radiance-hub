import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Pencil, Plug, Power, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pacsService } from "@/lib/services";
import { PACS_PROTOCOL_LABELS, type PacsEndpoint } from "@/lib/pacs";
import { EndpointStatusPill } from "./StatusPill";
import { EndpointEditor } from "./EndpointEditor";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export function EndpointsTable() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PacsEndpoint | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pacs", "endpoints"],
    queryFn: () => pacsService.listEndpoints(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["pacs", "endpoints"] });
    qc.invalidateQueries({ queryKey: ["pacs", "health"] });
  };

  const test = useMutation({
    mutationFn: (id: string) => pacsService.testEndpoint(id),
    onSuccess: (r) => {
      if (r.ok) toast.success(`Reachable${r.latencyMs ? ` (${r.latencyMs} ms)` : ""}`);
      else toast.error(r.message ?? "Endpoint unreachable");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sync = useMutation({
    mutationFn: (id: string) => pacsService.syncEndpoint(id),
    onSuccess: () => { toast.success("Sync queued"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (e: PacsEndpoint) =>
      e.status === "disabled" ? pacsService.enableEndpoint(e.id) : pacsService.disableEndpoint(e.id),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => pacsService.deleteEndpoint(id),
    onSuccess: () => { toast.success("Endpoint deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-semibold tracking-tight">Endpoints</h2>
          <p className="text-sm text-muted-foreground">External imaging sources the backend pulls from or accepts pushes from.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plug className="h-4 w-4 mr-2" /> New endpoint</Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sync</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {error && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-destructive py-8">{(error as Error).message}</TableCell></TableRow>
            )}
            {data?.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                No endpoints configured yet.
              </TableCell></TableRow>
            )}
            {data?.map((ep) => (
              <TableRow key={ep.id}>
                <TableCell>
                  <div className="font-medium">{ep.name}</div>
                  {ep.sourceLabel && <div className="text-xs text-muted-foreground">{ep.sourceLabel}</div>}
                </TableCell>
                <TableCell className="text-sm">{PACS_PROTOCOL_LABELS[ep.protocol]}</TableCell>
                <TableCell className="text-sm font-mono">
                  {ep.host}{ep.port ? `:${ep.port}` : ""}
                  {ep.aeTitle && <span className="text-muted-foreground"> · {ep.aeTitle}</span>}
                </TableCell>
                <TableCell>
                  <EndpointStatusPill status={ep.status} />
                  {ep.lastErrorMessage && (
                    <div className="text-xs text-destructive mt-1 max-w-[220px] truncate" title={ep.lastErrorMessage}>
                      {ep.lastErrorMessage}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(ep.lastSyncAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" title="Test connection" onClick={() => test.mutate(ep.id)} disabled={test.isPending}>
                      <Activity className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Sync now" onClick={() => sync.mutate(ep.id)} disabled={sync.isPending || ep.status === "disabled"}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title={ep.status === "disabled" ? "Enable" : "Disable"} onClick={() => toggle.mutate(ep)}>
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing(ep)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Delete" onClick={() => {
                      if (confirm(`Delete endpoint "${ep.name}"?`)) remove.mutate(ep.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EndpointEditor open={creating} onOpenChange={setCreating} />
      <EndpointEditor open={!!editing} onOpenChange={(v) => !v && setEditing(null)} endpoint={editing} />
    </div>
  );
}
