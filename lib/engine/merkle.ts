/**
 * SHA-256 Merkle tree with domain separation (RFC 6962 style):
 *   leaf = SHA-256(0x00 || canonical message bytes)
 *   node = SHA-256(0x01 || left || right)
 * The prefixes stop an attacker presenting an internal node as a leaf.
 * When a level has an odd number of nodes, the last node is promoted unchanged.
 */
import { concatBytes, fromHex, toHex, utf8, webSha256, type HashFn } from "./crypto.ts";
import type { Envelope, MerkleProofStep, MerkleTree, ProofVerification } from "./types.ts";

const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);

/** Fields covered by the hash, in a fixed order so every party serializes identically. */
export function canonicalMessage(m: Pick<Envelope, "id" | "seq" | "senderId" | "receiverId" | "timestamp" | "content">): string {
  return JSON.stringify([m.id, m.seq, m.senderId, m.receiverId, m.timestamp, m.content]);
}

export async function hashLeaf(canonical: string, hash: HashFn = webSha256): Promise<string> {
  return toHex(await hash(concatBytes(LEAF_PREFIX, utf8(canonical))));
}

export async function hashNode(leftHex: string, rightHex: string, hash: HashFn = webSha256): Promise<string> {
  return toHex(await hash(concatBytes(NODE_PREFIX, fromHex(leftHex), fromHex(rightHex))));
}

export async function buildMerkleTree(leaves: string[], hash: HashFn = webSha256): Promise<MerkleTree> {
  if (leaves.length === 0) throw new Error("Cannot build a Merkle tree with no leaves");
  const levels: string[][] = [leaves.slice()];
  while (levels[levels.length - 1].length > 1) {
    const current = levels[levels.length - 1];
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push(i + 1 < current.length ? await hashNode(current[i], current[i + 1], hash) : current[i]);
    }
    levels.push(next);
  }
  return { levels, root: levels[levels.length - 1][0] };
}

/** Sibling hashes needed to recompute the root from leaf `index`. */
export function getMerkleProof(tree: MerkleTree, index: number): MerkleProofStep[] {
  if (index < 0 || index >= tree.levels[0].length) throw new Error("Leaf index out of range");
  const proof: MerkleProofStep[] = [];
  let idx = index;
  for (let level = 0; level < tree.levels.length - 1; level++) {
    const nodes = tree.levels[level];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    if (siblingIdx < nodes.length) {
      proof.push({ sibling: nodes[siblingIdx], position: isRight ? "left" : "right", level });
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/** Node positions on the path from a leaf to the root, plus the siblings used by its proof. */
export function getProofLayout(tree: MerkleTree, index: number): { path: number[]; siblings: (number | null)[] } {
  const path: number[] = [];
  const siblings: (number | null)[] = [];
  let idx = index;
  for (let level = 0; level < tree.levels.length; level++) {
    path.push(idx);
    const sib = idx % 2 === 1 ? idx - 1 : idx + 1;
    siblings.push(level < tree.levels.length - 1 && sib < tree.levels[level].length ? sib : null);
    idx = Math.floor(idx / 2);
  }
  return { path, siblings };
}

export async function verifyMerkleProof(
  leafHash: string,
  proof: MerkleProofStep[],
  expectedRoot: string,
  hash: HashFn = webSha256,
): Promise<ProofVerification> {
  let running = leafHash;
  const path = [running];
  for (const step of proof) {
    running = step.position === "left" ? await hashNode(step.sibling, running, hash) : await hashNode(running, step.sibling, hash);
    path.push(running);
  }
  return { valid: running === expectedRoot, leafHash, computedRoot: running, expectedRoot, path };
}

export function treeDepth(leafCount: number): number {
  return leafCount <= 1 ? 0 : Math.ceil(Math.log2(leafCount));
}
