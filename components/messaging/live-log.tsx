"use client";

import * as React from "react";
import { ScrollText } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { EventFeed } from "@/components/shared/event-feed";
import type { LabState, SecurityEvent } from "@/lib/engine/types";

type Filter = "all" | "pipeline" | "alerts";

const PIPELINE_KINDS = new Set<SecurityEvent["kind"]>(["hash", "key-lookup", "replay-check", "accept", "reject"]);

export function LiveLog({ state }: { state: LabState }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const events = state.events.filter((e) =>
    filter === "all" ? true : filter === "pipeline" ? PIPELINE_KINDS.has(e.kind) : e.level === "danger" || e.level === "warning",
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live event log</CardTitle>
        <CardDescription>Newest first. Times are when the simulated step ran.</CardDescription>
        <CardAction>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent>
        {events.length ? (
          <div className="scrollbar-thin max-h-[520px] overflow-y-auto pr-1">
            <EventFeed events={events} limit={80} newestId={state.events[0]?.id} />
          </div>
        ) : (
          <EmptyState icon={ScrollText} title="No matching events" description="Try another filter, or send a message." />
        )}
      </CardContent>
    </Card>
  );
}
