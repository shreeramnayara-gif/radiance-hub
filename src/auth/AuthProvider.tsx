import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "oidc-client-ts";
import { getUserManager } from "@/lib/oidc";
import { extractRoles, type Role } from "@/lib/roles";

interface AuthState {
  user: User | null;
  roles: Role[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const mgr = getUserManager();
    let mounted = true;

    mgr.getUser().then((u) => {
      if (!mounted) return;
      setUser(u && !u.expired ? u : null);
      setLoading(false);
    });

    const onLoaded = (u: User) => setUser(u);
    const onUnloaded = () => setUser(null);
    const onExpired = () => setUser(null);
    mgr.events.addUserLoaded(onLoaded);
    mgr.events.addUserUnloaded(onUnloaded);
    mgr.events.addAccessTokenExpired(onExpired);

    return () => {
      mounted = false;
      mgr.events.removeUserLoaded(onLoaded);
      mgr.events.removeUserUnloaded(onUnloaded);
      mgr.events.removeAccessTokenExpired(onExpired);
    };
  }, []);

  const value: AuthState = {
    user,
    roles: extractRoles(user?.profile as Record<string, unknown> | undefined),
    isAuthenticated: !!user && !user.expired,
    isLoading,
    login: async () => {
      await getUserManager().signinRedirect();
    },
    logout: async () => {
      await getUserManager().signoutRedirect();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
