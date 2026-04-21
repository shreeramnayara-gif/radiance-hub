import { createFileRoute } from "@tanstack/react-router";
import { EndpointsTable } from "@/components/pacs/EndpointsTable";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";

export const Route = createFileRoute("/app/pacs/endpoints")({ component: EndpointsRoute });

function EndpointsRoute() {
  const { roles } = useAuth();
  const canEdit = roles.includes(ROLES.SUPER_ADMIN) || roles.includes(ROLES.PACS);
  if (!canEdit) {
    return <div className="text-sm text-muted-foreground">Endpoint configuration is restricted to Super Admins and PACS Integration users.</div>;
  }
  return <EndpointsTable />;
}
