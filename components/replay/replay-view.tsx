"use client";

import * as React from "react";
import { ArchiveX, ShieldAlert, ShieldCheck, SquareStack } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricTile } from "@/components/shared/metric-tile";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/page-loading";
import { getBufferView } from "@/lib/engine/selectors";
import { formatTime } from "@/lib/format";
import { useLab } from "@/lib/store/lab-store";
import { cn } from "@/lib/utils";
import { AcceptedTable } from "./accepted-table";
import { BufferRing } from "./buffer-ring";
import { ReplayLog } from "./replay-log";
import { ReplaySimCard } from "./replay-sim-card";

export function ReplayView() {
  const { state } = useLab();
  const [hitSlot, setHitSlot] = React.useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (hitSlot === null) return;
    const t = window.setTimeout(() => setHitSlot(null), 2500);
    return () => window.clearTimeout(t);
  }, [hitSlot]);

  if (!state) return <PageLoading />;
  const view = getBufferView(state);
  const buf = state.replay;
  const selectedId = selectedSlot !== null ? buf.slots[selectedSlot] : null;
  const selectedMsg = selectedId ? state.messages[selectedId] : null;

  return (
    <>
      <PageHeader
        title="Replay protection"
        description="The receiver remembers the IDs of recently accepted messages in a fixed-size circular buffer and tracks the highest sequence number per channel. A message that fails either check is a replay."
      />
      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Replay attempts detected" value={state.metrics.replayDetected} icon={ShieldAlert} tone="rose" hint="None were delivered" />
        <MetricTile label="Window capacity" value={`${buf.capacity} slots`} icon={SquareStack} hint={`${buf.size} in use`} />
        <MetricTile label="IDs inserted" value={buf.totalInserted} icon={ShieldCheck} tone="teal" hint="One per accepted message" />
        <MetricTile label="IDs evicted" value={buf.totalEvicted} icon={ArchiveX} tone="amber" hint="Overwritten by newer IDs" />
      </section>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="min-w-0 lg:col-span-7">
          <CardHeader>
            <CardTitle>Recent message-ID buffer</CardTitle>
            <CardDescription>
              New IDs are written at the head and move it clockwise. When the ring is full, the slot at the head (amber) is overwritten next. A detected duplicate flashes red.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid items-center gap-6 md:grid-cols-2">
            <BufferRing buffer={buf} hitSlot={hitSlot} selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} />
            <div className="min-w-0 space-y-3">
              <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-teal" /> Newest
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-primary/60" /> Stored
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm border border-amber" /> Next to overwrite
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-destructive" /> Duplicate hit
                </li>
              </ul>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                {selectedSlot === null ? (
                  <p className="text-muted-foreground">Select a slot in the ring to inspect it.</p>
                ) : selectedMsg ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
                    <dt className="text-muted-foreground">Slot</dt>
                    <dd className="font-hash">{selectedSlot}</dd>
                    <dt className="text-muted-foreground">Message ID</dt>
                    <dd className="font-hash">{selectedMsg.id}</dd>
                    <dt className="text-muted-foreground">Sequence</dt>
                    <dd className="font-hash">{selectedMsg.seq}</dd>
                    <dt className="text-muted-foreground">Accepted</dt>
                    <dd className="font-hash">{formatTime(selectedMsg.receivedAt)}</dd>
                  </dl>
                ) : (
                  <p className="text-muted-foreground">Slot {selectedSlot} is empty.</p>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Window contents, oldest to newest</p>
                <ol className="scrollbar-thin flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {view.ordered.map((id) => (
                    <li
                      key={id}
                      className={cn(
                        "font-hash rounded-md border px-1.5 py-0.5 text-[11px]",
                        buf.index[id] === view.newest ? "border-teal/50 text-teal" : buf.index[id] === hitSlot ? "border-destructive text-destructive" : "text-secondary-foreground",
                      )}
                    >
                      {id}
                    </li>
                  ))}
                  {view.ordered.length === 0 && <li className="text-xs text-muted-foreground">Empty. Accepted message IDs will appear here.</li>}
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="min-w-0 lg:col-span-5">
          <ReplaySimCard onDetected={setHitSlot} />
        </div>
        <div className="min-w-0 lg:col-span-12">
          <ReplayLog state={state} />
        </div>
        <div className="min-w-0 lg:col-span-12">
          <AcceptedTable state={state} />
        </div>
      </div>
    </>
  );
}
