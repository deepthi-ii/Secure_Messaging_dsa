"use client";

import Link from "next/link";
import { Activity, CircleCheck, Hash, KeyRound, MessagesSquare, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { EventFeed } from "@/components/shared/event-feed";
import { MetricTile } from "@/components/shared/metric-tile";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/page-loading";
import { getMetrics, getTrafficSeries } from "@/lib/engine/selectors";
import { formatMs, formatNumber } from "@/lib/format";
import { useLab, useNow } from "@/lib/store/lab-store";
import { BenchmarkCard } from "./benchmark-card";
import { ReplayChart, ThroughputChart } from "./traffic-charts";

export function DashboardView() {
  const { state } = useLab();
  const now = useNow(5000);
  if (!state) return <PageLoading />;

  const m = getMetrics(state);
  const series = getTrafficSeries(state, now);
  const lastMinutes = series.reduce((n, p) => n + p.accepted, 0);
  const openBatch = state.batches[state.openBatchId];

  return (
    <>
      <PageHeader
        title="Security overview"
        description="Live state of the simulated protocol: how many messages passed integrity, key and replay checks, and what the defences caught."
        actions={
          <Button asChild>
            <Link href="/messaging">
              <MessagesSquare />
              Send a message
            </Link>
          </Button>
        }
      />

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricTile label="Total messages" value={formatNumber(m.totalMessages)} hint={`${lastMinutes} in the last 15 min`} icon={MessagesSquare} />
        <MetricTile
          label="Verified batches"
          value={`${m.verifiedBatches}/${m.sealedBatches}`}
          hint={m.failedBatches ? `${m.failedBatches} failed verification` : "All sealed batches match their root"}
          icon={CircleCheck}
          tone="teal"
        />
        <MetricTile label="Active session keys" value={m.activeKeys} hint={`${m.rotations} rotations · ${m.expiredKeys} expired`} icon={KeyRound} tone="violet" />
        <MetricTile label="Replay attempts detected" value={m.replayAttempts} hint="All rejected before delivery" icon={ShieldAlert} tone="rose" />
        <MetricTile label="Average hash time" value={formatMs(m.avgHashMs, 3)} hint={`SHA-256 over ${formatNumber(state.metrics.hashSamples)} messages`} icon={Hash} tone="amber" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3" aria-label="Charts">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Message throughput</CardTitle>
            <CardDescription>Accepted messages per minute, last 15 minutes</CardDescription>
            <CardAction>
              <Activity className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ThroughputChart data={series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Replay attempts</CardTitle>
            <CardDescription>Rejected duplicates per minute</CardDescription>
            <CardAction>
              <ShieldAlert className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ReplayChart data={series} />
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent security events</CardTitle>
            <CardDescription>Hashing, key lookups, rotations, verifications and rejections as they happen</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/messaging">Open live log</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {state.events.length ? (
              <div className="scrollbar-thin max-h-[440px] overflow-y-auto pr-1">
                <EventFeed events={state.events} limit={30} newestId={state.events[0]?.id} />
              </div>
            ) : (
              <EmptyState icon={Activity} title="No events yet" description="Send a message to see the protocol pipeline at work." />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Protocol status</CardTitle>
              <CardDescription>Current configuration of each module</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Open batch {openBatch.id}</span>
                  <span className="font-hash">
                    {openBatch.messageIds.length}/{state.batchSize}
                  </span>
                </div>
                <Progress className="mt-2" value={(openBatch.messageIds.length / state.batchSize) * 100} />
              </div>
              <div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Replay window</span>
                  <span className="font-hash">
                    {state.replay.size}/{state.replay.capacity} IDs
                  </span>
                </div>
                <Progress className="mt-2" value={m.bufferFill * 100} indicatorClassName="bg-teal" />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Key rotation</span>
                <span className="text-right">
                  {state.policy.autoRotate ? `Every ${state.policy.maxMessages} msgs or ${state.policy.maxAgeSeconds}s` : "Manual only"}
                </span>
              </div>
            </CardContent>
          </Card>
          <BenchmarkCard />
        </div>
      </section>
    </>
  );
}
