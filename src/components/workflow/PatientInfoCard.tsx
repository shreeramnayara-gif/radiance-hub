import type { Study } from "@/lib/types";
import { User, Stethoscope, FileText, AlertTriangle, Clock } from "lucide-react";

interface Props {
  study: Study;
  anonymized?: boolean;
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground min-w-32">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function PatientInfoCard({ study, anonymized }: Props) {
  const p = study.patient;
  const c = study.clinical;
  const urgency = c?.urgency;

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      <section className="p-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
          <User className="h-3.5 w-3.5" /> Patient
        </h3>
        {anonymized ? (
          <p className="text-sm text-muted-foreground italic">Anonymized — patient details hidden for your role.</p>
        ) : (
          <div className="space-y-1.5">
            <Row label="Name" value={p.name} />
            <Row label="Patient ID" value={p.id} />
            <Row label="MRN" value={p.mrn} />
            <Row label="Sex" value={p.sex} />
            <Row label="DOB" value={p.birthDate ? new Date(p.birthDate).toLocaleDateString() : null} />
            <Row label="Age" value={p.age ?? null} />
            <Row label="Phone" value={p.phone} />
          </div>
        )}
      </section>

      <section className="p-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
          <Stethoscope className="h-3.5 w-3.5" /> Study Request
        </h3>
        <div className="space-y-1.5">
          <Row label="Modality" value={study.modality} />
          <Row label="Body part" value={study.bodyPart} />
          <Row label="Requested" value={study.requestedStudy} />
          <Row label="Accession #" value={study.accessionNumber} />
          <Row label="Referring" value={study.referringHospital ?? study.referringCentre} />
          {!anonymized && <Row label="Physician" value={c?.referringPhysician} />}
          {urgency && (
            <div className="flex gap-2 text-sm items-center">
              <span className="text-muted-foreground min-w-32">Urgency</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  urgency === "stat"
                    ? "bg-destructive/15 text-destructive"
                    : urgency === "urgent"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Clock className="h-3 w-3" /> {urgency.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </section>

      {(c?.clinicalHistory || c?.indication || c?.priorImaging) && (
        <section className="p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
            <FileText className="h-3.5 w-3.5" /> Clinical Context
          </h3>
          <div className="space-y-3 text-sm">
            {c?.indication && (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Indication</div>
                <p className="whitespace-pre-wrap">{c.indication}</p>
              </div>
            )}
            {c?.clinicalHistory && (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Clinical history</div>
                <p className="whitespace-pre-wrap">{c.clinicalHistory}</p>
              </div>
            )}
            {c?.priorImaging && (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Prior imaging</div>
                <p className="whitespace-pre-wrap">{c.priorImaging}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {c?.allergies && (
        <section className="p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Allergies / Alerts
          </h3>
          <p className="text-sm whitespace-pre-wrap">{c.allergies}</p>
        </section>
      )}
    </div>
  );
}
