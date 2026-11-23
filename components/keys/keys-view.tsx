"use client";

import * as React from "react";
import { FlaskConical } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/page-loading";
import { useLab } from "@/lib/store/lab-store";
import { KeyTimeline } from "./key-timeline";
import { PolicyCard } from "./policy-card";
import { RotationHistory } from "./rotation-history";
import { SessionTable } from "./session-table";

export function KeysView() {
  const { state } = useLab();
  const [selected, setSelected] = React.useState("");
  if (!state) return <PageLoading />;
  const pairIds = Object.keys(state.sessions).sort();
  const pairId = state.sessions[selected] ? selected : pairIds[0] ?? "";

  return (
    <>
      <PageHeader
        title="Key management"
        description="Every user pair shares a session key. Keys are looked up in constant time, rotate on a schedule or after a set number of messages, and old keys are expired and wiped."
      />
      <Alert variant="amber" className="mb-4">
        <FlaskConical />
        <AlertTitle>Educational simulation of forward secrecy</AlertTitle>
        <AlertDescription>
          <p>
            These are mock keys made from random values and a SHA-256 hash ratchet. They never encrypt anything. The point is the lifecycle: because each new key
            is derived one-way and the old one is erased, a key stolen today does not unlock earlier messages. Real messengers achieve this with authenticated key
            exchange such as the Signal protocol&apos;s Double Ratchet, which this prototype does not implement.
          </p>
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-12">
          <SessionTable state={state} selectedPair={pairId} onSelect={setSelected} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-7">
          <KeyTimeline state={state} pairId={pairId} />
          <RotationHistory state={state} />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <PolicyCard />
        </div>
      </div>
    </>
  );
}
