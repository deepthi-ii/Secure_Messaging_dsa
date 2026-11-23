"use client";

import { History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { KeyStatusBadge } from "@/components/shared/status-badges";
import { pairLabel } from "@/lib/engine/engine";
import { getSessionKeys } from "@/lib/engine/selectors";
import { ROTATION_REASON_LABEL } from "@/lib/engine/session-keys";
import type { LabState } from "@/lib/engine/types";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Key generations for one pair, newest first. */
export function KeyTimeline({ state, pairId }: { state: LabState; pairId: string }) {
  const keys = getSessionKeys(state, pairId).slice().reverse();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key timeline{pairId && state.sessions[pairId] ? `: ${pairLabel(state, pairId)}` : ""}</CardTitle>
        <CardDescription>Each generation is derived one-way from the previous one, then the old material is wiped.</CardDescription>
      </CardHeader>
      <CardContent>
        {keys.length === 0 ? (
          <EmptyState icon={History} title="Select a session" description="Choose a row in the session table to see its key generations." />
        ) : (
          <ol className="scrollbar-thin max-h-[520px] overflow-y-auto pr-1">
            {keys.map((k, i) => (
              <li key={k.keyId} className="relative flex gap-3 pb-4">
                {i < keys.length - 1 && <span aria-hidden className="absolute top-6 bottom-0 left-[7px] w-px bg-border" />}
                <span
                  aria-hidden
                  className={cn("relative z-10 mt-1 size-[15px] shrink-0 rounded-full border-2", k.status === "active" ? "border-teal bg-teal/30" : "border-input bg-background")}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-hash text-sm">{k.keyId}</span>
                    <span className="text-xs text-muted-foreground">generation {k.generation}</span>
                    <KeyStatusBadge status={k.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {formatTime(k.createdAt)}
                    {k.expiredAt && ` · expired ${formatTime(k.expiredAt)} (${ROTATION_REASON_LABEL[k.expiredReason!].toLowerCase()})`} · {k.messageCount} messages
                  </p>
                  <p className="mt-1 text-xs">
                    <span className="text-muted-foreground">Fingerprint </span>
                    <span className="font-hash">{k.fingerprint}</span>
                    <span className="text-muted-foreground"> · material </span>
                    {k.material ? <span className="text-teal">held in memory</span> : <span className="text-muted-foreground line-through decoration-destructive/70">wiped</span>}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
