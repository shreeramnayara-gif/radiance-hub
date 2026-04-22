import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";
import {
  buildFixSuggestions,
  buildRoleMappingReport,
  decodeJwt,
  logRoleMismatches,
} from "@/lib/tokenClaims";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, AlertTriangle, KeyRound } from "lucide-react";

const ALL_ROLES = Object.values(ROLES) as Role[];

export function TokenClaimsInspector() {
  const { user, isDevBypass } = useAuth();
  const [open, setOpen] = useState(false);

  const decoded = useMemo(() => decodeJwt(user?.access_token), [user?.access_token]);
  // In dev bypass we don't have a real JWT — surface the mock profile claims instead.
  const payload = decoded?.payload ?? (user?.profile as Record<string, unknown> | undefined);
  const report = useMemo(() => buildRoleMappingReport(payload), [payload]);
  const fixes = useMemo(() => buildFixSuggestions(report), [report]);

  // Log mismatches whenever a new token/profile is observed.
  useEffect(() => {
    if (!payload) return;
    logRoleMismatches(report, decoded?.signature ?? (isDevBypass ? "dev-bypass" : undefined));
  }, [payload, report, decoded?.signature, isDevBypass]);

  const hasMismatch = report.unmapped.length > 0 || report.mapped.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start mb-2 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
        >
          {hasMismatch ? (
            <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
          ) : (
            <ShieldCheck className="h-4 w-4 mr-2" />
          )}
          Token claims
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Token claims inspector
          </DialogTitle>
          <DialogDescription>
            OIDC realm role → app role mapping. Mismatches are logged to the console for
            troubleshooting Keycloak client mappers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Token type" value={isDevBypass ? "Dev bypass (mock)" : decoded ? "JWT" : "None"} />
            <Stat label="Issuer" value={String(payload?.iss ?? "—")} />
            <Stat label="Subject" value={String(payload?.sub ?? "—")} />
            <Stat
              label="Expires"
              value={
                typeof payload?.exp === "number"
                  ? new Date((payload.exp as number) * 1000).toLocaleString()
                  : "—"
              }
            />
          </div>

          <Section title="Mapped app roles">
            {report.mapped.length === 0 ? (
              <p className="text-sm text-destructive">
                No app roles could be mapped from this token.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {report.mapped.map((r) => (
                  <Badge key={r} variant="default">
                    {ROLE_LABELS[r]}
                  </Badge>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Unmapped role claims (${report.unmapped.length})`}>
            {report.unmapped.length === 0 ? (
              <p className="text-sm text-muted-foreground">All claims mapped cleanly.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {report.unmapped.map((r) => (
                  <Badge key={r} variant="destructive">
                    {r}
                  </Badge>
                ))}
              </div>
            )}
          </Section>

          {fixes.length > 0 && (
            <Section title={`How to fix mismatches (${fixes.length})`}>
              <ul className="space-y-3">
                {fixes.map((f) => (
                  <li
                    key={`${f.source}:${f.claim}`}
                    className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="destructive" className="font-mono">
                        {f.claim}
                      </Badge>
                      <span className="text-xs text-muted-foreground">from</span>
                      <code className="text-xs font-mono">{f.source}</code>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {f.mapper}
                      </Badge>
                    </div>
                    {f.likelyRole && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Likely intended app role:{" "}
                        <span className="font-medium text-foreground">
                          {ROLE_LABELS[f.likelyRole]}
                        </span>
                      </p>
                    )}
                    <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
                      {f.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Roles not granted to this user">
            <div className="flex flex-wrap gap-1.5">
              {ALL_ROLES.map((r) => (
                <Badge
                  key={r}
                  variant={report.mapped.includes(r) ? "secondary" : "outline"}
                  className={report.mapped.includes(r) ? "" : "opacity-50"}
                >
                  {ROLE_LABELS[r]}
                </Badge>
              ))}
            </div>
          </Section>

          <Section title="Claim sources">
            {report.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">No role-bearing claims found.</p>
            ) : (
              <ul className="text-xs font-mono space-y-1">
                {report.sources.map((s) => (
                  <li key={s.path} className="text-muted-foreground">
                    <span className="text-foreground">{s.path}</span> →{" "}
                    [{s.values.join(", ")}]
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Raw payload">
            <ScrollArea className="h-48 rounded-md border bg-muted/30 p-3">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(payload ?? {}, null, 2)}
              </pre>
            </ScrollArea>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs font-mono truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}
