import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void login();
    }
  }, [isAuthenticated, isLoading, login]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground">Verifying session…</p>
          <button className="mt-3 text-xs text-primary underline" onClick={() => navigate({ to: "/" })}>Back to home</button>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
