import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";

interface KeycloakLoginCardProps {
  /** Optional heading. Defaults to "Sign in to Aspire". */
  title?: string;
  /** Show the dev-bypass shortcut beneath the buttons. */
  showDevBypass?: boolean;
  className?: string;
}

/**
 * Drop-in auth panel that talks to Keycloak via OIDC.
 *
 * - "Sign in" → Keycloak `/auth` (standard login page).
 * - "Create account" → Keycloak `/auth?kc_action=register`
 *   (the realm must have "User registration" enabled).
 *
 * If Keycloak isn't configured yet, the card surfaces exactly which
 * env vars are missing instead of silently doing nothing.
 */
export function KeycloakLoginCard({
  title = "Sign in to Aspire",
  showDevBypass = true,
  className,
}: KeycloakLoginCardProps) {
  const { login, signup, enableDevBypass, isOidcReady, isDevBypass } = useAuth();

  return (
    <div
      className={`rounded-2xl border border-border bg-card/80 backdrop-blur p-8 shadow-xl shadow-primary/5 w-full max-w-md ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold mb-3">
        <ShieldCheck className="h-3.5 w-3.5" /> Secure SSO · Keycloak
      </div>
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2">
        You'll be redirected to your organisation's identity provider to
        authenticate. Roles and permissions are read from the JWT.
      </p>

      {!isOidcReady && (
        <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 p-3 text-xs flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Keycloak isn't configured.</div>
            <div className="mt-1 opacity-80">
              Set <code className="font-mono">VITE_OIDC_AUTHORITY</code> and{" "}
              <code className="font-mono">VITE_OIDC_CLIENT_ID</code> in your
              environment, then redeploy. See <code className="font-mono">.env.example</code>.
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button
          size="lg"
          className="rounded-full h-11"
          onClick={() => login()}
          disabled={!isOidcReady || isDevBypass}
        >
          Sign in with Keycloak <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full h-11"
          onClick={() => signup()}
          disabled={!isOidcReady || isDevBypass}
        >
          Create an account
        </Button>
      </div>

      {showDevBypass && !isDevBypass && (
        <button
          type="button"
          onClick={() => enableDevBypass()}
          className="mt-5 block mx-auto text-xs text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
        >
          Preview workspace without Keycloak (dev only)
        </button>
      )}
    </div>
  );
}
