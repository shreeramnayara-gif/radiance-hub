import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Clock, FileImage, Inbox } from "lucide-react";
import { analyticsService } from "@/lib/services";
import { WORKFLOW_LABELS } from "@/lib/workflow";
import { HBar, Sparkline, StatCard } from "./Primitives";

export function SystemAnalyticsView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "system"],
    queryFn: () => analyticsService.system(),
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading system analytics…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  const tat = data.avgTatHours;
  const tatLabel = tat < 1 ? `${Math.round(tat * 60)} min` : `${tat.toFixed(1)} h`;
  const maxStatus = Math.max(...data.byStatus.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total studies" value={data.totalStudies} icon={FileImage} />
        <StatCard label="Free Pool" value={data.freePool} icon={Inbox} tone="muted" />
        <StatCard label="In reporting" value={data.inReporting} icon={Activity} />
        <StatCard label="Submitted" value={data.submitted} icon={CheckCircle2} tone="ok" />
        <StatCard label="Avg TAT" value={tatLabel} icon={Clock} hint="Creation → Finalized" />
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-display font-semibold">Daily volume</h3>
            <span className="text-xs text-muted-foreground">Last {data.dailyVolume.length} days</span>
          </div>
          <Sparkline values={data.dailyVolume.map((d) => d.count)} height={120} />
          <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
            {data.dailyVolume.length > 0 && <span>{data.dailyVolume[0].date}</span>}
            {data.dailyVolume.length > 0 && <span>{data.dailyVolume[data.dailyVolume.length - 1].date}</span>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-display font-semibold mb-3">By status</h3>
          <div className="space-y-3">
            {data.byStatus.map((s) => (
              <HBar key={s.status} label={WORKFLOW_LABELS[s.status]} value={s.count} max={maxStatus} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
