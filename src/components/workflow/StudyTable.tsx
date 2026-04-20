import { Link } from "@tanstack/react-router";
import { StatusBadge } from "./StatusBadge";
import { ANON_LABEL, isAnonymizedAudience } from "@/lib/workflow";
import type { Study } from "@/lib/types";
import type { Role } from "@/lib/roles";

interface Props {
  studies: Study[];
  roles: Role[];
  emptyHint?: string;
  /** Optional row-level action slot (e.g. Claim button). */
  renderActions?: (s: Study) => React.ReactNode;
}

export function StudyTable({ studies, roles, emptyHint, renderActions }: Props) {
  const anon = isAnonymizedAudience(roles);

  if (studies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        {emptyHint ?? "No studies match the current filters."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Patient</th>
            <th className="text-left px-4 py-3 font-medium">Modality / Body</th>
            <th className="text-left px-4 py-3 font-medium">Study Date</th>
            <th className="text-left px-4 py-3 font-medium">Source</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Assignee</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {studies.map((s) => {
            const source = anon
              ? ANON_LABEL
              : s.referringHospital || s.referringCentre || s.pacsSourceName || "—";
            const patientLabel = anon ? ANON_LABEL : s.patient.name || s.patient.id;
            return (
              <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link to="/app/studies/$studyId" params={{ studyId: s.id }} className="font-medium hover:underline">
                    {patientLabel}
                  </Link>
                  <div className="text-xs text-muted-foreground font-mono truncate max-w-[18ch]">{s.studyInstanceUID}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{s.modality}</div>
                  <div className="text-xs text-muted-foreground">{s.bodyPart ?? "—"}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(s.studyDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-muted-foreground truncate max-w-[20ch]">{source}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{s.assignee?.fullName ?? "—"}</td>
                <td className="px-4 py-3 text-right">{renderActions?.(s)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
