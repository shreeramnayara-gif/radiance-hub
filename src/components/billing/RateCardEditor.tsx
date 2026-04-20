import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { billingService } from "@/lib/services";
import type { BillingPartyRole, RateCard, RateCardInput, RateRule } from "@/lib/billing";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Existing card to edit, or partial defaults to seed a new one. */
  card?: RateCard;
  /** Locked owner when creating from a specific user row. */
  lockedOwner?: { id: string; name: string; role: BillingPartyRole };
  onSaved?: () => void;
}

const ROLE_OPTIONS: BillingPartyRole[] = ["radiologist", "hospital", "diagnostic_centre"];

export function RateCardEditor({ open, onOpenChange, card, lockedOwner, onSaved }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<RateCardInput>(seed(card, lockedOwner));

  useEffect(() => { if (open) setForm(seed(card, lockedOwner)); }, [open, card, lockedOwner]);

  const create = useMutation({
    mutationFn: (input: RateCardInput) => billingService.createRateCard(input),
    onSuccess: () => { toast.success("Rate card created"); qc.invalidateQueries({ queryKey: ["billing", "rate-cards"] }); onSaved?.(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const update = useMutation({
    mutationFn: (patch: Partial<RateCardInput>) => billingService.updateRateCard(card!.id, patch),
    onSuccess: () => { toast.success("Rate card updated"); qc.invalidateQueries({ queryKey: ["billing", "rate-cards"] }); onSaved?.(); onOpenChange(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.ownerId) return toast.error("Owner is required");
    if (!form.currency) return toast.error("Currency is required");
    card ? update.mutate(form) : create.mutate(form);
  };

  const setRule = (idx: number, patch: Partial<RateRule>) =>
    setForm((f) => ({ ...f, rules: f.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));
  const addRule = () =>
    setForm((f) => ({ ...f, rules: [...f.rules, { id: `tmp-${Date.now()}`, modality: "", bodyPart: null, amount: 0 }] }));
  const removeRule = (idx: number) =>
    setForm((f) => ({ ...f, rules: f.rules.filter((_, i) => i !== idx) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{card ? "Edit rate card" : "New rate card"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Owner ID</Label>
            <Input
              value={form.ownerId}
              disabled={!!lockedOwner || !!card}
              onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              placeholder="user-uuid"
            />
            {lockedOwner && <p className="text-xs text-muted-foreground">{lockedOwner.name}</p>}
          </div>
          <div className="space-y-1">
            <Label>Owner role</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.ownerRole}
              disabled={!!lockedOwner || !!card}
              onChange={(e) => setForm({ ...form, ownerRole: e.target.value as BillingPartyRole })}
            >
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Currency (ISO 4217)</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} placeholder="USD" />
          </div>
          <div className="space-y-1">
            <Label>Default amount (optional)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.defaultAmount ?? ""}
              onChange={(e) => setForm({ ...form, defaultAmount: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label>Effective from</Label>
            <Input type="date" value={form.effectiveFrom.slice(0, 10)} onChange={(e) => setForm({ ...form, effectiveFrom: new Date(e.target.value).toISOString() })} />
          </div>
          <div className="space-y-1">
            <Label>Effective to (optional)</Label>
            <Input type="date" value={form.effectiveTo?.slice(0, 10) ?? ""} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label>Rules</Label>
            <Button variant="outline" size="sm" onClick={addRule}><Plus className="h-3 w-3 mr-1" /> Add rule</Button>
          </div>
          <div className="rounded-md border border-border divide-y divide-border">
            {form.rules.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No rules yet — falls back to default amount.</p>}
            {form.rules.map((r, i) => (
              <div key={r.id} className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-2 px-2 py-2 items-center">
                <Input value={r.modality} placeholder="Modality (e.g. CT)" onChange={(e) => setRule(i, { modality: e.target.value.toUpperCase() })} />
                <Input value={r.bodyPart ?? ""} placeholder="Body part (blank = any)" onChange={(e) => setRule(i, { bodyPart: e.target.value || null })} />
                <Input type="number" step="0.01" value={r.amount} onChange={(e) => setRule(i, { amount: Number(e.target.value) })} />
                <Button variant="ghost" size="icon" onClick={() => removeRule(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active
        </label>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending}>
            {(create.isPending || update.isPending) ? "Saving…" : card ? "Save changes" : "Create card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function seed(card?: RateCard, lockedOwner?: { id: string; name: string; role: BillingPartyRole }): RateCardInput {
  if (card) {
    return {
      ownerId: card.ownerId,
      ownerRole: card.ownerRole,
      currency: card.currency,
      defaultAmount: card.defaultAmount ?? null,
      rules: card.rules,
      active: card.active,
      effectiveFrom: card.effectiveFrom,
      effectiveTo: card.effectiveTo ?? null,
    };
  }
  return {
    ownerId: lockedOwner?.id ?? "",
    ownerRole: lockedOwner?.role ?? "radiologist",
    currency: "USD",
    defaultAmount: null,
    rules: [],
    active: true,
    effectiveFrom: new Date().toISOString(),
    effectiveTo: null,
  };
}
