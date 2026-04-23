import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";
import { inspectKeycloakSetup, hasBlockingKeycloakIssue } from "@/lib/keycloak-checklist";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert, X } from "lucide-react";

/**
 * Visible only to Super Admins. Surfaces concrete Keycloak misconfigurations
 * (localhost authority, missing 'roles' scope, audience mismatch, no realm
 * roles in the token, …) with a step-by-step fix checklist.
 */
export function KeycloakSetupBanner() {
  const { user, roles } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(true);

  const isSuperAdmin = roles.includes(ROLES.SUPER_ADMIN);
  const warnings = useMemo(
    () => inspectKeycloakSetup(user?.access_token),
    [user?.access_token],
  );

  if (!isSuperAdmin || dismissed || warnings.length === 0) return null;

  const blocking = hasBlockingKeycloakIssue(warnings);
  const errCount = warnings.filter((w) => w.severity === "error").length;
  const warnCount = warnings.filter((w) => w.severity === "warning").length;

  return (
    <div className="px-6 pt-4">
      <Alert variant={blocking ? "destructive" : "default"} className="relative">
        <ShieldAlert className="h-4 w-4" />
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <AlertTitle className="flex items-center gap-2 pr-6">
          Keycloak setup needs attention
          {errCount > 0 && <Badge variant="destructive">{errCount} error{errCount === 1 ? "" : "s"}</Badge>}
          {warnCount > 0 && <Badge variant="secondary">{warnCount} warning{warnCount === 1 ? "" : "s"}</Badge>}
        </AlertTitle>
        <AlertDescription>
          <div className="mt-1 mb-2 text-sm">
            The app is running but identity/auth is misconfigured. Fix these in the Keycloak admin console.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            className="h-7"
          >
            {open ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {open ? "Hide checklist" : `Show checklist (${warnings.length})`}
          </Button>
          {open && (
            <ul className="mt-3 space-y-3">
              {warnings.map((w) => (
                <li
                  key={w.id}
                  className="rounded-md border bg-background/60 p-3 text-sm"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <AlertTriangle
                      className={
                        w.severity === "error"
                          ? "h-4 w-4 mt-0.5 text-destructive"
                          : w.severity === "warning"
                            ? "h-4 w-4 mt-0.5 text-amber-500"
                            : "h-4 w-4 mt-0.5 text-muted-foreground"
                      }
                    />
                    <div className="flex-1">
                      <div className="font-medium">{w.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{w.detail}</div>
                    </div>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed mt-2 pl-1">
                    {w.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
