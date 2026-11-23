"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HashText } from "@/components/shared/hash-text";
import { Route } from "@/components/shared/user-chip";
import type { Batch, LabState, MerkleTree } from "@/lib/engine/types";

export function BatchMessages({
  state,
  batch,
  current,
  selectedId,
  onSelect,
}: {
  state: LabState;
  batch: Batch;
  current: MerkleTree | null;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const user = (id: string) => state.users.find((u) => u.id === id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages in {batch.id}</CardTitle>
        <CardDescription>Select a message to build its proof path. Recorded hashes were taken when each message was accepted.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Leaf</TableHead>
              <TableHead>Message ID</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Stored content</TableHead>
              <TableHead>Recorded hash</TableHead>
              <TableHead>Current hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.messageIds.map((id, i) => {
              const m = state.messages[id];
              const altered = batch.tampered[id];
              const currentLeaf = current?.levels[0][i];
              const matches = currentLeaf === batch.leafHashes[i];
              return (
                <TableRow
                  key={id}
                  data-state={id === selectedId ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => onSelect(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(id);
                    }
                  }}
                  tabIndex={0}
                  aria-selected={id === selectedId}
                >
                  <TableCell className="font-hash text-muted-foreground">{i}</TableCell>
                  <TableCell className="font-hash text-[13px]">{id}</TableCell>
                  <TableCell>
                    <Route from={user(m.senderId)} to={user(m.receiverId)} />
                  </TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal">
                    {altered ? (
                      <span className="space-y-0.5">
                        <span className="block text-xs text-muted-foreground line-through">{m.content}</span>
                        <span className="block text-destructive">{altered}</span>
                      </span>
                    ) : (
                      <span className="line-clamp-2">{m.content}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <HashText value={batch.leafHashes[i]} chars={10} />
                  </TableCell>
                  <TableCell>
                    {currentLeaf ? (
                      matches ? (
                        <Badge variant="teal">Matches</Badge>
                      ) : (
                        <Badge variant="destructive">Changed</Badge>
                      )
                    ) : (
                      <span className="text-muted-foreground">…</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
