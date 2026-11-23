"use client";

import * as React from "react";
import { ArrowLeftRight, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_MESSAGES } from "@/lib/engine/constants";
import { pairIdOf } from "@/lib/engine/session-keys";
import { MESSAGE_MAX_LENGTH, validateMessageInput } from "@/lib/engine/validation";
import { formatCountdown } from "@/lib/format";
import { useLab, useNow } from "@/lib/store/lab-store";
import { cn } from "@/lib/utils";
import { UserSelect } from "./user-select";

export function ComposeCard({
  senderId,
  receiverId,
  onSenderChange,
  onReceiverChange,
}: {
  senderId: string;
  receiverId: string;
  onSenderChange: (id: string) => void;
  onReceiverChange: (id: string) => void;
}) {
  const { state, send } = useLab();
  const now = useNow();
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  if (!state) return null;

  const session = state.sessions[pairIdOf(senderId, receiverId)];
  const key = session ? state.keys[session.activeKeyId] : null;
  const length = text.trim().length;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const input = { senderId, receiverId, content: text };
    const problem = validateMessageInput(input, state.users);
    if (problem) return setError(problem);
    setSending(true);
    const res = await send(input);
    setSending(false);
    if (!res.ok) return setError(res.error);
    setError(null);
    setText("");
  };

  const swap = () => {
    onSenderChange(receiverId);
    onReceiverChange(senderId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compose a message</CardTitle>
        <CardDescription>Each message is hashed, tagged with the pair&apos;s session key, checked for replay and added to a batch.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="sender">Sender</Label>
              <UserSelect
                id="sender"
                label="Sender"
                users={state.users}
                value={senderId}
                onChange={(v) => {
                  onSenderChange(v);
                  if (v === receiverId) onReceiverChange(senderId);
                }}
              />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={swap} aria-label="Swap sender and receiver">
              <ArrowLeftRight />
            </Button>
            <div className="space-y-1.5">
              <Label htmlFor="receiver">Receiver</Label>
              <UserSelect id="receiver" label="Receiver" users={state.users} value={receiverId} onChange={onReceiverChange} disabledId={senderId} />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs">
            {key ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  <span className="text-muted-foreground">Session key </span>
                  <span className="font-hash text-foreground">{key.keyId}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Generation </span>
                  <span className="font-hash">{key.generation}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Used </span>
                  <span className="font-hash">
                    {key.messageCount}/{state.policy.maxMessages}
                  </span>
                </span>
                {state.policy.autoRotate && (
                  <span>
                    <span className="text-muted-foreground">Rotates in </span>
                    <span className="font-hash">{formatCountdown(key.expiresAt - now)}</span>
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">No session for this pair yet. Sending will establish one with a new mock key.</span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="message">Message</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-muted-foreground"
                onClick={() => {
                  setText(SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)]);
                  setError(null);
                }}
              >
                <Sparkles />
                Use sample text
              </Button>
            </div>
            <Textarea
              id="message"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
              }}
              placeholder="Type a message, for example: Lab results are ready for review."
              aria-invalid={!!error}
              aria-describedby="message-help"
              rows={4}
            />
            <div id="message-help" className="flex items-start justify-between gap-3 text-xs">
              {error ? (
                <p className="text-destructive" role="alert">
                  {error}
                </p>
              ) : (
                <p className="text-muted-foreground">Ctrl + Enter sends. Mock content only, please.</p>
              )}
              <span className={cn("font-hash shrink-0", length > MESSAGE_MAX_LENGTH ? "text-destructive" : "text-muted-foreground")}>
                {length}/{MESSAGE_MAX_LENGTH}
              </span>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={sending}>
            <Send />
            {sending ? "Sending…" : "Send message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
