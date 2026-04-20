import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { commentsService, reportsService, studiesService } from "@/lib/services";
import { useAuth } from "@/auth/AuthProvider";
import {
  ANON_LABEL,
  canAssign,
  canFinalize,
  canOpen,
  canRelease,
  canSubmit,
  isAnonymizedAudience,
} from "@/lib/workflow";
import { StatusBadge } from "@/components/workflow/StatusBadge";
import { ViewerFrame } from "@/components/workflow/ViewerFrame";
import { ReportEditor } from "@/components/workflow/ReportEditor";
import { CommentsPanel } from "@/components/workflow/CommentsPanel";
import { AssignDialog } from "@/components/workflow/AssignDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, FileCheck2, History, Loader2, RotateCcw, Send, UserPlus } from "lucide-react";

export const Route = createFileRoute("/app/studies/$studyId")({ component: StudyWorkspace });

function StudyWorkspace() {
  const { studyId } = Route.useParams();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const userId = (user?.profile?.sub as string | undefined) ?? "";
  const anon = isAnonymizedAudience(roles);

  const studyQ = useQuery({
    queryKey: ["study", studyId],
    queryFn: () => studiesService.get(studyId),
    refetchInterval: 30_000,
  });
  const reportQ = useQuery({
    queryKey: ["report", studyId],
    queryFn: () => reportsService.get(studyId),
  });

  const study = studyQ.data;
  const isAssignee = !!study?.assignee && study.assignee.id === userId;
  const perm = study ? { status: study.status, roles, isAssignee } : null;

  // ---- Auto-transition ASSIGNED → IN_REPORTING when the assignee opens it.
  const openMut = useMutation({
    mutationFn: () => studiesService.open(studyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study", studyId] }),
  });
  const openedRef = useRef(false);
  useEffect(() => {
    if (!study || openedRef.current) return;
    if (perm && canOpen(perm)) {
      openedRef.current = true;
      openMut.mutate();
    }
  }, [study, perm, openMut]);

  // ---- Draft autosave (debounced).
  const [draftHtml, setDraftHtml] = useState<string>("");
  const [draftText, setDraftText] = useState<string>("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    if (reportQ.data) {
      const seed = reportQ.data.draft?.contentHtml ?? reportQ.data.latest?.contentHtml ?? "";
      setDraftHtml(seed);
      seededRef.current = true;
    }
  }, [reportQ.data]);

  const saveDraft = useMutation({
    mutationFn: ({ html, text }: { html: string; text: string }) =>
      reportsService.saveDraft(studyId, html, text),
    onSuccess: () => setSavedAt(new Date()),
  });

  useEffect(() => {
    if (!seededRef.current) return;
    if (!study || study.status === "FINALIZED") return;
    if (!isAssignee) return;
    const t = setTimeout(() => {
      if (draftHtml) saveDraft.mutate({ html: draftHtml, text: draftText });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftHtml, draftText]);

  // ---- Other transitions
  const submit = useMutation({
    mutationFn: () => reportsService.submit(studyId),
    onSuccess: () => {
      toast.success("Report submitted");
      qc.invalidateQueries({ queryKey: ["study", studyId] });
      qc.invalidateQueries({ queryKey: ["report", studyId] });
      qc.invalidateQueries({ queryKey: ["report-versions", studyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const release = useMutation({
    mutationFn: () => studiesService.release(studyId),
    onSuccess: () => { toast.success("Returned to Free Pool"); navigate({ to: "/app/free-pool" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const finalize = useMutation({
    mutationFn: () => studiesService.finalize(studyId),
    onSuccess: () => { toast.success("Study finalized"); qc.invalidateQueries({ queryKey: ["study", studyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const assign = useMutation({
    mutationFn: (assigneeId: string) => studiesService.assign(studyId, assigneeId),
    onSuccess: () => { toast.success("Assignee updated"); qc.invalidateQueries({ queryKey: ["study", studyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const versionsQ = useQuery({
    queryKey: ["report-versions", studyId],
    queryFn: () => reportsService.versions(studyId),
    enabled: !!study && study.status !== "FREE_POOL",
  });

  // Pre-warm comments so panel feels instant.
  useEffect(() => { void qc.prefetchQuery({ queryKey: ["comments", studyId], queryFn: () => commentsService.list(studyId) }); }, [studyId, qc]);

  const heading = useMemo(() => {
    if (!study) return "";
    if (anon) return ANON_LABEL;
    return study.patient.name || study.patient.id || study.studyInstanceUID;
  }, [study, anon]);

  if (studyQ.isLoading) {
    return <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading study…</div>;
  }
  if (studyQ.error || !study) {
    return (
      <div className="p-8 max-w-2xl">
        <Link to="/app/studies" className="text-sm text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back to Studies</Link>
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-4 text-sm">
          Failed to load study: {(studyQ.error as Error | undefined)?.message ?? "Not found"}.
        </div>
      </div>
    );
  }

  const editorReadOnly = !isAssignee || study.status === "FINALIZED" || study.status === "SUBMITTED";

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="px-6 py-3 border-b border-border bg-card flex items-center gap-4 flex-wrap">
        <Link to="/app/studies" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Studies</Link>
        <div className="min-w-0">
          <h1 className="text-lg font-display font-semibold tracking-tight truncate">{heading}</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-3">
            <span>{study.modality}{study.bodyPart ? ` · ${study.bodyPart}` : ""}</span>
            <span>{new Date(study.studyDate).toLocaleString()}</span>
            {!anon && (study.referringHospital || study.referringCentre || study.pacsSourceName) && (
              <span>{study.referringHospital || study.referringCentre || study.pacsSourceName}</span>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <StatusBadge status={study.status} />
          {study.assignee && <span className="text-xs text-muted-foreground">→ {study.assignee.fullName}</span>}
          {perm && canAssign(perm) && (
            <AssignDialog
              currentAssigneeId={study.assignee?.id ?? null}
              pending={assign.isPending}
              onAssign={(id) => assign.mutate(id)}
              trigger={<Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> {study.assignee ? "Reassign" : "Assign"}</Button>}
            />
          )}
          {perm && canRelease(perm) && (
            <Button size="sm" variant="outline" onClick={() => release.mutate()} disabled={release.isPending}>
              <RotateCcw className="h-4 w-4 mr-1" /> Return to pool
            </Button>
          )}
          {perm && canSubmit(perm) && (
            <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending || !draftHtml}>
              <Send className="h-4 w-4 mr-1" /> {submit.isPending ? "Submitting…" : "Submit report"}
            </Button>
          )}
          {perm && canFinalize(perm) && (
            <Button size="sm" onClick={() => finalize.mutate()} disabled={finalize.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Finalize
            </Button>
          )}
        </div>
      </header>

      {/* Main split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] min-h-0">
        <section className="border-r border-border min-h-0">
          <ViewerFrame studyId={study.id} studyInstanceUID={study.studyInstanceUID} />
        </section>
        <section className="overflow-y-auto p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Report</h2>
              <span className="text-xs text-muted-foreground">
                {editorReadOnly
                  ? (study.status === "FINALIZED" ? "Read-only — finalized" : study.status === "SUBMITTED" ? "Read-only — submitted" : "Read-only — not assignee")
                  : saveDraft.isPending
                  ? "Saving draft…"
                  : savedAt
                  ? `Draft saved ${savedAt.toLocaleTimeString()}`
                  : "Auto-saves as you type"}
              </span>
            </div>
            <ReportEditor
              initialHtml={draftHtml}
              readOnly={editorReadOnly}
              onChange={(html, text) => { setDraftHtml(html); setDraftText(text); }}
            />
          </div>

          {versionsQ.data && versionsQ.data.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><History className="h-4 w-4" /> Versions</h3>
              <ul className="rounded-md border border-border bg-card divide-y divide-border text-sm">
                {versionsQ.data.map((v) => (
                  <li key={v.id} className="px-3 py-2 flex items-center justify-between">
                    <span>v{v.version} · {v.status}</span>
                    <span className="text-xs text-muted-foreground">{v.authorName} · {new Date(v.submittedAt ?? v.updatedAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <CommentsPanel studyId={study.id} status={study.status} />
        </section>
      </div>
    </div>
  );
}
