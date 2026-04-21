import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pacsService } from "@/lib/services";
import { INGESTION_STATUS_LABELS, type IngestionEventStatus } from "@/lib/pacs";
import { IngestionStatusPill } from "./StatusPill";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export function IngestionMonitor() {
  const [status, setStatus] = useState<IngestionEventStatus | "all">("all");
  const [endpointId, setEndpointId] = useState<string>("all");
  const [q, setQ] = useState("");

  const endpoints = useQuery({
    queryKey: ["pacs", "endpoints"],
    queryFn: () => pacsService.listEndpoints(),
  });

  const events = useQuery({
    queryKey: ["pacs", "ingestion", status, endpointId, q],
    queryFn: () =>
      pacsService.listIngestion({
        status: status === "all" ? undefined : [status],
        endpointId: endpointId === "all" ? undefined : endpointId,
        q: q.trim() || undefined,
        pageSize: 100,
      }),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-semibold tracking-tight">Ingestion monitor</h2>
        <p className="text-sm text-muted-foreground">Live feed of studies arriving from configured PACS sources. Refreshes every 15 s.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by Study UID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Select value={endpointId} onValueChange={setEndpointId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All endpoints" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All endpoints</SelectItem>
            {endpoints.data?.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(INGESTION_STATUS_LABELS) as IngestionEventStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{INGESTION_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Received</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Study UID</TableHead>
              <TableHead>Modality</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {events.error && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-destructive py-8">{(events.error as Error).message}</TableCell></TableRow>
            )}
            {events.data?.items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No ingestion events match your filters.</TableCell></TableRow>
            )}
            {events.data?.items.map((ev) => (
              <TableRow key={ev.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(ev.receivedAt)}</TableCell>
                <TableCell className="text-sm">{ev.endpointName}</TableCell>
                <TableCell className="font-mono text-xs max-w-[260px] truncate" title={ev.studyInstanceUID}>{ev.studyInstanceUID}</TableCell>
                <TableCell className="text-sm">{ev.modality ?? "—"}</TableCell>
                <TableCell><IngestionStatusPill status={ev.status} /></TableCell>
                <TableCell className="text-sm">
                  {ev.studyId ? (
                    <Link to="/app/studies/$studyId" params={{ studyId: ev.studyId }} className="text-primary hover:underline">
                      Open study
                    </Link>
                  ) : ev.errorMessage ? (
                    <span className="text-destructive text-xs">{ev.errorMessage}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
