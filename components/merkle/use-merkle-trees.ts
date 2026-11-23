"use client";

import * as React from "react";
import { recomputeLeaf } from "@/lib/engine/engine";
import { buildMerkleTree } from "@/lib/engine/merkle";
import type { Batch, LabState, MerkleTree } from "@/lib/engine/types";

export interface MerkleTrees {
  key: string;
  /** Tree from the leaf hashes recorded at seal time. */
  sealed: MerkleTree;
  /** Tree recomputed from the content currently stored in the batch. */
  current: MerkleTree;
}

export function batchKey(batch: Batch | undefined): string {
  return batch ? `${batch.id}|${batch.leafHashes.length}|${batch.root}|${JSON.stringify(batch.tampered)}` : "";
}

export function useMerkleTrees(state: LabState | null, batch: Batch | undefined) {
  const [trees, setTrees] = React.useState<MerkleTrees | null>(null);
  const key = batchKey(batch);
  const stateRef = React.useRef(state);
  stateRef.current = state;

  React.useEffect(() => {
    let cancelled = false;
    const s = stateRef.current;
    if (!s || !batch || batch.leafHashes.length === 0) {
      setTrees(null);
      return;
    }
    (async () => {
      const sealed = await buildMerkleTree(batch.leafHashes);
      const leaves = await Promise.all(batch.messageIds.map((id) => recomputeLeaf(s, batch, id)));
      const current = await buildMerkleTree(leaves);
      if (!cancelled) setTrees({ key, sealed, current });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { trees: trees && trees.key === key ? trees : null, loading: !!batch?.leafHashes.length && trees?.key !== key };
}
