import { createFileRoute } from "@tanstack/react-router";
import { IngestionMonitor } from "@/components/pacs/IngestionMonitor";

export const Route = createFileRoute("/app/pacs/ingestion")({ component: IngestionMonitor });
