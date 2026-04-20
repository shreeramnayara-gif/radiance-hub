import { useQuery } from "@tanstack/react-query";
import { studiesService } from "@/lib/services";
import { env } from "@/lib/env";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Embeds the OHIF viewer in an iframe.
 * Prefers a backend-minted signed viewer URL (`GET /studies/{id}/viewer-url`),
 * falls back to direct `${VITE_OHIF_VIEWER_URL}?StudyInstanceUIDs=…` if the
 * backend hasn't shipped that endpoint yet.
 */
export function ViewerFrame({ studyId, studyInstanceUID }: { studyId: string; studyInstanceUID: string }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["viewer-url", studyId],
    queryFn: () => studiesService.viewerUrl(studyId),
    retry: 0,
    staleTime: 60_000,
  });

  const fallback = env.ohif.viewerUrl
    ? `${env.ohif.viewerUrl}${env.ohif.viewerUrl.includes("?") ? "&" : "?"}StudyInstanceUIDs=${encodeURIComponent(studyInstanceUID)}`
    : "";
  const url = data?.url ?? (error ? fallback : "");

  if (isLoading && !fallback) {
    return (
      <div className="h-full grid place-items-center text-sm text-muted-foreground">
        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Preparing viewer…</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="h-full grid place-items-center text-sm text-muted-foreground p-6 text-center">
        <div>
          <p>Viewer URL not configured.</p>
          <p className="mt-1 text-xs">Set <code>VITE_OHIF_VIEWER_URL</code> or implement <code>GET /studies/&#123;id&#125;/viewer-url</code>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 text-xs">
        <span className="text-muted-foreground">OHIF Viewer</span>
        <Button asChild variant="ghost" size="sm" className="h-7">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3 w-3 mr-1" /> Open in tab
          </a>
        </Button>
      </div>
      <iframe
        src={url}
        title="OHIF Viewer"
        className="flex-1 w-full bg-black"
        allow="fullscreen"
      />
    </div>
  );
}
