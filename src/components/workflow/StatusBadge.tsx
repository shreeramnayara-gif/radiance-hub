import { WORKFLOW_LABELS, WORKFLOW_TONE, type WorkflowStatus } from "@/lib/workflow";

export function StatusBadge({ status }: { status: WorkflowStatus }) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border ${WORKFLOW_TONE[status]}`}>
      {WORKFLOW_LABELS[status]}
    </span>
  );
}
