import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { billingService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";
import type { BillingPartyRole, RateCard } from "@/lib/billing";
import { formatMoney } from "@/lib/format";
import { RateCardEditor } from "@/components/billing/RateCardEditor";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/billing/rate-cards")({ component: RateCardsPage });

const ROLE_TABS: { key: BillingPartyRole | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "radiologist", label: "Radiologists" },
  { key: "hospital", label: "Hospitals" },
  { key: "diagnostic_centre", label: "Diagnostic Centres" },
];

function RateCardsPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.SUB_ADMIN);
  const qc = useQueryClient();
  const [tab, setTab] = useState<BillingPartyRole | "all">("all");
  const [editing, setEditing] = useState<RateCard | undefined>();
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["billing", "rate-cards", tab],
    queryFn: () => billingService.listRateCards(tab === "all" ? undefined : { ownerRole: tab }),
    enabled: isAdmin,
  });

  const remove = useMutation({
    mutationFn: (id: string) => billingService.deleteRateCard(id),
    onSuccess: () => { toast.success("Rate card deleted"); qc.invalidateQueries({ queryKey: ["billing", "rate-cards"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const sorted = useMemo(() => (data ? [...data].sort((a, b) => a.ownerName.localeCompare(b.ownerName)) : []), [data]);

  if (!isAdmin) {
    return <div className="text-sm text-muted-foreground">Only Super Admin / Sub Admin can manage rate cards.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-muted/40 rounded-md p-1">
          {ROLE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1 text-xs rounded transition ${tab === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> New rate card</Button>
      </div>

      {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-4 text-sm">Failed to load rate cards: {(error as Error).message}</div>}

      {sorted.length === 0 && data && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          No rate cards yet for this filter.
        </div>
      )}

      {sorted.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Owner</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Currency</th>
                <th className="text-left px-4 py-3 font-medium">Rules</th>
                <th className="text-left px-4 py-3 font-medium">Default</th>
                <th className="text-left px-4 py-3 font-medium">Effective</th>
                <th className="text-left px-4 py-3 font-medium">Active</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.ownerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.ownerRole.replace("_", " ")}</td>
                  <td className="px-4 py-3">{c.currency}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.rules.length}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.defaultAmount != null ? formatMoney(c.defaultAmount, c.currency) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(c.effectiveFrom).toLocaleDateString()} → {c.effectiveTo ? new Date(c.effectiveTo).toLocaleDateString() : "open"}
                  </td>
                  <td className="px-4 py-3">{c.active ? <span className="text-success-foreground">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={remove.isPending}
                        onClick={() => { if (confirm(`Delete rate card for ${c.ownerName}?`)) remove.mutate(c.id); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RateCardEditor open={!!editing} card={editing} onOpenChange={(o) => !o && setEditing(undefined)} />
      <RateCardEditor open={creating} onOpenChange={setCreating} />
    </div>
  );
}
