import { createFileRoute } from "@tanstack/react-router";
import { BillingLinesView } from "@/components/billing/BillingLinesView";

export const Route = createFileRoute("/app/billing/payouts")({
  component: () => <BillingLinesView kind="PAYOUT" />,
});
