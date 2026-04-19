import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUserManager } from "@/lib/oidc";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserManager()
      .signinRedirectCallback()
      .then(() => navigate({ to: "/app" }))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Authentication failed"));
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground">
      <div className="text-center">
        {error ? (
          <>
            <h1 className="text-xl font-display font-semibold text-destructive">Sign-in failed</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">{error}</p>
          </>
        ) : (
          <>
            <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="mt-4 text-sm text-muted-foreground">Completing sign-in…</p>
          </>
        )}
      </div>
    </div>
  );
}
