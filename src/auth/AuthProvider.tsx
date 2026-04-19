import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "oidc-client-ts";
import { getUserManager } from "@/lib/oidc";
import { extractRoles, ROLES, type Role } from "@/lib/roles";
import { env } from "@/lib/env";

interface AuthState {
  user: User | null;
  roles: Role[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isDevBypass: boolean;
  /** DEV-ONLY: active role(s) selected via the dev role switcher. */
  devActiveRoles: Role[];
  /** DEV-ONLY: change which role(s) the mock session presents. */
  setDevActiveRoles: (roles: Role[]) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  enableDevBypass: () => void;
  disableDevBypass: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const DEV_BYPASS_KEY = "aspire.dev_bypass";
const DEV_ROLES_KEY = "aspire.dev_active_roles";

const readBypassFromStorage = () =>
  typeof window !== "undefined" && window.localStorage.getItem(DEV_BYPASS_KEY) === "1";

/**
 * DEV-ONLY mock session. Tree-shaken out of prod bundles because every reference
 * is gated behind `env.devMode`, which is `false` in production builds.
 */
const buildDevUser = (roles: Role[]): User =>
  ({
    profile: {
      sub: "dev-user-0001",
      name: "Dev Preview User",
      email: "dev@aspire.local",
      preferred_username: "dev",
      roles,
    },
    access_token: "dev-bypass-token",
    expired: false,
  }) as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  // Bypass active if env DEV_MODE OR persisted runtime bypass flag.
  const [isDevBypass, setIsDevBypass] = useState(() => env.devMode || readBypassFromStorage());
  const [devActiveRoles, setDevActiveRolesState] = useState<Role[]>(() => {
    if (typeof window === "undefined") return [ROLES.SUPER_ADMIN];
    try {
      const raw = window.localStorage.getItem(DEV_ROLES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Role[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [ROLES.SUPER_ADMIN];
  });

  // Mock session: auto-mount whenever bypass is active (env or runtime).
  useEffect(() => {
    if (isDevBypass) {
      setUser(buildDevUser(devActiveRoles));
      setLoading(false);
      return;
    }

    let mounted = true;
    let mgr: ReturnType<typeof getUserManager> | null = null;
    try {
      mgr = getUserManager();
    } catch {
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
        if (mounted) setLoading(false);
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
  }, [devActiveRoles]);

  const setDevActiveRoles = (roles: Role[]) => {
    // Allow role switching whenever a dev session is active (env or runtime bypass).
    const next = roles.length > 0 ? roles : [ROLES.SUPER_ADMIN];
    setDevActiveRolesState(next);
    try {
      window.localStorage.setItem(DEV_ROLES_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const value: AuthState = useMemo(
    () => ({
      user,
      roles: isDevBypass
        ? devActiveRoles
        : extractRoles(user?.profile as Record<string, unknown> | undefined),
      isAuthenticated: isDevBypass || (!!user && !user.expired),
      isLoading,
      isDevBypass,
      devActiveRoles,
      setDevActiveRoles,
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
          setUser(null);
          setIsDevBypass(false);
          return;
        }
        try {
          await getUserManager().signoutRedirect();
        } catch (e) {
          console.error("[auth] signoutRedirect failed", e);
        }
      },
      enableDevBypass: () => {
        try {
          window.localStorage.setItem(DEV_BYPASS_KEY, "1");
        } catch {
          /* ignore */
        }
        setIsDevBypass(true);
        setUser(buildDevUser(devActiveRoles));
        setLoading(false);
      },
      disableDevBypass: () => {
        try {
          window.localStorage.removeItem(DEV_BYPASS_KEY);
        } catch {
          /* ignore */
        }
        setIsDevBypass(false);
        setUser(null);
      },
    }),
    [user, isLoading, isDevBypass, devActiveRoles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
