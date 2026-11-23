"use client";

import { KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { HashText } from "@/components/shared/hash-text";
import { KeyStatusBadge } from "@/components/shared/status-badges";
import { UserChip } from "@/components/shared/user-chip";
import { pairLabel } from "@/lib/engine/engine";
import { nextRotationInfo } from "@/lib/engine/session-keys";
import type { LabState } from "@/lib/engine/types";
import { formatCountdown, formatTime } from "@/lib/format";
import { useLab, useNow } from "@/lib/store/lab-store";

export function SessionTable({ state, selectedPair, onSelect }: { state: LabState; selectedPair: string; onSelect: (pairId: string) => void }) {
  const { rotate } = useLab();
  const now = useNow();
  const sessions = Object.values(state.sessions).sort((a, b) => a.pairId.localeCompare(b.pairId));
  const user = (id: string) => state.users.find((u) => u.id === id);

  const rotateSelected = async () => {
    if (!selectedPair) return;
    const r = await rotate(selectedPair);
    if (!r.ok) return toast.error("Key not rotated", { description: r.error });
    toast.success("Key rotated", { description: `${pairLabel(state, selectedPair)} now uses a new key. The old key was wiped.` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session keys</CardTitle>
        <CardDescription>One record per user pair, stored in a hash map keyed by the pair for constant-time lookup. Select a row to rotate it or view its history.</CardDescription>
        <CardAction>
          <Button size="sm" onClick={rotateSelected} disabled={!selectedPair}>
            <RefreshCw />
            Rotate selected key
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <EmptyState icon={KeyRound} title="No sessions yet" description="A session and its first key are created when two users exchange their first message." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User pair</TableHead>
                <TableHead>Key ID</TableHead>
                <TableHead>Nonce</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Next rotation</TableHead>
                <TableHead className="text-right">Rotations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => {
                const key = state.keys[s.activeKeyId];
                const info = nextRotationInfo(key, state.policy, now);
                const selected = s.pairId === selectedPair;
                return (
                  <TableRow
                    key={s.pairId}
                    data-state={selected ? "selected" : undefined}
                    aria-selected={selected}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => onSelect(s.pairId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(s.pairId);
                      }
                    }}
                  >
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden className={`size-2 rounded-full ${selected ? "bg-primary" : "bg-transparent"}`} />
                        <UserChip user={user(s.userA)} />
                        <span className="text-muted-foreground">↔</span>
                        <UserChip user={user(s.userB)} />
                      </span>
                    </TableCell>
                    <TableCell className="font-hash text-[13px]">{key.keyId}</TableCell>
                    <TableCell>
                      <HashText value={key.nonce} chars={12} copy={false} />
                    </TableCell>
                    <TableCell>
                      <KeyStatusBadge status={key.status} />
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <span className="font-hash text-[13px]">
                          {key.messageCount}/{state.policy.maxMessages}
                        </span>
                        <Progress className="mt-1" value={(key.messageCount / state.policy.maxMessages) * 100} indicatorClassName="bg-violet" />
                      </div>
                    </TableCell>
                    <TableCell className="font-hash text-[13px]">{formatTime(key.createdAt)}</TableCell>
                    <TableCell className="text-[13px]">
                      {state.policy.autoRotate ? (
                        <span>
                          <span className="font-hash">{formatCountdown(info.msRemaining)}</span>
                          <span className="text-muted-foreground"> or {info.messagesRemaining} msgs</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Manual</span>
                      )}
                    </TableCell>
                    <TableCell className="font-hash text-right">{s.rotationCount}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
