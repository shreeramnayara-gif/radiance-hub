import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pacsService } from "@/lib/services";
import {
  PACS_PROTOCOL_LABELS,
  type PacsEndpoint,
  type PacsEndpointInput,
  type PacsProtocol,
} from "@/lib/pacs";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Endpoint to edit — when omitted, the dialog creates a new one. */
  endpoint?: PacsEndpoint | null;
}

const EMPTY: PacsEndpointInput = {
  name: "",
  protocol: "DICOMWEB",
  host: "",
  port: null,
  aeTitle: "",
  sourceLabel: "",
  pullEnabled: false,
  pollIntervalSec: 60,
};

export function EndpointEditor({ open, onOpenChange, endpoint }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<PacsEndpointInput>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm(
      endpoint
        ? {
            name: endpoint.name,
            protocol: endpoint.protocol,
            host: endpoint.host,
            port: endpoint.port ?? null,
            aeTitle: endpoint.aeTitle ?? "",
            sourceLabel: endpoint.sourceLabel ?? "",
            pullEnabled: endpoint.pullEnabled,
            pollIntervalSec: endpoint.pollIntervalSec ?? 60,
          }
        : EMPTY,
    );
  }, [open, endpoint]);

  const save = useMutation({
    mutationFn: () =>
      endpoint
        ? pacsService.updateEndpoint(endpoint.id, form)
        : pacsService.createEndpoint(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pacs", "endpoints"] });
      qc.invalidateQueries({ queryKey: ["pacs", "health"] });
      toast.success(endpoint ? "Endpoint updated" : "Endpoint created");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isDimse = form.protocol === "DIMSE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{endpoint ? "Edit endpoint" : "New PACS endpoint"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Hospital A — Orthanc"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Protocol</Label>
            <Select
              value={form.protocol}
              onValueChange={(v) => setForm({ ...form, protocol: v as PacsProtocol })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PACS_PROTOCOL_LABELS) as PacsProtocol[]).map((p) => (
                  <SelectItem key={p} value={p}>{PACS_PROTOCOL_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="host">Host / Base URL</Label>
              <Input
                id="host"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder={isDimse ? "pacs.example.org" : "https://orthanc.example.org"}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={form.port ?? ""}
                onChange={(e) => setForm({ ...form, port: e.target.value ? Number(e.target.value) : null })}
                placeholder={isDimse ? "104" : "443"}
              />
            </div>
          </div>

          {isDimse && (
            <div className="grid gap-1.5">
              <Label htmlFor="ae">AE Title</Label>
              <Input
                id="ae"
                value={form.aeTitle ?? ""}
                onChange={(e) => setForm({ ...form, aeTitle: e.target.value })}
                placeholder="ASPIRE"
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="src">Source label (admin-only metadata)</Label>
            <Input
              id="src"
              value={form.sourceLabel ?? ""}
              onChange={(e) => setForm({ ...form, sourceLabel: e.target.value })}
              placeholder="Hospital A"
            />
            <p className="text-xs text-muted-foreground">
              Never exposed to radiologists. Anonymization is enforced server-side.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Auto-pull studies</div>
              <div className="text-xs text-muted-foreground">Backend polls the source on the interval below.</div>
            </div>
            <Switch
              checked={form.pullEnabled}
              onCheckedChange={(v) => setForm({ ...form, pullEnabled: v })}
            />
          </div>

          {form.pullEnabled && (
            <div className="grid gap-1.5">
              <Label htmlFor="poll">Poll interval (seconds)</Label>
              <Input
                id="poll"
                type="number"
                min={10}
                value={form.pollIntervalSec ?? 60}
                onChange={(e) => setForm({ ...form, pollIntervalSec: Number(e.target.value) })}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.name.trim() || !form.host.trim()}
          >
            {save.isPending ? "Saving…" : endpoint ? "Save changes" : "Create endpoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
