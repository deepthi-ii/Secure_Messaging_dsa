"use client";

import * as React from "react";
import { CircleCheck, CircleX, Network, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/page-loading";
import { getProofLayout } from "@/lib/engine/merkle";
import { formatMs, formatTime } from "@/lib/format";
import { useLab } from "@/lib/store/lab-store";
import { BatchList } from "./batch-list";
import { BatchMessages } from "./batch-messages";
import { MerkleTreeSvg } from "./merkle-tree-svg";
import { ProofPanel } from "./proof-panel";
import { RootHex } from "./root-diff";
import { TamperCard } from "./tamper-card";
import { batchKey, useMerkleTrees } from "./use-merkle-trees";

export function MerkleView() {
  const { state, verify } = useLab();
  const [batchId, setBatchId] = React.useState("");
  const [messageId, setMessageId] = React.useState("");

  const defaultBatch = state ? [...state.batchOrder].reverse().find((id) => state.batches[id].status === "sealed") ?? state.openBatchId : "";
  const batch = state ? state.batches[batchId] ?? state.batches[defaultBatch] : undefined;
  const { trees, loading } = useMerkleTrees(state, batch);

  if (!state) return <PageLoading />;
  if (!batch) return null;

  const selectedMessage = batch.messageIds.includes(messageId) ? messageId : batch.messageIds[0] ?? "";
  const selectedIndex = selectedMessage ? batch.messageIds.indexOf(selectedMessage) : null;
  const layout = trees && selectedIndex !== null && selectedIndex >= 0 ? getProofLayout(trees.current, selectedIndex) : null;
  const v = batch.lastVerification;
  const tampered = Object.keys(batch.tampered).length > 0;

  const runVerify = async () => {
    const r = await verify(batch.id);
    if (!r.ok) return toast.error("Verification did not run", { description: r.error });
    if (r.valid) toast.success(`${batch.id} verified`, { description: "Recomputed root equals the sealed root." });
    else toast.error(`${batch.id} failed verification`, { description: "At least one stored message no longer matches." });
  };

  return (
    <>
      <PageHeader
        title="Merkle verification"
        description="Every batch of messages is summarised by one SHA-256 Merkle root. Change any message and the root no longer matches; prove a single message with only a few sibling hashes."
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-3">
          <BatchList
            selectedId={batch.id}
            onSelect={(id) => {
              setBatchId(id);
              setMessageId("");
            }}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-9">
          <Card className={v && !v.valid ? "border-destructive/50" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {batch.status === "sealed" ? "Merkle root" : "Provisional root"}
                <span className="font-hash text-sm font-normal text-muted-foreground">{batch.id}</span>
              </CardTitle>
              <CardDescription>
                {batch.status === "sealed"
                  ? `Sealed at ${formatTime(batch.sealedAt!)} from ${batch.messageIds.length} messages · built in ${formatMs(batch.buildTimeMs, 3)}`
                  : `This batch is collecting messages (${batch.messageIds.length}/${state.batchSize}). The root is fixed when it seals.`}
              </CardDescription>
              {batch.status === "sealed" && (
                <CardAction>
                  <Button size="sm" onClick={runVerify}>
                    <ShieldCheck />
                    Verify batch
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {batch.messageIds.length === 0 ? (
                <EmptyState icon={Network} title="No messages in this batch yet" description="Send a message from the Messaging demo and it will appear here as a leaf." />
              ) : batch.root ? (
                <>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Sealed root</p>
                    <RootHex value={batch.root} className="text-foreground" />
                  </div>
                  {v && (
                    <div>
                      <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                        Recomputed from stored content at {formatTime(v.at)}
                        {v.valid ? (
                          <Badge variant="teal">
                            <CircleCheck />
                            Matches
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <CircleX />
                            Mismatch
                          </Badge>
                        )}
                      </p>
                      <RootHex value={v.recomputedRoot} compare={batch.root} className={v.valid ? "text-teal" : "text-secondary-foreground"} />
                    </div>
                  )}
                  {v && !v.valid && (
                    <p className="text-sm text-destructive">
                      Batch verification failed. {v.mismatchedMessageIds.length} stored message{v.mismatchedMessageIds.length === 1 ? " was" : "s were"} changed after sealing:{" "}
                      <span className="font-hash">{v.mismatchedMessageIds.join(", ")}</span>
                    </p>
                  )}
                </>
              ) : trees ? (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Root if the batch sealed now</p>
                  <RootHex value={trees.current.root} className="text-muted-foreground" />
                </div>
              ) : (
                <Skeleton className="h-6 w-full" />
              )}
            </CardContent>
          </Card>

          {batch.messageIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tree</CardTitle>
                <CardDescription>Select a leaf to highlight its proof path. Blue is the path to the root, dashed teal are the siblings in the proof{tampered ? ", red nodes changed" : ""}.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading || !trees ? (
                  <Skeleton className="h-56 w-full" />
                ) : (
                  <>
                  <div className="scrollbar-thin overflow-x-auto rounded-lg border bg-background/40 p-2">
                    <MerkleTreeSvg
                      current={trees.current}
                      sealed={batch.status === "sealed" ? trees.sealed : null}
                      path={layout?.path ?? null}
                      siblings={layout?.siblings ?? null}
                      selectedIndex={selectedIndex}
                      onSelectLeaf={(i) => setMessageId(batch.messageIds[i])}
                      leafLabels={batch.messageIds.map((id, i) => `${batch.tampered[id] ? "Altered " : ""}Leaf ${i}`)}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Leaves are message hashes, SHA-256(0x00 ‖ message). Each parent is SHA-256(0x01 ‖ left ‖ right). A node without a partner is promoted unchanged.
                  </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {batch.messageIds.length > 0 && (
            <>
              <BatchMessages state={state} batch={batch} current={trees?.current ?? null} selectedId={selectedMessage} onSelect={setMessageId} />
              <div className="grid gap-4 xl:grid-cols-12">
                <div className="xl:col-span-7">
                  <ProofPanel batch={batch} messageId={selectedMessage} resetKey={batchKey(batch)} />
                </div>
                <div className="xl:col-span-5">
                  <TamperCard state={state} batch={batch} messageId={selectedMessage} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
