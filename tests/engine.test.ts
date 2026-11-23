import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildMerkleTree, canonicalMessage, getMerkleProof, hashLeaf, hashNode, verifyMerkleProof } from "../lib/engine/merkle.ts";
import { bufferLookup, bufferOrdered, bufferPush, bufferResize, createReplayBuffer } from "../lib/engine/replay-buffer.ts";
import {
  checkMessageProof,
  createInitialState,
  replayMessage,
  restoreBatch,
  rotateKey,
  sendMessage,
  tamperMessage,
  tick,
} from "../lib/engine/engine.ts";
import { seedState } from "../lib/engine/seed.ts";
import { pairIdOf } from "../lib/engine/session-keys.ts";

test("leaf hash matches Node crypto with 0x00 prefix", async () => {
  const c = canonicalMessage({ id: "m1", seq: 1, senderId: "a", receiverId: "b", timestamp: 1, content: "hi" });
  const expected = createHash("sha256").update(Buffer.concat([Buffer.from([0]), Buffer.from(c)])).digest("hex");
  assert.equal(await hashLeaf(c), expected);
});

test("Merkle proofs verify for every leaf, including odd counts", async () => {
  for (const n of [1, 2, 3, 5, 7, 8, 13]) {
    const leaves = await Promise.all(Array.from({ length: n }, (_, i) => hashLeaf(`leaf-${i}`)));
    const tree = await buildMerkleTree(leaves);
    for (let i = 0; i < n; i++) {
      const v = await verifyMerkleProof(leaves[i], getMerkleProof(tree, i), tree.root);
      assert.ok(v.valid, `n=${n} i=${i}`);
    }
    const bad = await verifyMerkleProof(await hashLeaf("evil"), getMerkleProof(tree, 0), tree.root);
    assert.equal(bad.valid, n === 0);
  }
});

test("two-leaf root equals H(0x01 || l || r)", async () => {
  const l = await hashLeaf("x");
  const r = await hashLeaf("y");
  const tree = await buildMerkleTree([l, r]);
  assert.equal(tree.root, await hashNode(l, r));
});

test("circular buffer evicts oldest and keeps O(1) index", () => {
  const b = createReplayBuffer(3);
  for (const id of ["a", "b", "c"]) assert.equal(bufferPush(b, id), null);
  assert.equal(bufferPush(b, "d"), "a");
  assert.equal(bufferLookup(b, "a"), null);
  assert.deepEqual(bufferOrdered(b), ["b", "c", "d"]);
  const r = bufferResize(b, 2);
  assert.deepEqual(bufferOrdered(r), ["c", "d"]);
});

test("send, replay detection (exact, forged-id, evicted)", async () => {
  const s = createInitialState(0);
  s.replay = createReplayBuffer(4);
  const first = await sendMessage(s, { senderId: "alice", receiverId: "bob", content: "one" }, 1000);
  assert.ok(first.ok);
  if (!first.ok) return;
  const exact = await replayMessage(s, first.outcome.messageId, "exact", 2000);
  assert.ok(exact.ok && exact.attempt.reason === "duplicate-id");
  const forged = await replayMessage(s, first.outcome.messageId, "forged-id", 2100);
  assert.ok(forged.ok && forged.attempt.reason === "stale-sequence");
  for (let i = 0; i < 5; i++) await sendMessage(s, { senderId: "alice", receiverId: "bob", content: `m${i}` }, 3000 + i);
  const evicted = await replayMessage(s, first.outcome.messageId, "evicted", 9000);
  assert.ok(evicted.ok && evicted.attempt.reason === "stale-sequence");
  assert.equal(s.metrics.replayDetected, 3);
  assert.equal(s.messageOrder.length, 6);
});

test("validation rejects bad input", async () => {
  const s = createInitialState(0);
  assert.equal((await sendMessage(s, { senderId: "alice", receiverId: "alice", content: "x" }, 1)).ok, false);
  assert.equal((await sendMessage(s, { senderId: "alice", receiverId: "bob", content: "   " }, 1)).ok, false);
  assert.equal((await sendMessage(s, { senderId: "alice", receiverId: "bob", content: "x".repeat(501) }, 1)).ok, false);
});

test("batches seal, verify, fail on tamper and recover on restore", async () => {
  const s = createInitialState(0);
  for (let i = 0; i < 4; i++) await sendMessage(s, { senderId: "alice", receiverId: "bob", content: `msg ${i}` }, 1000 + i);
  const batch = s.batches[s.batchOrder[0]];
  assert.equal(batch.status, "sealed");
  assert.equal(batch.lastVerification?.valid, true);
  const target = batch.messageIds[2];
  const proofOk = await checkMessageProof(s, batch.id, target);
  assert.ok(proofOk.ok && proofOk.check.valid);
  const t = await tamperMessage(s, batch.id, target, "msg 2 (edited)", 5000);
  assert.ok(t.ok && t.valid === false);
  assert.deepEqual(batch.lastVerification?.mismatchedMessageIds, [target]);
  const proofBad = await checkMessageProof(s, batch.id, target);
  assert.ok(proofBad.ok && !proofBad.check.valid);
  const untouched = await checkMessageProof(s, batch.id, batch.messageIds[0]);
  assert.ok(untouched.ok && untouched.check.valid, "other messages still verify against the root");
  const r = await restoreBatch(s, batch.id, 6000);
  assert.ok(r.ok && r.valid);
});

test("key rotation by message count, time, and manual; old keys wiped", async () => {
  const s = createInitialState(0);
  s.policy = { autoRotate: true, maxMessages: 3, maxAgeSeconds: 60 };
  for (let i = 0; i < 3; i++) await sendMessage(s, { senderId: "alice", receiverId: "bob", content: `k${i}` }, 1000 + i);
  const pair = pairIdOf("alice", "bob");
  assert.equal(s.sessions[pair].rotationCount, 1);
  const firstKey = s.keys[s.sessions[pair].keyIds[0]];
  assert.equal(firstKey.status, "expired");
  assert.equal(firstKey.material, null);
  await tick(s, 1000 + 61_000);
  assert.equal(s.sessions[pair].rotationCount, 2);
  const m = await rotateKey(s, pair, "manual", 70_000);
  assert.ok(m.ok);
  assert.equal(s.sessions[pair].rotationCount, 3);
  assert.equal(Object.values(s.keys).filter((k) => k.pairId === pair && k.status === "active").length, 1);
});

test("seeded state is consistent", async () => {
  const s = await seedState(Date.now());
  assert.ok(s.messageOrder.length >= 30);
  assert.ok(s.metrics.replayDetected >= 5);
  for (const id of s.batchOrder) {
    const b = s.batches[id];
    if (b.status === "sealed") assert.equal(b.lastVerification?.valid, true);
  }
  assert.ok(s.metrics.rotations > 0);
});
