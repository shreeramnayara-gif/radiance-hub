import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studiesService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import { ROLES } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Upload as UploadIcon,
  FileArchive,
  X,
  ShieldAlert,
  CheckCircle2,
  User,
  Stethoscope,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/app/upload")({ component: UploadCasesPage });

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const MODALITIES = ["CT", "MR", "CR", "DX", "US", "MG", "PT", "NM", "XA", "OT"];
const URGENCIES: Array<"routine" | "urgent" | "stat"> = ["routine", "urgent", "stat"];

interface PatientForm {
  patientName: string;
  patientId: string;
  patientMrn: string;
  patientSex: "" | "M" | "F" | "O";
  patientBirthDate: string;
  patientAge: string;
  patientPhone: string;
}

interface StudyForm {
  modality: string;
  bodyPart: string;
  requestedStudy: string;
  accessionNumber: string;
}

interface ClinicalForm {
  referringPhysician: string;
  indication: string;
  clinicalHistory: string;
  priorImaging: string;
  allergies: string;
  urgency: "" | "routine" | "urgent" | "stat";
}

function UploadCasesPage() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const isHospital = roles.includes(ROLES.HOSPITAL);
  const isCentre = roles.includes(ROLES.DIAGNOSTIC_CENTRE);
  const allowed = isHospital || isCentre;

  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [referring, setReferring] = useState("");
  const [notes, setNotes] = useState("");

  const [patient, setPatient] = useState<PatientForm>({
    patientName: "",
    patientId: "",
    patientMrn: "",
    patientSex: "",
    patientBirthDate: "",
    patientAge: "",
    patientPhone: "",
  });
  const [studyForm, setStudyForm] = useState<StudyForm>({
    modality: "",
    bodyPart: "",
    requestedStudy: "",
    accessionNumber: "",
  });
  const [clinical, setClinical] = useState<ClinicalForm>({
    referringPhysician: "",
    indication: "",
    clinicalHistory: "",
    priorImaging: "",
    allergies: "",
    urgency: "",
  });

  const upload = useMutation({
    mutationFn: () =>
      studiesService.upload(files, {
        ...(isHospital ? { referringHospital: referring || undefined } : {}),
        ...(isCentre ? { referringCentre: referring || undefined } : {}),
        notes: notes || undefined,
        patientName: patient.patientName || undefined,
        patientId: patient.patientId || undefined,
        patientMrn: patient.patientMrn || undefined,
        patientSex: patient.patientSex || undefined,
        patientBirthDate: patient.patientBirthDate || undefined,
        patientAge: patient.patientAge || undefined,
        patientPhone: patient.patientPhone || undefined,
        modality: studyForm.modality || undefined,
        bodyPart: studyForm.bodyPart || undefined,
        requestedStudy: studyForm.requestedStudy || undefined,
        accessionNumber: studyForm.accessionNumber || undefined,
        referringPhysician: clinical.referringPhysician || undefined,
        indication: clinical.indication || undefined,
        clinicalHistory: clinical.clinicalHistory || undefined,
        priorImaging: clinical.priorImaging || undefined,
        allergies: clinical.allergies || undefined,
        urgency: clinical.urgency || undefined,
      }),
    onSuccess: (res) => {
      toast.success(`Uploaded ${res.uploaded} file(s) — ${res.studies.length} study record(s) created`);
      setFiles([]);
      setReferring("");
      setNotes("");
      setPatient({
        patientName: "",
        patientId: "",
        patientMrn: "",
        patientSex: "",
        patientBirthDate: "",
        patientAge: "",
        patientPhone: "",
      });
      setStudyForm({ modality: "", bodyPart: "", requestedStudy: "", accessionNumber: "" });
      setClinical({
        referringPhysician: "",
        indication: "",
        clinicalHistory: "",
        priorImaging: "",
        allergies: "",
        urgency: "",
      });
      qc.invalidateQueries({ queryKey: ["studies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!allowed) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="rounded-xl border border-border bg-card p-6 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h2 className="font-display text-lg font-semibold">Hospitals & Diagnostic Centres only</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Case uploads are restricted to referring facilities.
            </p>
            <Link to="/app" className="text-sm text-primary underline-offset-4 hover:underline mt-3 inline-block">
              Back to overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const addFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...arr.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const referringLabel = isHospital ? "Referring Hospital" : "Diagnostic Centre";
  const busy = upload.isPending;
  const canSubmit =
    files.length > 0 &&
    patient.patientName.trim().length > 0 &&
    !!studyForm.modality &&
    clinical.indication.trim().length > 0;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Workflow</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Upload Cases</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Provide patient demographics and clinical context along with the DICOM images. The reporting
          radiologist will see this information when opening the study.
        </p>
      </header>

      {/* Files */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <FileArchive className="h-4 w-4" /> DICOM files
        </h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-card"
          }`}
        >
          <UploadIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Drag & drop DICOM files or a .zip archive</p>
          <p className="text-xs text-muted-foreground mt-1">or</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".dcm,.zip,application/dicom,application/zip"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>
        </div>

        {files.length > 0 && (
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="text-sm font-medium">
                {files.length} file(s) · {formatBytes(totalSize)}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={busy}>
                Clear all
              </Button>
            </div>
            <ul className="divide-y divide-border max-h-64 overflow-y-auto">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileArchive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatBytes(f.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    disabled={busy}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Patient */}
      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4" /> Patient details
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="patientName">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="patientName"
              value={patient.patientName}
              onChange={(e) => setPatient({ ...patient, patientName: e.target.value })}
              placeholder="e.g. Jane Doe"
              disabled={busy}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patientId">Patient ID</Label>
            <Input
              id="patientId"
              value={patient.patientId}
              onChange={(e) => setPatient({ ...patient, patientId: e.target.value })}
              placeholder="Local identifier"
              disabled={busy}
              maxLength={64}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patientMrn">MRN</Label>
            <Input
              id="patientMrn"
              value={patient.patientMrn}
              onChange={(e) => setPatient({ ...patient, patientMrn: e.target.value })}
              placeholder="Medical record number"
              disabled={busy}
              maxLength={64}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patientSex">Sex</Label>
            <Select
              value={patient.patientSex}
              onValueChange={(v) => setPatient({ ...patient, patientSex: v as PatientForm["patientSex"] })}
              disabled={busy}
            >
              <SelectTrigger id="patientSex">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="O">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="patientBirthDate">Date of birth</Label>
            <Input
              id="patientBirthDate"
              type="date"
              value={patient.patientBirthDate}
              onChange={(e) => setPatient({ ...patient, patientBirthDate: e.target.value })}
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patientAge">Age</Label>
            <Input
              id="patientAge"
              type="number"
              min={0}
              max={130}
              value={patient.patientAge}
              onChange={(e) => setPatient({ ...patient, patientAge: e.target.value })}
              placeholder="Years"
              disabled={busy}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="patientPhone">Contact phone</Label>
            <Input
              id="patientPhone"
              value={patient.patientPhone}
              onChange={(e) => setPatient({ ...patient, patientPhone: e.target.value })}
              placeholder="Optional"
              disabled={busy}
              maxLength={32}
            />
          </div>
        </div>
      </section>

      {/* Study request */}
      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Stethoscope className="h-4 w-4" /> Study request
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="modality">
              Modality <span className="text-destructive">*</span>
            </Label>
            <Select
              value={studyForm.modality}
              onValueChange={(v) => setStudyForm({ ...studyForm, modality: v })}
              disabled={busy}
            >
              <SelectTrigger id="modality">
                <SelectValue placeholder="Select modality" />
              </SelectTrigger>
              <SelectContent>
                {MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bodyPart">Body part</Label>
            <Input
              id="bodyPart"
              value={studyForm.bodyPart}
              onChange={(e) => setStudyForm({ ...studyForm, bodyPart: e.target.value })}
              placeholder="e.g. Chest, Brain, Abdomen"
              disabled={busy}
              maxLength={64}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requestedStudy">Requested study / protocol</Label>
            <Input
              id="requestedStudy"
              value={studyForm.requestedStudy}
              onChange={(e) => setStudyForm({ ...studyForm, requestedStudy: e.target.value })}
              placeholder="e.g. CT Chest with contrast"
              disabled={busy}
              maxLength={128}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessionNumber">Accession #</Label>
            <Input
              id="accessionNumber"
              value={studyForm.accessionNumber}
              onChange={(e) => setStudyForm({ ...studyForm, accessionNumber: e.target.value })}
              placeholder="Optional"
              disabled={busy}
              maxLength={64}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referring">{referringLabel}</Label>
            <Input
              id="referring"
              value={referring}
              onChange={(e) => setReferring(e.target.value)}
              placeholder={`Name of ${referringLabel.toLowerCase()}`}
              disabled={busy}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency</Label>
            <Select
              value={clinical.urgency}
              onValueChange={(v) => setClinical({ ...clinical, urgency: v as ClinicalForm["urgency"] })}
              disabled={busy}
            >
              <SelectTrigger id="urgency">
                <SelectValue placeholder="Routine" />
              </SelectTrigger>
              <SelectContent>
                {URGENCIES.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Clinical context */}
      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" /> Clinical context for radiologist
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="referringPhysician">Referring physician</Label>
            <Input
              id="referringPhysician"
              value={clinical.referringPhysician}
              onChange={(e) => setClinical({ ...clinical, referringPhysician: e.target.value })}
              placeholder="Dr. Name"
              disabled={busy}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="indication">
              Indication / reason for study <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="indication"
              value={clinical.indication}
              onChange={(e) => setClinical({ ...clinical, indication: e.target.value })}
              placeholder="Why is this study being requested?"
              rows={2}
              disabled={busy}
              maxLength={1000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinicalHistory">Clinical history</Label>
            <Textarea
              id="clinicalHistory"
              value={clinical.clinicalHistory}
              onChange={(e) => setClinical({ ...clinical, clinicalHistory: e.target.value })}
              placeholder="Relevant symptoms, duration, exam findings, comorbidities…"
              rows={3}
              disabled={busy}
              maxLength={2000}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priorImaging">Prior imaging / reports</Label>
              <Textarea
                id="priorImaging"
                value={clinical.priorImaging}
                onChange={(e) => setClinical({ ...clinical, priorImaging: e.target.value })}
                placeholder="Dates and findings of prior studies, if any"
                rows={2}
                disabled={busy}
                maxLength={1000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies / alerts</Label>
              <Textarea
                id="allergies"
                value={clinical.allergies}
                onChange={(e) => setClinical({ ...clinical, allergies: e.target.value })}
                placeholder="Contrast allergies, renal function, pregnancy, etc."
                rows={2}
                disabled={busy}
                maxLength={500}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else the reporting radiologist should know"
              rows={2}
              disabled={busy}
              maxLength={1000}
            />
          </div>
        </div>
      </section>

      <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          <span className="text-destructive">*</span> Required: patient name, modality, indication. Files are sent
          to PACS ingestion; metadata is attached to the resulting study.
        </p>
        <Button onClick={() => upload.mutate()} disabled={!canSubmit || busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <UploadIcon className="h-4 w-4 mr-2" /> Upload {files.length > 0 ? `${files.length} file(s)` : "case"}
            </>
          )}
        </Button>
      </div>

      {upload.isSuccess && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 text-primary p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Upload complete. Patient details and clinical context were attached
          and are now visible to the assigned radiologist.
        </div>
      )}
    </div>
  );
}
