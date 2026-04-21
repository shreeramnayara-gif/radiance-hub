import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { searchService } from "@/lib/services";
import { SEARCH_KIND_LABELS, type SearchHitKind } from "@/lib/analytics";
import { WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/workflow";
import { StatusBadge } from "@/components/workflow/StatusBadge";

export const Route = createFileRoute("/app/search")({ component: SearchPage });

const MODALITIES = ["CT", "MR", "CR", "DX", "US", "MG", "NM", "PT", "XA", "OT"] as const;
const STATUSES: WorkflowStatus[] = ["FREE_POOL", "ASSIGNED", "IN_REPORTING", "SUBMITTED", "FINALIZED"];

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

function SearchPage() {
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [modality, setModality] = useState<string>("all");
  const [status, setStatus] = useState<WorkflowStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = {
    q: q.trim() || undefined,
    modality: modality === "all" ? undefined : [modality],
    status: status === "all" ? undefined : [status],
    from: from || undefined,
    to: to || undefined,
    pageSize: 50,
  };

  const enabled = Boolean(params.q || params.modality || params.status || params.from || params.to);

  const { data, isFetching, error } = useQuery({
    queryKey: ["search", params],
    queryFn: () => searchService.search(params),
    enabled,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Discovery</p>
        <h1 className="text-3xl font-display font-bold tracking-tight mt-1">Global search</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Search across studies, reports, and patients. Patient names are anonymized for radiologist accounts.
        </p>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); setQ(draftQ); }}
        className="rounded-xl border border-border bg-card p-4 space-y-4"
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder="Patient name, accession, Study UID, body part…"
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={modality} onValueChange={setModality}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Modality" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modalities</SelectItem>
              {MODALITIES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{WORKFLOW_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        </div>
      </form>

      <section className="mt-6">
        {!enabled && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
            Enter a query or pick filters to search.
          </div>
        )}
        {enabled && isFetching && (
          <div className="text-sm text-muted-foreground">Searching…</div>
        )}
        {enabled && error && (
          <div className="text-sm text-destructive">{(error as Error).message}</div>
        )}
        {enabled && data && (
          <>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-display font-semibold">{data.total} results</h2>
              {data.tookMs != null && <span className="text-xs text-muted-foreground">{data.tookMs} ms</span>}
            </div>
            <ul className="space-y-2">
              {data.items.map((h) => <SearchRow key={`${h.kind}:${h.id}`} hit={h} />)}
              {data.items.length === 0 && (
                <li className="text-sm text-muted-foreground">No matches.</li>
              )}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function SearchRow({ hit }: { hit: { id: string; kind: SearchHitKind; title: string; subtitle?: string | null; modality?: string | null; bodyPart?: string | null; status?: WorkflowStatus | null; studyId?: string | null; studyInstanceUID?: string | null; studyDate?: string | null; matchedField?: string | null } }) {
  const linkable = hit.studyId;
  const Body = (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <span>{SEARCH_KIND_LABELS[hit.kind]}</span>
            {hit.matchedField && <span className="text-primary/70">· matched {hit.matchedField}</span>}
          </div>
          <div className="font-medium mt-1 truncate">{hit.title}</div>
          {hit.subtitle && <div className="text-sm text-muted-foreground truncate">{hit.subtitle}</div>}
          {hit.studyInstanceUID && (
            <div className="font-mono text-[11px] text-muted-foreground mt-1 truncate">{hit.studyInstanceUID}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {hit.status && <StatusBadge status={hit.status} />}
          <div className="text-xs text-muted-foreground">
            {[hit.modality, hit.bodyPart].filter(Boolean).join(" · ")}
            {hit.studyDate && ` · ${formatDate(hit.studyDate)}`}
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <li>
      {linkable ? (
        <Link to="/app/studies/$studyId" params={{ studyId: linkable }}>{Body}</Link>
      ) : Body}
    </li>
  );
}
