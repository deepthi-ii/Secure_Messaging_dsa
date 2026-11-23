import { Badge } from "@/components/ui/badge";
import type { Batch, KeyStatus, ReplayMode, ReplayReason } from "@/lib/engine/types";

export function KeyStatusBadge({ status }: { status: KeyStatus }) {
  return status === "active" ? <Badge variant="teal">Active</Badge> : <Badge variant="outline">Expired</Badge>;
}

export function BatchStatusBadge({ batch }: { batch: Batch }) {
  if (batch.status === "open") return <Badge variant="default">Collecting</Badge>;
  if (!batch.lastVerification) return <Badge variant="outline">Sealed</Badge>;
  return batch.lastVerification.valid ? <Badge variant="teal">Verified</Badge> : <Badge variant="destructive">Failed</Badge>;
}

export const REPLAY_REASON_LABEL: Record<ReplayReason, string> = {
  "duplicate-id": "Duplicate message ID",
  "stale-sequence": "Stale sequence number",
};

export const REPLAY_MODE_LABEL: Record<ReplayMode, string> = {
  exact: "Exact copy",
  "forged-id": "Forged new ID",
  evicted: "Evicted from window",
};

export function ReplayReasonBadge({ reason }: { reason: ReplayReason }) {
  return <Badge variant={reason === "duplicate-id" ? "destructive" : "amber"}>{REPLAY_REASON_LABEL[reason]}</Badge>;
}
