"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { pairLabel } from "@/lib/engine/engine";
import { ROTATION_REASON_LABEL } from "@/lib/engine/session-keys";
import type { LabState, RotationReason } from "@/lib/engine/types";
import { formatTime } from "@/lib/format";

const REASON_VARIANT: Record<RotationReason, "default" | "teal" | "amber" | "secondary"> = {
  initial: "secondary",
  manual: "default",
  "message-limit": "teal",
  "time-limit": "amber",
};

export function RotationHistory({ state }: { state: LabState }) {
  const rows = state.rotations.slice(0, 60);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key rotation history</CardTitle>
        <CardDescription>All sessions, newest first. The previous key is marked expired at the moment of rotation.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={RefreshCw} title="No rotations yet" description="Rotations appear here as sessions are created and keys reach their limits." />
        ) : (
          <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Previous key</TableHead>
                  <TableHead>New key</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-hash text-[13px]">{formatTime(r.at)}</TableCell>
                    <TableCell>{pairLabel(state, r.pairId)}</TableCell>
                    <TableCell className="font-hash text-[13px] text-muted-foreground">{r.fromKeyId ? <span className="line-through">{r.fromKeyId}</span> : "—"}</TableCell>
                    <TableCell className="font-hash text-[13px]">{r.toKeyId}</TableCell>
                    <TableCell>
                      <Badge variant={REASON_VARIANT[r.reason]}>{ROTATION_REASON_LABEL[r.reason]}</Badge>
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
