"use client";

import * as React from "react";
import { CircleCheck, CircleX, Route as RouteIcon, Server } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { HashText } from "@/components/shared/hash-text";
import type { ProofCheck } from "@/lib/engine/engine";
import type { Batch } from "@/lib/engine/types";
import { useLab } from "@/lib/store/lab-store";

type ServerResult = { status: "idle" } | { status: "loading" } | { status: "done"; valid: boolean; computedRoot: string } | { status: "error"; message: string };

export function ProofPanel({ batch, messageId, resetKey }: { batch: Batch; messageId: string; resetKey: string }) {
  const { checkProof } = useLab();
  const [check, setCheck] = React.useState<ProofCheck | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [server, setServer] = React.useState<ServerResult>({ status: "idle" });

  React.useEffect(() => {
    setCheck(null);
    setError(null);
    setServer({ status: "idle" });
  }, [resetKey, messageId]);

  if (batch.status !== "sealed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proof path</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={RouteIcon} title="This batch is still open" description="Proofs need a sealed Merkle root. Choose a sealed batch, or seal this one." />
        </CardContent>
      </Card>
    );
  }

  const generate = async () => {
    setBusy(true);
    const r = await checkProof(batch.id, messageId);
    setBusy(false);
    setServer({ status: "idle" });
    if (!r.ok) return setError(r.error);
    setError(null);
    setCheck(r.check);
  };

  const crossCheck = async () => {
    if (!check) return;
    setServer({ status: "loading" });
    try {
      const res = await fetch("/api/merkle/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leafHash: check.leafHash, root: check.expectedRoot, proof: check.proof.map(({ sibling, position }) => ({ sibling, position })) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Server responded ${res.status}`);
      setServer({ status: "done", valid: body.valid, computedRoot: body.computedRoot });
    } catch (e) {
      setServer({ status: "error", message: e instanceof Error ? e.message : "Request failed" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proof path for {messageId}</CardTitle>
        <CardDescription>
          Leaf {batch.messageIds.indexOf(messageId)} of {batch.messageIds.length}. The receiver needs only the sibling hashes, not the other messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={generate} disabled={busy}>
            <RouteIcon />
            {busy ? "Verifying…" : check ? "Verify again" : "Generate and verify proof"}
          </Button>
          <Button variant="outline" onClick={crossCheck} disabled={!check || server.status === "loading"}>
            <Server />
            {server.status === "loading" ? "Checking…" : "Cross-check on server"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {check && (
          <>
            <ol className="space-y-2 text-sm">
              <li className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Start: leaf hash of the stored content</p>
                <HashText value={check.leafHash} chars={24} />
                {check.leafHash !== check.recordedLeaf && <p className="mt-1 text-xs text-destructive">Differs from the hash recorded at seal time</p>}
              </li>
              {check.proof.map((step, i) => (
                <li key={i} className="rounded-lg border px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    Step {i + 1}: combine with the sibling on the {step.position} (level {step.level})
                  </p>
                  <div className="mt-1 grid gap-1 sm:grid-cols-2">
                    <span className="text-xs">
                      <span className="text-teal">Sibling </span>
                      <HashText value={step.sibling} chars={16} copy={false} />
                    </span>
                    <span className="text-xs">
                      <span className="text-primary">Result </span>
                      <HashText value={check.path[i + 1]} chars={16} copy={false} />
                    </span>
                  </div>
                </li>
              ))}
            </ol>

            <Alert variant={check.valid ? "teal" : "destructive"}>
              {check.valid ? <CircleCheck /> : <CircleX />}
              <AlertTitle>{check.valid ? "Proof valid: message is part of this batch" : "Proof failed: message does not match the sealed root"}</AlertTitle>
              <AlertDescription>
                <p>
                  Computed root <HashText value={check.computedRoot} chars={16} copy={false} /> {check.valid ? "equals" : "differs from"} sealed root{" "}
                  <HashText value={check.expectedRoot} chars={16} copy={false} />.
                </p>
              </AlertDescription>
            </Alert>

            {server.status === "done" && (
              <p className="text-sm text-muted-foreground">
                <Server className="mr-1 inline size-3.5" />
                Node.js crypto on the server computed <HashText value={server.computedRoot} chars={12} copy={false} /> and reports the proof as{" "}
                <span className={server.valid ? "text-teal" : "text-destructive"}>{server.valid ? "valid" : "invalid"}</span>
                {server.valid === check.valid ? ", matching the browser." : ", which does not match the browser."}
              </p>
            )}
            {server.status === "error" && <p className="text-sm text-destructive">Server cross-check failed: {server.message}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
