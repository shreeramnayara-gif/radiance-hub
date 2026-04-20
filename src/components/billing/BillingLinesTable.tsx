import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BILLING_LINE_STATUS_TONE, type BillingLine } from "@/lib/billing";
import { formatMoney } from "@/lib/format";
import { AlertTriangle, BadgeCheck } from "lucide-react";

interface Props {
  lines: BillingLine[];
  /** Show the "Party" column (admins only — radiologists/clients see only their own). */
  showParty?: boolean;
  /** Show "Mark paid" admin action. */
  canMarkPaid?: boolean;
  onMarkPaid?: (line: BillingLine) => void;
  markPaidPendingId?: string;
}

export function BillingLinesTable({ lines, showParty, canMarkPaid, onMarkPaid, markPaidPendingId }: Props) {
  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        No billing lines for this filter.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Study</th>
            <th className="text-left px-4 py-3 font-medium">Modality / Body</th>
            {showParty && <th className="text-left px-4 py-3 font-medium">Party</th>}
            <th className="text-left px-4 py-3 font-medium">Version</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-right px-4 py-3 font-medium">Amount</th>
            {canMarkPaid && <th className="text-right px-4 py-3 font-medium">Action</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-t border-border">
              <td className="px-4 py-3">
                <Link to="/app/studies/$studyId" params={{ studyId: l.studyId }} className="font-medium hover:underline">
                  Open study
                </Link>
                <div className="text-xs text-muted-foreground font-mono truncate max-w-[18ch]">{l.studyInstanceUID}</div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium">{l.modality}</div>
                <div className="text-xs text-muted-foreground">{l.bodyPart ?? "—"}</div>
              </td>
              {showParty && (
                <td className="px-4 py-3">
                  <div className="font-medium">{l.partyName}</div>
                  <div className="text-xs text-muted-foreground">{l.partyRole.replace("_", " ")}</div>
                </td>
              )}
              <td className="px-4 py-3 text-muted-foreground">v{l.reportVersion}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border ${BILLING_LINE_STATUS_TONE[l.status]}`}>
                  {l.status}
                </span>
                {l.warning === "MISSING_RULE" && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-warning-foreground">
                    <AlertTriangle className="h-3 w-3" /> No rule matched
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {formatMoney(l.amount, l.currency)}
              </td>
              {canMarkPaid && (
                <td className="px-4 py-3 text-right">
                  {(l.status === "LOCKED" || l.status === "PENDING") && (
                    <Button size="sm" variant="outline" disabled={markPaidPendingId === l.id} onClick={() => onMarkPaid?.(l)}>
                      <BadgeCheck className="h-4 w-4 mr-1" /> Mark paid
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
