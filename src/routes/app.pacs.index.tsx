import { createFileRoute } from "@tanstack/react-router";
import { HealthDashboard } from "@/components/pacs/HealthDashboard";

export const Route = createFileRoute("/app/pacs/")({ component: HealthDashboard });
