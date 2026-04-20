import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { usersService } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export function AssignDialog({
  trigger,
  currentAssigneeId,
  onAssign,
  pending,
}: {
  trigger: React.ReactNode;
  currentAssigneeId?: string | null;
  onAssign: (assigneeId: string) => void;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(currentAssigneeId ?? "");

  const { data, isLoading, error } = useQuery({
    queryKey: ["radiologists"],
    queryFn: () => usersService.listRadiologists(),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign radiologist</DialogTitle>
        </DialogHeader>
        {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
        {error && <p className="text-sm text-destructive">Failed to load radiologists: {(error as Error).message}</p>}
        {data && (
          <div className="max-h-72 overflow-y-auto -mx-1 px-1">
            {data.length === 0 && <p className="text-sm text-muted-foreground">No approved radiologists available.</p>}
            {data.map((u) => (
              <label key={u.id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/40 cursor-pointer">
                <input type="radio" name="assignee" value={u.id} checked={selected === u.id} onChange={() => setSelected(u.id)} />
                <div>
                  <div className="text-sm font-medium">{u.fullName}</div>
                  <div className="text-xs text-muted-foreground">{u.email}{u.organization ? ` · ${u.organization}` : ""}</div>
                </div>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!selected || pending}
            onClick={() => {
              onAssign(selected);
              setOpen(false);
            }}
          >
            {pending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
