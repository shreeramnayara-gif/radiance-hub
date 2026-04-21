import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, PauseCircle, Plug } from "lucide-react";
import { pacsService } from "@/lib/services";
import { EndpointStatusPill } from "./StatusPill";
import type { PacsEndpointHealth } from "@/lib/pacs";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function Spark({ values }: { values?: number[] }) {
  if (!values?.length) return <div className="h-8 text-xs text-muted-foreground">—</div>;
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-1.5 bg-primary/70 rounded-sm"
          style={{ height: `${(v / max) * 100}%` }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: "ok" | "warn" | "muted";
}) {
  const toneClass = tone === "ok"
    ? "text-emerald-400"
    : tone === "warn"
    ? "text-destructive"
    : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`text-3xl font-display font-bold mt-2 ${toneClass}`}>{value}</div>
    </div>
  );
}

export function HealthDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["pacs", "health"],
    queryFn: () => pacsService.health(),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading health…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Plug} label="Endpoints" value={data.totalEndpoints} />
        <StatCard icon={CheckCircle2} label="Active" value={data.active} tone="ok" />
        <StatCard icon={AlertTriangle} label="Errored" value={data.errored} tone={data.errored > 0 ? "warn" : "muted"} />
        <StatCard icon={PauseCircle} label="Disabled" value={data.disabled} tone="muted" />
        <StatCard icon={CheckCircle2} label="Ingested 24 h" value={data.ingested24h} tone="ok" />
      </div>

      <div>
        <h2 className="text-lg font-display font-semibold tracking-tight mb-3">Per-endpoint health</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {data.endpoints.map((h) => <EndpointHealthCard key={h.endpointId} h={h} />)}
          {data.endpoints.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground md:col-span-2">
              No endpoints to report on yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EndpointHealthCard({ h }: { h: PacsEndpointHealth }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{h.endpointName}</div>
          <div className="text-xs text-muted-foreground">
            {h.reachable ? "Reachable" : "Unreachable"}
            {h.latencyMs != null && h.reachable && ` · ${h.latencyMs} ms`}
          </div>
        </div>
        <EndpointStatusPill status={h.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Ingested 24 h</div>
          <div className="text-xl font-semibold text-emerald-400">{h.ingested24h}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Rejected 24 h</div>
          <div className={`text-xl font-semibold ${h.rejected24h > 0 ? "text-destructive" : "text-foreground"}`}>{h.rejected24h}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Throughput</div>
        <Spark values={h.throughput} />
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Last sync: {formatDate(h.lastSyncAt)}
      </div>
      {h.lastErrorMessage && (
        <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive">
          <div className="font-medium">Last error · {formatDate(h.lastErrorAt)}</div>
          <div>{h.lastErrorMessage}</div>
        </div>
      )}
    </div>
  );
}
