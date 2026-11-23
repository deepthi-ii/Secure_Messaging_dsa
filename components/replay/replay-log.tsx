"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { REPLAY_MODE_LABEL, ReplayReasonBadge } from "@/components/shared/status-badges";
import { UserChip } from "@/components/shared/user-chip";
import type { LabState } from "@/lib/engine/types";
import { formatTime } from "@/lib/format";

export function ReplayLog({ state }: { state: LabState }) {
  const rows = state.replayAttempts.slice(0, 80);
  const user = (id: string) => state.users.find((u) => u.id === id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Replay detection log</CardTitle>
        <CardDescription>Every rejected duplicate, newest first. Sender and receiver are the ones the replayed envelope claimed.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No replay attempts yet" description="Use the simulator to resend a captured message." />
        ) : (
          <div className="scrollbar-thin max-h-[460px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Duplicate message ID</TableHead>
                  <TableHead>Seq</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Attack</TableHead>
                  <TableHead>Detected by</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-hash text-[13px]">{formatTime(r.attemptedAt)}</TableCell>
                    <TableCell>
                      <span className="font-hash text-[13px]">{r.messageId}</span>
                      {r.messageId !== r.originalMessageId && <span className="block text-xs text-muted-foreground">copy of {r.originalMessageId}</span>}
                    </TableCell>
                    <TableCell className="font-hash text-[13px]">
                      {r.seq}
                      <span className="text-muted-foreground"> ≤ {r.highWater}</span>
                    </TableCell>
                    <TableCell>
                      <UserChip user={user(r.senderId)} />
                    </TableCell>
                    <TableCell>
                      <UserChip user={user(r.receiverId)} />
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {REPLAY_MODE_LABEL[r.mode]}
                      {r.keyExpired && <span className="block text-xs text-amber">used expired key {r.keyId}</span>}
                    </TableCell>
                    <TableCell>
                      <ReplayReasonBadge reason={r.reason} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">Rejected</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
