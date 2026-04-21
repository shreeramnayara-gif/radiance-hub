import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pacsService } from "@/lib/services";
import type { SyncLogLevel } from "@/lib/pacs";
import { LogLevelPill } from "./StatusPill";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export function SyncLogsView() {
  const [level, setLevel] = useState<SyncLogLevel | "all">("all");
  const [endpointId, setEndpointId] = useState<string>("all");

  const endpoints = useQuery({
    queryKey: ["pacs", "endpoints"],
    queryFn: () => pacsService.listEndpoints(),
  });

  const logs = useQuery({
    queryKey: ["pacs", "logs", level, endpointId],
    queryFn: () =>
      pacsService.listLogs({
        level: level === "all" ? undefined : [level],
        endpointId: endpointId === "all" ? undefined : endpointId,
        pageSize: 200,
      }),
    refetchInterval: 20000,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-semibold tracking-tight">Sync logs</h2>
        <p className="text-sm text-muted-foreground">Protocol-level events from the PACS workers (C-FIND, QIDO, polling, auth).</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={endpointId} onValueChange={setEndpointId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All endpoints" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All endpoints</SelectItem>
            {endpoints.data?.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={(v) => setLevel(v as typeof level)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All levels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Time</TableHead>
              <TableHead className="w-24">Level</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead className="w-24">Op</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-24 text-right">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Loading…</TableCell></TableRow>
            )}
            {logs.error && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-destructive py-8">{(logs.error as Error).message}</TableCell></TableRow>
            )}
            {logs.data?.items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No log entries.</TableCell></TableRow>
            )}
            {logs.data?.items.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(l.createdAt)}</TableCell>
                <TableCell><LogLevelPill level={l.level} /></TableCell>
                <TableCell className="text-sm">{l.endpointName}</TableCell>
                <TableCell className="font-mono text-xs">{l.op ?? "—"}</TableCell>
                <TableCell className="text-sm">{l.message}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{l.durationMs ? `${l.durationMs} ms` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
