/** Client-side benchmark: SHA-256 throughput, Merkle build time and proof verification. */
import { nowMs, randomHex } from "./crypto.ts";
import { buildMerkleTree, canonicalMessage, getMerkleProof, hashLeaf, treeDepth, verifyMerkleProof } from "./merkle.ts";
import type { BenchmarkResult } from "./types.ts";

export async function runBenchmark(count: number, onProgress?: (done: number) => void): Promise<BenchmarkResult> {
  const leaves: string[] = [];
  let totalHashMs = 0;
  const base = Date.now();
  for (let i = 0; i < count; i++) {
    const canonical = canonicalMessage({
      id: `bench_${i}`,
      seq: i + 1,
      senderId: "alice",
      receiverId: "bob",
      timestamp: base + i,
      content: `Benchmark payload ${randomHex(24)}`,
    });
    const t0 = nowMs();
    leaves.push(await hashLeaf(canonical));
    totalHashMs += nowMs() - t0;
    if (onProgress && i % 100 === 99) {
      onProgress(i + 1);
      await new Promise((r) => setTimeout(r, 0)); // keep the UI responsive
    }
  }
  const b0 = nowMs();
  const tree = await buildMerkleTree(leaves);
  const treeBuildMs = nowMs() - b0;

  const index = Math.floor(count / 3);
  const proof = getMerkleProof(tree, index);
  const v0 = nowMs();
  const verification = await verifyMerkleProof(leaves[index], proof, tree.root);
  const proofVerifyMs = nowMs() - v0;
  onProgress?.(count);

  return {
    messages: count,
    totalHashMs,
    avgHashMs: totalHashMs / count,
    hashesPerSecond: totalHashMs > 0 ? (count / totalHashMs) * 1000 : 0,
    treeBuildMs,
    treeDepth: treeDepth(count),
    proofSteps: proof.length,
    proofVerifyMs,
    proofValid: verification.valid,
    ranAt: Date.now(),
  };
}
