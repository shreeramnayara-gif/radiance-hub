import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/lib/services";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HBar } from "./Primitives";

export function RadiologistsAnalyticsView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "radiologists"],
    queryFn: () => analyticsService.radiologists(),
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading radiologist analytics…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground">No radiologist data available.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Radiologist</TableHead>
              <TableHead className="text-right">In progress</TableHead>
              <TableHead className="text-right">Submitted 24 h</TableHead>
              <TableHead className="text-right">Finalized 24 h</TableHead>
              <TableHead className="text-right">Finalized 30 d</TableHead>
              <TableHead className="text-right">Avg report</TableHead>
              <TableHead>Modality mix</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => {
              const max = Math.max(...r.byModality.map((m) => m.count), 1);
              return (
                <TableRow key={r.radiologistId}>
                  <TableCell className="font-medium">{r.radiologistName}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.inProgress}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.submitted24h}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.finalized24h}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.finalized30d}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.avgReportingMinutes > 0 ? `${Math.round(r.avgReportingMinutes)} min` : "—"}
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    <div className="space-y-1.5">
                      {r.byModality.slice(0, 3).map((m) => (
                        <HBar key={m.modality} label={m.modality} value={m.count} max={max} />
                      ))}
                      {r.byModality.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
