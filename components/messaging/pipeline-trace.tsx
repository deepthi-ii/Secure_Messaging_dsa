"use client";

import { Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { EVENT_ICON, EVENT_KIND_LABEL, LEVEL_STYLE } from "@/components/shared/event-feed";
import type { LabState } from "@/lib/engine/types";
import { formatMs } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Step-by-step view of the most recent send or replay operation. */
export function PipelineTrace({ state }: { state: LabState }) {
  const traceId = state.lastTraceId;
  const steps = traceId ? state.events.filter((e) => e.traceId === traceId).reverse() : [];
  const rejected = steps.some((s) => s.kind === "reject");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest message pipeline</CardTitle>
        <CardDescription>What happened to the last message, in order</CardDescription>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <EmptyState icon={Workflow} title="No message traced yet" description="Send or replay a message to see each protocol step." />
        ) : (
          <>
            <div className="mb-3">
              {rejected ? <Badge variant="destructive">Rejected</Badge> : <Badge variant="teal">Delivered</Badge>}
            </div>
            <ol key={traceId} className="relative space-y-1">
              {steps.map((s, i) => {
                const Icon = EVENT_ICON[s.kind];
                return (
                  <li key={s.id} className="animate-step-in relative flex gap-3 pb-2" style={{ animationDelay: `${i * 90}ms` }}>
                    {i < steps.length - 1 && <span aria-hidden className="absolute top-8 bottom-0 left-[13px] w-px bg-border" />}
                    <span className={cn("relative z-10 grid size-7 shrink-0 place-items-center rounded-full", LEVEL_STYLE[s.level])}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-xs text-muted-foreground">
                        Step {i + 1} · {EVENT_KIND_LABEL[s.kind]}
                        {s.durationMs !== undefined && <span className="font-hash"> · {formatMs(s.durationMs)}</span>}
                      </p>
                      <p className="text-sm font-medium break-words">{s.title}</p>
                      {s.detail && <p className="mt-0.5 text-xs break-words text-muted-foreground">{s.detail}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
}
