import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { billingService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";
import type { BillingLine, BillingLineKind, BillingLineStatus } from "@/lib/billing";
import { BillingLinesTable } from "./BillingLinesTable";
import { formatMoney, downloadBlob } from "@/lib/format";
import { apiFetch } from "@/lib/api";
import { env } from "@/lib/env";
import { getUserManager } from "@/lib/oidc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2, RefreshCw } from "lucide-react";

const STATUS_OPTIONS: BillingLineStatus[] = ["PENDING", "LOCKED", "PAID", "VOID", "SUPERSEDED"];

export function BillingLinesView({ kind }: { kind: BillingLineKind }) {
  const { roles } = useAuth();
  const isAdmin = roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.SUB_ADMIN);
  const qc = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<BillingLineStatus[]>([]);

  const query = useMemo(
    () => ({
      kind,
      from: from || undefined,
      to: to || undefined,
      status: status.length ? status : undefined,
    }),
    [kind, from, to, status],
  );

  const linesQ = useQuery({
    queryKey: ["billing", "lines", query],
    queryFn: () => billingService.listLines(query),
    refetchInterval: 30_000,
  });

  const markPaid = useMutation({
    mutationFn: (line: BillingLine) => billingService.markPaid(line.id),
    onSuccess: () => { toast.success("Marked as paid"); qc.invalidateQueries({ queryKey: ["billing", "lines"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // CSV export downloaded as a blob to preserve auth header.
  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const sp = new URLSearchParams({ kind, format: "csv" });
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      if (status.length) sp.set("status", status.join(","));
      const user = await getUserManager().getUser().catch(() => null);
      const headers: Record<string, string> = { Accept: "text/csv" };
      if (user?.access_token) headers.Authorization = `Bearer ${user.access_token}`;
      const res = await fetch(`${env.api.baseUrl}/billing/export?${sp.toString()}`, { headers });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      await downloadBlob(`${kind.toLowerCase()}-${today}.csv`, blob);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Status</div>
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                className={`text-xs px-2 py-1 rounded-md border transition ${
                  status.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => linesQ.refetch()} disabled={linesQ.isFetching}>
            <RefreshCw className="h-4 w-4 mr-1" /> {linesQ.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={exporting || !linesQ.data?.items.length}>
            <Download className="h-4 w-4 mr-1" /> {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      </div>

      {linesQ.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
      {linesQ.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-4 text-sm">
          Failed to load billing lines: {(linesQ.error as Error).message}
        </div>
      )}

      {linesQ.data && (
        <>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Lines</div>
              <div className="text-xl font-display font-semibold">{linesQ.data.total}</div>
            </div>
            {Object.entries(linesQ.data.subtotalsByCurrency).map(([cur, total]) => (
              <div key={cur}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Subtotal · {cur}</div>
                <div className="text-xl font-display font-semibold">{formatMoney(total, cur)}</div>
              </div>
            ))}
          </div>
          <BillingLinesTable
            lines={linesQ.data.items}
            showParty={isAdmin}
            canMarkPaid={isAdmin}
            onMarkPaid={(l) => markPaid.mutate(l)}
            markPaidPendingId={markPaid.isPending ? markPaid.variables?.id : undefined}
          />
        </>
      )}
    </div>
  );
}

// Re-export apiFetch type usage to silence unused-import warning if any.
export type _ApiFetchKeepAlive = typeof apiFetch;
