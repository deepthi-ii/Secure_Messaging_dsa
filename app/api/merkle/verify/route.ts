import { NextResponse } from "next/server";
import { isHex64 } from "@/lib/engine/crypto";
import { verifyMerkleProof } from "@/lib/engine/merkle";
import { nodeSha256 } from "@/lib/engine/node-hash";
import type { MerkleProofStep } from "@/lib/engine/types";

export const runtime = "nodejs";

/**
 * POST { leafHash, root, proof: [{ sibling, position }] }
 * Recomputes the root with Node.js crypto, independent of the browser's Web Crypto result.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body with leafHash, root and proof." }, { status: 400 });
  }
  const { leafHash, root, proof } = (body ?? {}) as { leafHash?: unknown; root?: unknown; proof?: unknown };
  if (!isHex64(leafHash)) return NextResponse.json({ error: "leafHash must be 64 lowercase hex characters." }, { status: 400 });
  if (!isHex64(root)) return NextResponse.json({ error: "root must be 64 lowercase hex characters." }, { status: 400 });
  if (!Array.isArray(proof) || proof.length > 32) return NextResponse.json({ error: "proof must be an array of at most 32 steps." }, { status: 400 });

  const steps: MerkleProofStep[] = [];
  for (const [i, raw] of proof.entries()) {
    const s = raw as Partial<MerkleProofStep>;
    if (!isHex64(s?.sibling) || (s.position !== "left" && s.position !== "right"))
      return NextResponse.json({ error: `Proof step ${i} needs a 64-char hex sibling and a position of "left" or "right".` }, { status: 400 });
    steps.push({ sibling: s.sibling, position: s.position, level: i });
  }

  const result = await verifyMerkleProof(leafHash, steps, root, nodeSha256);
  return NextResponse.json({ ...result, engine: "node:crypto", simulation: true });
}
