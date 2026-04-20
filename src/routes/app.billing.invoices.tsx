import { createFileRoute } from "@tanstack/react-router";
import { BillingLinesView } from "@/components/billing/BillingLinesView";

export const Route = createFileRoute("/app/billing/invoices")({
  component: () => <BillingLinesView kind="INVOICE" />,
});
