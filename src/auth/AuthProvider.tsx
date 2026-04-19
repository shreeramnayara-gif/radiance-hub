import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "oidc-client-ts";
import { getUserManager } from "@/lib/oidc";
import { extractRoles, ROLES, type Role } from "@/lib/roles";

interface AuthState {
  user: User | null;
  roles: Role[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isDevBypass: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  enableDevBypass: () => void;
  disableDevBypass: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const DEV_BYPASS_KEY = "aspire.dev_bypass";

/**
 * Synthetic user used in dev-bypass mode for previewing the workspace
 * without a live Keycloak. Grants every role so all dashboards render.
 */
const DEV_USER = {
  profile: {
    sub: "dev-user-0001",
    name: "Dev Preview User",
    email: "dev@aspire.local",
    preferred_username: "dev",
    roles: Object.values(ROLES),
  },
  access_token: "dev-bypass-token",
  expired: false,
} as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isDevBypass, setIsDevBypass] = useState(false);

  useEffect(() => {
    // Hydrate dev-bypass preference from localStorage
    if (typeof window !== "undefined" && window.localStorage.getItem(DEV_BYPASS_KEY) === "1") {
      setIsDevBypass(true);
      setUser(DEV_USER);
      setLoading(false);
      return;
    }

    let mounted = true;
    let mgr: ReturnType<typeof getUserManager> | null = null;

    try {
      mgr = getUserManager();
    } catch {
      // OIDC misconfigured — leave user null, stop loading
      setLoading(false);
      return;
    }

    mgr.getUser()
      .then((u) => {
        if (!mounted) return;
        setUser(u && !u.expired ? u : null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
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
      mgr?.events.removeUserLoaded(onLoaded);
      mgr?.events.removeUserUnloaded(onUnloaded);
      mgr?.events.removeAccessTokenExpired(onExpired);
    };
  }, []);

  const value: AuthState = useMemo(
    () => ({
      user,
      roles: isDevBypass
        ? (Object.values(ROLES) as Role[])
        : extractRoles(user?.profile as Record<string, unknown> | undefined),
      isAuthenticated: isDevBypass || (!!user && !user.expired),
      isLoading,
      isDevBypass,
      login: async () => {
        if (isDevBypass) return;
        try {
          await getUserManager().signinRedirect();
        } catch (e) {
          console.error("[auth] signinRedirect failed", e);
          throw e;
        }
      },
      logout: async () => {
        if (isDevBypass) {
          window.localStorage.removeItem(DEV_BYPASS_KEY);
          setIsDevBypass(false);
          setUser(null);
          return;
        }
        try {
          await getUserManager().signoutRedirect();
        } catch (e) {
          console.error("[auth] signoutRedirect failed", e);
        }
      },
      enableDevBypass: () => {
        window.localStorage.setItem(DEV_BYPASS_KEY, "1");
        setIsDevBypass(true);
        setUser(DEV_USER);
        setLoading(false);
      },
      disableDevBypass: () => {
        window.localStorage.removeItem(DEV_BYPASS_KEY);
        setIsDevBypass(false);
        setUser(null);
      },
    }),
    [user, isLoading, isDevBypass],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
