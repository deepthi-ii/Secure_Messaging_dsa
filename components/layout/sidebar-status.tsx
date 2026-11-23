"use client";

import { FlaskConical } from "lucide-react";
import { getMetrics } from "@/lib/engine/selectors";
import { useLab } from "@/lib/store/lab-store";

export function SidebarStatus() {
  const { state } = useLab();
  const m = state ? getMetrics(state) : null;
  return (
    <div className="rounded-xl border border-amber/25 bg-amber/6 p-3.5">
      <div className="flex items-center gap-2 text-sm font-medium text-amber">
        <FlaskConical className="size-4" />
        Simulation mode
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Mock users and mock keys. Nothing here encrypts real data.
      </p>
      {m && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Active keys</dt>
            <dd className="font-hash text-foreground">{m.activeKeys}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Replay window</dt>
            <dd className="font-hash text-foreground">
              {state!.replay.size}/{state!.replay.capacity}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
