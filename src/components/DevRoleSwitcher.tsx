import { useAuth } from "@/auth/AuthProvider";
import { env } from "@/lib/env";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { Checkbox } from "@/components/ui/checkbox";
import { FlaskConical } from "lucide-react";

/**
 * DEV-ONLY role switcher. Renders nothing in production builds because
 * `env.devMode` is hard-gated to `import.meta.env.DEV`.
 */
export function DevRoleSwitcher() {
  const { isDevBypass, devActiveRoles, setDevActiveRoles } = useAuth();
  if (!env.devMode || !isDevBypass) return null;

  const all = Object.values(ROLES) as Role[];
  const toggle = (role: Role, on: boolean) => {
    const next = on ? [...devActiveRoles, role] : devActiveRoles.filter((r) => r !== role);
    setDevActiveRoles(next);
  };

  return (
    <div className="rounded-md border border-warning/40 bg-warning/10 p-3 mb-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-warning mb-2">
        <FlaskConical className="h-3 w-3" /> Dev Mode · Role Switch
      </div>
      <div className="space-y-1.5">
        {all.map((role) => {
          const checked = devActiveRoles.includes(role);
          return (
            <label key={role} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => toggle(role, v === true)}
              />
              <span>{ROLE_LABELS[role]}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
