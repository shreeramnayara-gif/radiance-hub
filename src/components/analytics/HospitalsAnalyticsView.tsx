import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/lib/services";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HBar } from "./Primitives";

export function HospitalsAnalyticsView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "hospitals"],
    queryFn: () => analyticsService.hospitals(),
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading hospital analytics…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground">No hospital/centre data available.</div>;
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Uploaded 24 h</TableHead>
            <TableHead className="text-right">Uploaded 30 d</TableHead>
            <TableHead className="text-right">Awaiting report</TableHead>
            <TableHead className="text-right">Finalized 30 d</TableHead>
            <TableHead className="text-right">Avg TAT</TableHead>
            <TableHead>Modality mix</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((h) => {
            const max = Math.max(...h.byModality.map((m) => m.count), 1);
            return (
              <TableRow key={h.hospitalId}>
                <TableCell className="font-medium">{h.hospitalName}</TableCell>
                <TableCell className="text-right tabular-nums">{h.uploaded24h}</TableCell>
                <TableCell className="text-right tabular-nums">{h.uploaded30d}</TableCell>
                <TableCell className="text-right tabular-nums">{h.awaitingReport}</TableCell>
                <TableCell className="text-right tabular-nums">{h.finalized30d}</TableCell>
                <TableCell className="text-right tabular-nums">{h.avgTatHours.toFixed(1)} h</TableCell>
                <TableCell className="min-w-[180px]">
                  <div className="space-y-1.5">
                    {h.byModality.slice(0, 3).map((m) => (
                      <HBar key={m.modality} label={m.modality} value={m.count} max={max} />
                    ))}
                    {h.byModality.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
