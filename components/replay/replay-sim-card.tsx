"use client";

import * as React from "react";
import { Repeat, Shuffle, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { REPLAY_MODE_LABEL, REPLAY_REASON_LABEL } from "@/components/shared/status-badges";
import { replayCandidates, userName } from "@/lib/engine/engine";
import type { ReplayMode } from "@/lib/engine/types";
import { LIMITS } from "@/lib/engine/validation";
import { useLab } from "@/lib/store/lab-store";

const MODE_HELP: Record<ReplayMode, string> = {
  exact: "Same ID and sequence number. Caught by the ID window.",
  "forged-id": "Fresh ID, original sequence number. Caught by the sequence check.",
  evicted: "A message whose ID already left the window. Caught by the sequence check.",
};

export function ReplaySimCard({ onDetected }: { onDetected: (slot: number | null) => void }) {
  const { state, replay, replayRandom, updateReplayCapacity } = useLab();
  const [mode, setMode] = React.useState<ReplayMode>("exact");
  const [target, setTarget] = React.useState("");
  const [capacity, setCapacity] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  if (!state) return null;

  const candidates = replayCandidates(state, mode).slice(-30).reverse();
  const chosen = candidates.includes(target) ? target : candidates[0] ?? "";

  const report = (n: number, reason: keyof typeof REPLAY_REASON_LABEL) =>
    toast.error(n > 1 ? `${n} replay attacks detected` : "Replay attack detected", { description: `Rejected: ${REPLAY_REASON_LABEL[reason].toLowerCase()}.` });

  const one = async () => {
    if (!chosen) return;
    setBusy(true);
    const r = await replay(chosen, mode);
    setBusy(false);
    if (!r.ok) return toast.error("Replay could not run", { description: r.error });
    onDetected(r.attempt.bufferSlot);
    report(1, r.attempt.reason);
  };

  const random = async (count: number) => {
    setBusy(true);
    const r = await replayRandom(mode, count);
    setBusy(false);
    if (!r.ok) return toast.error("Replay could not run", { description: r.error });
    const last = r.attempts[r.attempts.length - 1];
    onDetected(last?.bufferSlot ?? null);
    if (last) report(r.attempts.length, last.reason);
  };

  const cap = capacity ?? state.replay.capacity;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulate replay attempts</CardTitle>
        <CardDescription>Mallory re-sends envelopes she captured earlier. Every attempt should be rejected.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sim-mode">Attack type</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as ReplayMode)}>
            <SelectTrigger id="sim-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(REPLAY_MODE_LABEL) as ReplayMode[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {REPLAY_MODE_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{MODE_HELP[mode]}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sim-target">Captured message</Label>
          <Select value={chosen} onValueChange={setTarget} disabled={!candidates.length}>
            <SelectTrigger id="sim-target">
              <SelectValue placeholder={mode === "evicted" ? "No evicted messages yet" : "No messages yet"} />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((id) => {
                const m = state.messages[id];
                return (
                  <SelectItem key={id} value={id}>
                    <span className="font-hash text-xs">{id}</span>
                    <span className="text-muted-foreground">
                      seq {m.seq} · {userName(state, m.senderId)} → {userName(state, m.receiverId)}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {mode === "evicted" && !candidates.length && (
            <p className="text-xs text-amber">Send more than {state.replay.capacity} messages, or shrink the window, so an ID gets evicted.</p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="destructive" onClick={one} disabled={busy || !chosen}>
            <Repeat />
            Replay
          </Button>
          <Button variant="outline" onClick={() => random(1)} disabled={busy || !candidates.length}>
            <Shuffle />
            Random
          </Button>
          <Button variant="outline" onClick={() => random(5)} disabled={busy || !candidates.length}>
            <Zap />
            Burst of 5
          </Button>
        </div>

        <div className="space-y-2.5 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="capacity">Replay window size</Label>
            <span className="font-hash text-sm">{cap} slots</span>
          </div>
          <Slider
            id="capacity"
            min={LIMITS.replayCapacity.min}
            max={LIMITS.replayCapacity.max}
            step={4}
            value={[cap]}
            onValueChange={([v]) => setCapacity(v)}
            onValueCommit={([v]) => {
              void updateReplayCapacity(v);
              setCapacity(null);
            }}
            aria-label="Replay window size"
          />
          <p className="text-xs text-muted-foreground">A larger window remembers more IDs and uses more memory. The sequence check covers anything older.</p>
        </div>
      </CardContent>
    </Card>
  );
}
