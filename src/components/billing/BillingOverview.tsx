import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { billingService } from "@/lib/services";
import { billingRoleForUser } from "@/lib/billing";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";
import { formatMoney } from "@/lib/format";
import { AlertTriangle, CreditCard, Receipt, Wallet, Loader2 } from "lucide-react";

export function BillingOverview() {
  const { roles } = useAuth();
  const isAdmin = roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.SUB_ADMIN);
  const billRole = billingRoleForUser(roles);
  const isRad = billRole === "radiologist";
  const isClient = billRole === "hospital" || billRole === "diagnostic_centre";

  const myCardQ = useQuery({
    queryKey: ["billing", "my-rate-card"],
    queryFn: () => billingService.myRateCard(),
    enabled: !!billRole,
    retry: 0,
  });

  const myKind = isRad ? "PAYOUT" : isClient ? "INVOICE" : undefined;
  const myLinesQ = useQuery({
    queryKey: ["billing", "lines", { kind: myKind, mine: true }],
    queryFn: () => billingService.listLines({ kind: myKind }),
    enabled: !!myKind,
  });

  const adminPayoutsQ = useQuery({
    queryKey: ["billing", "lines", { kind: "PAYOUT", admin: true }],
    queryFn: () => billingService.listLines({ kind: "PAYOUT" }),
    enabled: isAdmin,
  });
  const adminInvoicesQ = useQuery({
    queryKey: ["billing", "lines", { kind: "INVOICE", admin: true }],
    queryFn: () => billingService.listLines({ kind: "INVOICE" }),
    enabled: isAdmin,
  });

  return (
    <div className="space-y-6">
      {billRole && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium"><CreditCard className="h-4 w-4" /> My rate card</div>
          {myCardQ.isLoading && <p className="text-sm text-muted-foreground mt-2">Loading…</p>}
          {myCardQ.error && (
            <div className="mt-2 text-sm text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-warning-foreground" />
              <span>No active rate card on file. Contact an administrator to set one up.</span>
            </div>
          )}
          {myCardQ.data && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat label="Currency" value={myCardQ.data.currency} />
              <Stat label="Rules" value={String(myCardQ.data.rules.length)} />
              <Stat label="Default rate" value={myCardQ.data.defaultAmount != null ? formatMoney(myCardQ.data.defaultAmount, myCardQ.data.currency) : "—"} />
              <Stat label="Effective" value={new Date(myCardQ.data.effectiveFrom).toLocaleDateString()} />
            </div>
          )}
        </section>
      )}

      {myKind && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              {myKind === "PAYOUT" ? <Wallet className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
              {myKind === "PAYOUT" ? "My payouts" : "My invoices"}
            </div>
            <Link to={myKind === "PAYOUT" ? "/app/billing/payouts" : "/app/billing/invoices"} className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {myLinesQ.isLoading && <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>}
          {myLinesQ.error && <p className="text-sm text-destructive mt-2">{(myLinesQ.error as Error).message}</p>}
          {myLinesQ.data && <SubtotalRow subs={myLinesQ.data.subtotalsByCurrency} count={myLinesQ.data.total} />}
        </section>
      )}

      {isAdmin && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium"><Wallet className="h-4 w-4" /> All payouts</div>
              <Link to="/app/billing/payouts" className="text-xs text-primary hover:underline">Manage →</Link>
            </div>
            {adminPayoutsQ.data && <SubtotalRow subs={adminPayoutsQ.data.subtotalsByCurrency} count={adminPayoutsQ.data.total} />}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium"><Receipt className="h-4 w-4" /> All invoices</div>
              <Link to="/app/billing/invoices" className="text-xs text-primary hover:underline">Manage →</Link>
            </div>
            {adminInvoicesQ.data && <SubtotalRow subs={adminInvoicesQ.data.subtotalsByCurrency} count={adminInvoicesQ.data.total} />}
          </div>
        </section>
      )}

      {!billRole && !isAdmin && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          Your role does not have billing visibility.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function SubtotalRow({ subs, count }: { subs: Record<string, number>; count: number }) {
  const entries = Object.entries(subs);
  return (
    <div className="mt-3 flex items-baseline gap-6 flex-wrap">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Lines</div>
        <div className="text-2xl font-display font-semibold">{count}</div>
      </div>
      {entries.length === 0 && <div className="text-sm text-muted-foreground">No totals yet.</div>}
      {entries.map(([cur, total]) => (
        <div key={cur}>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Subtotal · {cur}</div>
          <div className="text-2xl font-display font-semibold">{formatMoney(total, cur)}</div>
        </div>
      ))}
    </div>
  );
}
