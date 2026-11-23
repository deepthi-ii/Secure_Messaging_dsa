"use client";

import {
  CircleCheck,
  Fingerprint,
  Hash,
  Info,
  KeyRound,
  Layers,
  Network,
  Pencil,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  type LucideIcon,
} from "lucide-react";
import type { EventKind, EventLevel, SecurityEvent } from "@/lib/engine/types";
import { formatMs, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const EVENT_ICON: Record<EventKind, LucideIcon> = {
  hash: Hash,
  "key-lookup": KeyRound,
  "key-rotation": RefreshCw,
  "replay-check": ShieldCheck,
  accept: CircleCheck,
  reject: ShieldX,
  "batch-seal": Layers,
  "merkle-verify": Network,
  tamper: Pencil,
  system: Info,
};

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  hash: "Hashing",
  "key-lookup": "Key lookup",
  "key-rotation": "Key rotation",
  "replay-check": "Replay check",
  accept: "Accepted",
  reject: "Rejected",
  "batch-seal": "Batch sealed",
  "merkle-verify": "Verification",
  tamper: "Tamper test",
  system: "System",
};

export const LEVEL_STYLE: Record<EventLevel, string> = {
  info: "text-primary bg-primary/12",
  success: "text-teal bg-teal/12",
  warning: "text-amber bg-amber/12",
  danger: "text-destructive bg-destructive/14",
};

function iconFor(e: SecurityEvent): LucideIcon {
  if (e.kind === "replay-check" && e.level === "danger") return ShieldAlert;
  if (e.kind === "system" && e.level === "warning") return Fingerprint;
  return EVENT_ICON[e.kind];
}

export function EventRow({ event, highlight }: { event: SecurityEvent; highlight?: boolean }) {
  const Icon = iconFor(event);
  return (
    <li className={cn("flex gap-3 rounded-lg px-2 py-2.5", highlight && "animate-event-in", event.level === "danger" && "bg-destructive/6")}>
      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-md", LEVEL_STYLE[event.level])}>
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-medium break-words">{event.title}</p>
          <time className="font-hash shrink-0 text-xs text-muted-foreground" dateTime={new Date(event.at).toISOString()}>
            {formatTime(event.at)}
          </time>
        </div>
        {(event.detail || event.durationMs !== undefined) && (
          <p className="mt-0.5 text-xs leading-relaxed break-words text-muted-foreground">
            {event.detail}
            {event.durationMs !== undefined && (
              <span className="font-hash text-secondary-foreground/80">
                {event.detail ? " · " : ""}
                {formatMs(event.durationMs)}
              </span>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

export function EventFeed({ events, limit = 12, newestId }: { events: SecurityEvent[]; limit?: number; newestId?: string }) {
  return (
    <ul className="flex flex-col gap-0.5" aria-live="polite" aria-relevant="additions">
      {events.slice(0, limit).map((e) => (
        <EventRow key={e.id} event={e} highlight={e.id === newestId} />
      ))}
    </ul>
  );
}
