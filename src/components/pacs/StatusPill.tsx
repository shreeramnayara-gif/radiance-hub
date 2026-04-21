import { cn } from "@/lib/utils";
import type { PacsEndpointStatus, IngestionEventStatus, SyncLogLevel } from "@/lib/pacs";

const ENDPOINT_TONE: Record<PacsEndpointStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  disabled: "bg-muted text-muted-foreground border-border",
  error: "bg-destructive/15 text-destructive border-destructive/30",
};

const INGESTION_TONE: Record<IngestionEventStatus, string> = {
  received: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  processing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ingested: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  duplicate: "bg-muted text-muted-foreground border-border",
};

const LOG_TONE: Record<SyncLogLevel, string> = {
  info: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  warn: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
};

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider", tone)}>
      {children}
    </span>
  );
}

export function EndpointStatusPill({ status }: { status: PacsEndpointStatus }) {
  return <Pill tone={ENDPOINT_TONE[status]}>{status}</Pill>;
}

export function IngestionStatusPill({ status }: { status: IngestionEventStatus }) {
  return <Pill tone={INGESTION_TONE[status]}>{status}</Pill>;
}

export function LogLevelPill({ level }: { level: SyncLogLevel }) {
  return <Pill tone={LOG_TONE[level]}>{level}</Pill>;
}
