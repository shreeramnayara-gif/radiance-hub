import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { KeycloakLoginCard } from "@/components/KeycloakLoginCard";
import logo from "@/assets/aspire-logo.png";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/app" />;
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center p-6 relative overflow-hidden">
      <div className="absolute -z-10 top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-[radial-gradient(circle,_var(--primary)_0%,_transparent_65%)] opacity-15 blur-3xl" />
      <div className="w-full max-w-md flex flex-col items-center">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <img src={logo} alt="Aspire" width={36} height={36} className="h-9 w-9" />
          <span className="font-display font-bold tracking-tight text-lg">Aspire</span>
        </Link>
        <KeycloakLoginCard />
        <Link to="/" className="mt-6 text-xs text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
