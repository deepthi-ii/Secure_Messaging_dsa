"use client";

import { Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Route } from "@/components/shared/user-chip";
import { bufferLookup } from "@/lib/engine/replay-buffer";
import type { LabState } from "@/lib/engine/types";
import { formatTime } from "@/lib/format";

export function AcceptedTable({ state }: { state: LabState }) {
  const rows = state.messageOrder.slice(-25).reverse().map((id) => state.messages[id]);
  const user = (id: string) => state.users.find((u) => u.id === id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accepted messages</CardTitle>
        <CardDescription>The 25 most recent deliveries and whether their ID is still in the window</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={Inbox} title="No accepted messages" description="Messages appear here once the receiver accepts them." />
        ) : (
          <div className="scrollbar-thin max-h-[460px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Message ID</TableHead>
                  <TableHead>Seq</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Window</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => {
                  const slot = bufferLookup(state.replay, m.id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-hash text-[13px]">{formatTime(m.receivedAt)}</TableCell>
                      <TableCell className="font-hash text-[13px]">{m.id}</TableCell>
                      <TableCell className="font-hash text-[13px]">{m.seq}</TableCell>
                      <TableCell>
                        <Route from={user(m.senderId)} to={user(m.receiverId)} />
                      </TableCell>
                      <TableCell>{slot !== null ? <Badge variant="default">Slot {slot}</Badge> : <Badge variant="outline">Evicted</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
