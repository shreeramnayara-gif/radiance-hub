import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { commentsService } from "@/lib/services";
import { canComment, type WorkflowStatus } from "@/lib/workflow";
import { ROLE_LABELS } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export function CommentsPanel({ studyId, status }: { studyId: string; status: WorkflowStatus }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const locked = !canComment(status);

  const { data, isLoading, error } = useQuery({
    queryKey: ["comments", studyId],
    queryFn: () => commentsService.list(studyId),
    refetchInterval: 20_000,
  });

  const post = useMutation({
    mutationFn: (text: string) => commentsService.create(studyId, text),
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["comments", studyId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">Discussion</h3>
        <p className="text-xs text-muted-foreground">{locked ? "Locked — study is FINALIZED." : "Visible to assignee, hospital, and admins."}</p>
      </div>
      <div className="flex-1 max-h-80 overflow-y-auto p-4 space-y-3">
        {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
        {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {data?.map((c) => (
          <div key={c.id} className="text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{c.authorName}</span>
              <span className="text-xs text-muted-foreground">{ROLE_LABELS[c.authorRole]} · {new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-foreground/90 whitespace-pre-wrap mt-0.5">{c.body}</p>
          </div>
        ))}
      </div>
      {!locked && (
        <div className="border-t border-border p-3">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment…" className="resize-none min-h-[64px]" />
          <div className="flex justify-end mt-2">
            <Button size="sm" disabled={!body.trim() || post.isPending} onClick={() => post.mutate(body.trim())}>
              {post.isPending ? "Posting…" : "Post comment"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
