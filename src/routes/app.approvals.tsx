import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { usersService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import type { AppUser, UserStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/approvals")({
  component: ApprovalsPage,
});

const STATUS_TABS: { key: UserStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
];

function ApprovalsPage() {
  const { roles } = useAuth();
  const allowed = roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.SUB_ADMIN);
  const [status, setStatus] = useState<UserStatus>("pending");
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["users", status],
    queryFn: () => usersService.list({ status }),
    enabled: allowed,
    refetchInterval: 15_000,
  });

  const approve = useMutation({
    mutationFn: (id: string) => usersService.approve(id),
    onSuccess: () => { toast.success("User approved"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => usersService.reject(id, reason),
    onSuccess: () => { toast.success("User rejected"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const suspend = useMutation({
    mutationFn: (id: string) => usersService.suspend(id),
    onSuccess: () => { toast.success("User suspended"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!allowed) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-display font-bold">Restricted</h1>
        <p className="text-muted-foreground text-sm mt-2">User approvals are limited to Super Admin and Sub Admin roles.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Administration</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">User Approvals</h1>
        <p className="text-muted-foreground mt-2 text-sm">Approve, reject, or suspend accounts. All actions are audit-logged on the backend.</p>
      </header>

      <div className="flex gap-2 mb-6 border-b border-border">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              status === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading users…</div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-4 text-sm">
          Failed to load users: {(error as Error).message}. Check that <code>VITE_API_BASE_URL</code> is set and the backend exposes <code>GET /users</code>.
        </div>
      )}

      {data && data.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          No users in <strong>{status}</strong>.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Certificates</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u: AppUser) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.fullName}</div>
                    <div className="text-xs text-muted-foreground">{u.email}{u.organization ? ` · ${u.organization}` : ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => <Badge key={r} variant="secondary">{ROLE_LABELS[r]}</Badge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3"><CertBadge s={u.certificatesStatus} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => approve.mutate(u.id)} disabled={approve.isPending}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => {
                            const reason = prompt("Reason for rejection?");
                            if (reason) reject.mutate({ id: u.id, reason });
                          }}>
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => suspend.mutate(u.id)}>
                          <ShieldAlert className="h-4 w-4 mr-1" /> Suspend
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CertBadge({ s }: { s?: AppUser["certificatesStatus"] }) {
  if (!s || s === "none") return <span className="text-xs text-muted-foreground">—</span>;
  const map = {
    pending: "bg-warning/15 text-warning-foreground border-warning/30",
    verified: "bg-success/15 text-success-foreground border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    expired: "bg-muted text-muted-foreground border-border",
  } as const;
  return <span className={`text-xs px-2 py-0.5 rounded-md border ${map[s]}`}>{s}</span>;
}
