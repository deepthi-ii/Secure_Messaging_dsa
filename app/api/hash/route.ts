import { NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { toHex, utf8 } from "@/lib/engine/crypto";
import { hashLeaf } from "@/lib/engine/merkle";
import { nodeSha256 } from "@/lib/engine/node-hash";

export const runtime = "nodejs";

/** POST { data: string } → raw SHA-256 and Merkle leaf hash computed with Node.js crypto. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body like { \"data\": \"text\" }." }, { status: 400 });
  }
  const data = (body as { data?: unknown })?.data;
  if (typeof data !== "string") return NextResponse.json({ error: "\"data\" must be a string." }, { status: 400 });
  if (data.length > 10_000) return NextResponse.json({ error: "\"data\" is limited to 10,000 characters." }, { status: 413 });

  const t0 = performance.now();
  const sha256 = toHex(await nodeSha256(utf8(data)));
  const timeMs = performance.now() - t0;
  const leafHash = await hashLeaf(data, nodeSha256);
  return NextResponse.json({ algorithm: "SHA-256", engine: "node:crypto", sha256, leafHash, timeMs, simulation: true });
}
