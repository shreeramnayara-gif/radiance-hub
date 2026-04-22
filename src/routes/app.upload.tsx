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
import { Loader2, Upload as UploadIcon, FileArchive, X, ShieldAlert, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/upload")({ component: UploadCasesPage });

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
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

  const upload = useMutation({
    mutationFn: () =>
      studiesService.upload(files, {
        ...(isHospital ? { referringHospital: referring || undefined } : {}),
        ...(isCentre ? { referringCentre: referring || undefined } : {}),
        notes: notes || undefined,
      }),
    onSuccess: (res) => {
      toast.success(`Uploaded ${res.uploaded} file(s) — ${res.studies.length} study record(s) created`);
      setFiles([]);
      setReferring("");
      setNotes("");
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

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const referringLabel = isHospital ? "Referring Hospital" : "Diagnostic Centre";

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Workflow</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Upload Cases</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Upload DICOM files (.dcm) or a zipped study archive. Files are ingested into PACS and added to the worklist for radiologist assignment.
        </p>
      </header>

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
        <div className="mt-6 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="text-sm font-medium">
              {files.length} file(s) · {formatBytes(totalSize)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles([])}
              disabled={upload.isPending}
            >
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
                  disabled={upload.isPending}
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

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="referring">{referringLabel}</Label>
          <Input
            id="referring"
            value={referring}
            onChange={(e) => setReferring(e.target.value)}
            placeholder={`Name of ${referringLabel.toLowerCase()}`}
            disabled={upload.isPending}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes for radiologist (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Clinical history, prior reports, urgency, etc."
            rows={3}
            disabled={upload.isPending}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Files will be sent to PACS ingestion. Large studies may take a few moments to upload.
        </p>
        <Button
          onClick={() => upload.mutate()}
          disabled={files.length === 0 || upload.isPending}
        >
          {upload.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
          ) : (
            <><UploadIcon className="h-4 w-4 mr-2" /> Upload {files.length > 0 ? `${files.length} file(s)` : "cases"}</>
          )}
        </Button>
      </div>

      {upload.isSuccess && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 text-primary p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Upload complete. Cases are queued for assignment.
        </div>
      )}
    </div>
  );
}
