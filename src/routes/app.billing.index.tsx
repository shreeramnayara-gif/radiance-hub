import { createFileRoute } from "@tanstack/react-router";
import { BillingOverview } from "@/components/billing/BillingOverview";

export const Route = createFileRoute("/app/billing/")({ component: BillingOverview });
