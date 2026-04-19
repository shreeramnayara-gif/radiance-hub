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

const DEV_ROLES_KEY = "aspire.dev_active_roles";

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
  // In DEV_MODE we auto-enable bypass on first paint; otherwise off.
  const [isDevBypass, setIsDevBypass] = useState(env.devMode);
  const [devActiveRoles, setDevActiveRolesState] = useState<Role[]>(() => {
    if (!env.devMode || typeof window === "undefined") return [ROLES.SUPER_ADMIN];
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

  // DEV_MODE: auto-mount mock session, skip OIDC entirely.
  useEffect(() => {
    if (env.devMode) {
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
    if (!env.devMode) return;
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
        if (!env.devMode) return;
        setIsDevBypass(true);
        setUser(buildDevUser(devActiveRoles));
        setLoading(false);
      },
      disableDevBypass: () => {
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
