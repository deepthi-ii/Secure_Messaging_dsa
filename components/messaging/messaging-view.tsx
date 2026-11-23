"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/page-loading";
import { REPLAY_REASON_LABEL } from "@/components/shared/status-badges";
import { bufferLookup } from "@/lib/engine/replay-buffer";
import { useLab } from "@/lib/store/lab-store";
import { ComposeCard } from "./compose-card";
import { Conversation } from "./conversation";
import { LiveLog } from "./live-log";
import { PipelineTrace } from "./pipeline-trace";
import { ReplayTestCard } from "./replay-test-card";

export function MessagingView() {
  const { state, replay } = useLab();
  const [senderId, setSenderId] = React.useState("alice");
  const [receiverId, setReceiverId] = React.useState("bob");
  const [replayTarget, setReplayTarget] = React.useState("");
  if (!state) return <PageLoading />;

  const quickReplay = async (id: string) => {
    setReplayTarget(id);
    const res = await replay(id, bufferLookup(state.replay, id) !== null ? "exact" : "evicted");
    if (res.ok) toast.error("Replay attack detected", { description: `${res.attempt.messageId} rejected: ${REPLAY_REASON_LABEL[res.attempt.reason].toLowerCase()}.` });
    else toast.error("Replay could not run", { description: res.error });
  };

  return (
    <>
      <PageHeader
        title="Messaging demo"
        description="Send messages between mock users and watch each one pass through hashing, session-key lookup and replay checks. Then resend an old one to see it rejected."
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
          <ComposeCard senderId={senderId} receiverId={receiverId} onSenderChange={setSenderId} onReceiverChange={setReceiverId} />
          <ReplayTestCard selectedId={replayTarget} onSelect={setReplayTarget} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          <PipelineTrace state={state} />
          <LiveLog state={state} />
        </div>
        <div className="min-w-0 lg:col-span-12">
          <Conversation state={state} senderId={senderId} receiverId={receiverId} onReplay={quickReplay} />
        </div>
      </div>
    </>
  );
}
