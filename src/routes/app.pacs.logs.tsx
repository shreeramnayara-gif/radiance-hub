import { createFileRoute } from "@tanstack/react-router";
import { SyncLogsView } from "@/components/pacs/SyncLogsView";

export const Route = createFileRoute("/app/pacs/logs")({ component: SyncLogsView });
