"use client";

import * as React from "react";
import { Repeat, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { REPLAY_REASON_LABEL } from "@/components/shared/status-badges";
import { userName } from "@/lib/engine/engine";
import { bufferLookup } from "@/lib/engine/replay-buffer";
import type { ReplayAttempt, ReplayMode } from "@/lib/engine/types";
import { useLab } from "@/lib/store/lab-store";

export function ReplayTestCard({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const { state, replay } = useLab();
  const [mode, setMode] = React.useState<"exact" | "forged-id">("exact");
  const [last, setLast] = React.useState<ReplayAttempt | null>(null);
  const [busy, setBusy] = React.useState(false);
  if (!state) return null;

  const recent = state.messageOrder.slice(-40).reverse();
  const target = selectedId && state.messages[selectedId] ? selectedId : recent[0];
  const inWindow = target ? bufferLookup(state.replay, target) !== null : false;

  const run = async () => {
    if (!target) return;
    setBusy(true);
    const effective: ReplayMode = mode === "exact" && !inWindow ? "evicted" : mode;
    const res = await replay(target, effective);
    setBusy(false);
    if (!res.ok) return toast.error("Replay could not run", { description: res.error });
    setLast(res.attempt);
    toast.error("Replay attack detected", { description: `${res.attempt.messageId} rejected: ${REPLAY_REASON_LABEL[res.attempt.reason].toLowerCase()}.` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Replay attack test</CardTitle>
        <CardDescription>Act as Mallory: capture a message that was already delivered and send it again.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recent.length === 0 ? (
          <EmptyState icon={Repeat} title="Nothing to replay yet" description="Send a message first, then come back to resend it." />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="replay-target">Previous message</Label>
              <Select value={target} onValueChange={onSelect}>
                <SelectTrigger id="replay-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recent.map((id) => {
                    const m = state.messages[id];
                    return (
                      <SelectItem key={id} value={id}>
                        <span className="font-hash text-xs">{id}</span>
                        <span className="text-muted-foreground">
                          {userName(state, m.senderId)} → {userName(state, m.receiverId)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {target && (
                <p className="truncate text-xs text-muted-foreground">
                  “{state.messages[target].content}” · seq {state.messages[target].seq} ·{" "}
                  {inWindow ? "ID is still in the replay window" : "ID has left the replay window"}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="replay-mode">How Mallory resends it</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                <SelectTrigger id="replay-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">Exact copy, same message ID</SelectItem>
                  <SelectItem value="forged-id">Copy with a forged new ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={run} disabled={busy}>
              <Repeat />
              {busy ? "Resending…" : "Resend previous message"}
            </Button>
          </>
        )}

        {last && (
          <Alert variant="destructive" className="animate-event-in">
            <ShieldAlert />
            <AlertTitle>Replay attack detected</AlertTitle>
            <AlertDescription>
              <p>
                {last.reason === "duplicate-id"
                  ? `Message ID ${last.messageId} is already in replay-window slot ${last.bufferSlot}.`
                  : `Sequence number ${last.seq} is not above the channel's high-water mark of ${last.highWater}.`}{" "}
                The envelope was rejected and never delivered to {userName(state, last.receiverId)}.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
