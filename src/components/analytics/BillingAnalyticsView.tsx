import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/lib/services";
import { formatMoney } from "@/lib/format";
import { StatCard } from "./Primitives";

function MoneyList({ items }: { items: Array<{ currency: string; amount: number }> }) {
  if (!items.length) return <div className="text-sm text-muted-foreground">—</div>;
  return (
    <div className="space-y-1">
      {items.map((m) => (
        <div key={m.currency} className="text-2xl font-display font-bold tabular-nums">
          {formatMoney(m.amount, m.currency)}
        </div>
      ))}
    </div>
  );
}

export function BillingAnalyticsView() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", "billing"],
    queryFn: () => analyticsService.billing(),
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading billing analytics…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Payouts (this month)</div>
          <MoneyList items={data.payoutsThisMonth} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Invoices (this month)</div>
          <MoneyList items={data.invoicesThisMonth} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Outstanding</div>
          <MoneyList items={data.outstandingInvoices} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-display font-semibold mb-3">Top radiologists</h3>
          <ul className="space-y-2">
            {data.topRadiologists.map((r) => (
              <li key={`${r.id}:${r.currency}`} className="flex items-baseline justify-between text-sm">
                <span className="truncate">{r.name}</span>
                <span className="font-medium tabular-nums">{formatMoney(r.amount, r.currency)}</span>
              </li>
            ))}
            {data.topRadiologists.length === 0 && <li className="text-sm text-muted-foreground">No data.</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-display font-semibold mb-3">Top clients</h3>
          <ul className="space-y-2">
            {data.topClients.map((c) => (
              <li key={`${c.id}:${c.currency}`} className="flex items-baseline justify-between text-sm">
                <span className="truncate">{c.name}</span>
                <span className="font-medium tabular-nums">{formatMoney(c.amount, c.currency)}</span>
              </li>
            ))}
            {data.topClients.length === 0 && <li className="text-sm text-muted-foreground">No data.</li>}
          </ul>
        </div>
      </div>

      <StatCard label="Note" value="Server-enforced" hint="Billing analytics are restricted to Super Admin on the backend." tone="muted" />
    </div>
  );
}
