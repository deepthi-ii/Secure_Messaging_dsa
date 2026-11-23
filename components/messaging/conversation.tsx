"use client";

import { MessagesSquare, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { HashText } from "@/components/shared/hash-text";
import { UserDot } from "@/components/shared/user-chip";
import { pairLabel } from "@/lib/engine/engine";
import { pairIdOf } from "@/lib/engine/session-keys";
import type { LabState } from "@/lib/engine/types";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Conversation({
  state,
  senderId,
  receiverId,
  onReplay,
}: {
  state: LabState;
  senderId: string;
  receiverId: string;
  onReplay: (messageId: string) => void;
}) {
  const pair = pairIdOf(senderId, receiverId);
  const messages = state.messageOrder
    .map((id) => state.messages[id])
    .filter((m) => pairIdOf(m.senderId, m.receiverId) === pair)
    .slice(-20);
  const user = (id: string) => state.users.find((u) => u.id === id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivered messages: {pairLabel(state, pair)}</CardTitle>
        <CardDescription>The last 20 messages accepted for this pair, with the metadata the receiver checked</CardDescription>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No messages between these users" description="Compose one above to start the session." />
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const mine = m.senderId === senderId;
              return (
                <li key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                  <UserDot user={user(m.senderId)} className="mt-1" />
                  <div className={cn("max-w-[min(560px,85%)] rounded-xl border px-3.5 py-2.5", mine ? "border-primary/25 bg-primary/8" : "bg-muted/50")}>
                    <p className="text-sm leading-relaxed break-words">{m.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="font-hash">{m.id}</span>
                      <span>seq {m.seq}</span>
                      <span className="font-hash">{m.keyId}</span>
                      <HashText value={m.hash} chars={10} copy={false} className="text-[11px]" />
                      <span>{formatTime(m.receivedAt)}</span>
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-destructive hover:text-destructive" onClick={() => onReplay(m.id)}>
                        <Repeat className="size-3" />
                        Replay
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
