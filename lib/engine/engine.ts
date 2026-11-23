/**
 * Protocol operations for the SecureMessage Lab simulation.
 *
 * Every function mutates the `state` draft it is given. The React store clones
 * state before calling these, so UI state stays immutable. All operations take
 * an explicit `now` so the seeding script can replay history deterministically.
 */
import { nowMs, randomHex } from "./crypto.ts";
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_POLICY,
  DEFAULT_REPLAY_CAPACITY,
  EVENT_LIMIT,
  REPLAY_LOG_LIMIT,
  ROTATION_LIMIT,
  STATE_VERSION,
  USERS,
} from "./constants.ts";
import { buildMerkleTree, canonicalMessage, getMerkleProof, hashLeaf, verifyMerkleProof } from "./merkle.ts";
import { bufferLookup, bufferOrdered, bufferPush, bufferResize, createReplayBuffer } from "./replay-buffer.ts";
import { channelOf, deriveKey, pairIdOf, rotationDue, ROTATION_REASON_LABEL } from "./session-keys.ts";
import type {
  Batch,
  Envelope,
  EventKind,
  EventLevel,
  LabState,
  ProofVerification,
  ReplayAttempt,
  ReplayMode,
  ReplayReason,
  Result,
  RotationPolicy,
  RotationReason,
  SendMessageInput,
  SessionKey,
  SessionRecord,
  StoredMessage,
  User,
} from "./types.ts";
import { clampInt, LIMITS, validateMessageInput, validatePolicy } from "./validation.ts";

/* ------------------------------------------------------------------ */
/* State construction                                                  */
/* ------------------------------------------------------------------ */

export function createInitialState(now: number, users: User[] = USERS): LabState {
  const state: LabState = {
    version: STATE_VERSION,
    createdAt: now,
    users,
    messages: {},
    messageOrder: [],
    batches: {},
    batchOrder: [],
    openBatchId: "",
    batchSize: DEFAULT_BATCH_SIZE,
    sessions: {},
    keys: {},
    rotations: [],
    policy: { ...DEFAULT_POLICY },
    replay: createReplayBuffer(DEFAULT_REPLAY_CAPACITY),
    channelSeq: {},
    highWater: {},
    replayAttempts: [],
    events: [],
    metrics: { hashSamples: 0, hashTotalMs: 0, replayDetected: 0, rotations: 0, merkleVerifications: 0 },
    counters: { event: 0, trace: 0, batch: 0, replay: 0, rotation: 0 },
    lastTraceId: null,
  };
  openNewBatch(state, now);
  return state;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function userName(state: LabState, id: string): string {
  return state.users.find((u) => u.id === id)?.name ?? id;
}

export function pairLabel(state: LabState, pairId: string): string {
  const [a, b] = pairId.split(":");
  return `${userName(state, a)} ↔ ${userName(state, b)}`;
}

function logEvent(
  state: LabState,
  at: number,
  kind: EventKind,
  level: EventLevel,
  title: string,
  extra: { detail?: string; traceId?: string; durationMs?: number } = {},
) {
  state.counters.event++;
  state.events.unshift({ id: `ev_${state.counters.event}`, at, kind, level, title, ...extra });
  if (state.events.length > EVENT_LIMIT) state.events.length = EVENT_LIMIT;
}

function newTrace(state: LabState): string {
  state.counters.trace++;
  const id = `tr_${state.counters.trace}`;
  state.lastTraceId = id;
  return id;
}

function uniqueMessageId(state: LabState): string {
  let id: string;
  do id = `msg_${randomHex(5)}`;
  while (state.messages[id] || bufferLookup(state.replay, id) !== null);
  return id;
}

function openNewBatch(state: LabState, now: number): Batch {
  state.counters.batch++;
  const batch: Batch = {
    id: `batch_${String(state.counters.batch).padStart(3, "0")}`,
    index: state.counters.batch,
    messageIds: [],
    leafHashes: [],
    root: null,
    status: "open",
    createdAt: now,
    sealedAt: null,
    buildTimeMs: null,
    lastVerification: null,
    tampered: {},
  };
  state.batches[batch.id] = batch;
  state.batchOrder.push(batch.id);
  state.openBatchId = batch.id;
  return batch;
}

/** Current content of a message as stored in its batch (tamper overrides apply). */
export function batchContent(state: LabState, batch: Batch, messageId: string): string {
  return batch.tampered[messageId] ?? state.messages[messageId]?.content ?? "";
}

export async function recomputeLeaf(state: LabState, batch: Batch, messageId: string): Promise<string> {
  const m = state.messages[messageId];
  return hashLeaf(canonicalMessage({ ...m, content: batchContent(state, batch, messageId) }));
}

/* ------------------------------------------------------------------ */
/* Session keys                                                        */
/* ------------------------------------------------------------------ */

async function createSession(state: LabState, a: string, b: string, now: number, traceId?: string): Promise<SessionRecord> {
  const pairId = pairIdOf(a, b);
  const key = await deriveKey({ pairId, generation: 1, previousMaterial: null, now, policy: state.policy });
  state.keys[key.keyId] = key;
  const [userA, userB] = pairId.split(":");
  const session: SessionRecord = { pairId, userA, userB, activeKeyId: key.keyId, keyIds: [key.keyId], rotationCount: 0, createdAt: now };
  state.sessions[pairId] = session;
  pushRotation(state, pairId, null, key.keyId, "initial", now);
  logEvent(state, now, "key-rotation", "info", `Session established for ${pairLabel(state, pairId)}`, {
    detail: `Initial key ${key.keyId} (generation 1), fingerprint ${key.fingerprint}`,
    traceId,
  });
  return session;
}

function pushRotation(state: LabState, pairId: string, fromKeyId: string | null, toKeyId: string, reason: RotationReason, at: number) {
  state.counters.rotation++;
  state.rotations.unshift({ id: `rot_${state.counters.rotation}`, pairId, fromKeyId, toKeyId, reason, at });
  if (state.rotations.length > ROTATION_LIMIT) state.rotations.length = ROTATION_LIMIT;
}

export async function rotateKey(state: LabState, pairId: string, reason: RotationReason, now: number, traceId?: string): Promise<Result<{ key: SessionKey }>> {
  const session = state.sessions[pairId];
  if (!session) return { ok: false, error: "No session exists for this pair yet. Send a message first." };
  const old = state.keys[session.activeKeyId];
  const next = await deriveKey({ pairId, generation: old.generation + 1, previousMaterial: old.material, now, policy: state.policy });
  old.status = "expired";
  old.expiredAt = now;
  old.expiredReason = reason;
  old.material = null; // wipe: the old key can no longer be recovered from the new one
  state.keys[next.keyId] = next;
  session.activeKeyId = next.keyId;
  session.keyIds.push(next.keyId);
  session.rotationCount++;
  state.metrics.rotations++;
  pushRotation(state, pairId, old.keyId, next.keyId, reason, now);
  logEvent(state, now, "key-rotation", "warning", `Key rotated for ${pairLabel(state, pairId)}`, {
    detail: `${ROTATION_REASON_LABEL[reason]}: ${old.keyId} expired and wiped, ${next.keyId} active (generation ${next.generation})`,
    traceId,
  });
  return { ok: true, key: next };
}

/** Time-based rotation pass. Returns true if anything changed. */
export async function tick(state: LabState, now: number): Promise<boolean> {
  let changed = false;
  for (const session of Object.values(state.sessions)) {
    const key = state.keys[session.activeKeyId];
    if (state.policy.autoRotate && now >= key.expiresAt) {
      await rotateKey(state, session.pairId, "time-limit", now);
      changed = true;
    }
  }
  return changed;
}

export function needsTick(state: LabState, now: number): boolean {
  if (!state.policy.autoRotate) return false;
  return Object.values(state.sessions).some((s) => now >= state.keys[s.activeKeyId].expiresAt);
}

export function setPolicy(state: LabState, policy: RotationPolicy, now: number): Result<object> {
  const error = validatePolicy(policy);
  if (error) return { ok: false, error };
  state.policy = { ...policy };
  for (const s of Object.values(state.sessions)) {
    const key = state.keys[s.activeKeyId];
    key.expiresAt = key.createdAt + policy.maxAgeSeconds * 1000;
  }
  logEvent(state, now, "system", "info", "Rotation policy updated", {
    detail: `Auto-rotate ${policy.autoRotate ? "on" : "off"} · every ${policy.maxMessages} messages or ${policy.maxAgeSeconds}s`,
  });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Replay protection                                                   */
/* ------------------------------------------------------------------ */

type ReplayCheck = { ok: true } | { ok: false; reason: ReplayReason; slot: number | null; highWater: number };

function checkReplay(state: LabState, env: Envelope): ReplayCheck {
  const channel = channelOf(env.senderId, env.receiverId);
  const highWater = state.highWater[channel] ?? 0;
  const slot = bufferLookup(state.replay, env.id);
  if (slot !== null) return { ok: false, reason: "duplicate-id", slot, highWater };
  if (env.seq <= highWater) return { ok: false, reason: "stale-sequence", slot: null, highWater };
  return { ok: true };
}

export function setReplayCapacity(state: LabState, capacity: number, now: number) {
  const cap = clampInt(capacity, LIMITS.replayCapacity.min, LIMITS.replayCapacity.max);
  state.replay = bufferResize(state.replay, cap);
  logEvent(state, now, "system", "info", `Replay window resized to ${cap} slots`);
}

/* ------------------------------------------------------------------ */
/* Batches and Merkle verification                                     */
/* ------------------------------------------------------------------ */

export async function sealBatch(state: LabState, now: number, traceId?: string): Promise<Result<{ batchId: string }>> {
  const batch = state.batches[state.openBatchId];
  if (!batch || batch.messageIds.length === 0) return { ok: false, error: "The open batch is empty. Send a message first." };
  const t0 = nowMs();
  const tree = await buildMerkleTree(batch.leafHashes);
  batch.buildTimeMs = nowMs() - t0;
  batch.root = tree.root;
  batch.status = "sealed";
  batch.sealedAt = now;
  logEvent(state, now, "batch-seal", "info", `${batch.id} sealed with ${batch.messageIds.length} messages`, {
    detail: `Merkle root ${tree.root.slice(0, 16)}…`,
    traceId,
    durationMs: batch.buildTimeMs,
  });
  openNewBatch(state, now);
  await verifyBatch(state, batch.id, now, traceId);
  return { ok: true, batchId: batch.id };
}

export async function verifyBatch(state: LabState, batchId: string, now: number, traceId?: string): Promise<Result<{ valid: boolean }>> {
  const batch = state.batches[batchId];
  if (!batch) return { ok: false, error: "Batch not found." };
  if (batch.status !== "sealed" || !batch.root) return { ok: false, error: "Only sealed batches have a Merkle root to verify." };
  const t0 = nowMs();
  const leaves: string[] = [];
  const mismatched: string[] = [];
  for (let i = 0; i < batch.messageIds.length; i++) {
    const leaf = await recomputeLeaf(state, batch, batch.messageIds[i]);
    leaves.push(leaf);
    if (leaf !== batch.leafHashes[i]) mismatched.push(batch.messageIds[i]);
  }
  const tree = await buildMerkleTree(leaves);
  const valid = tree.root === batch.root;
  const durationMs = nowMs() - t0;
  batch.lastVerification = { at: now, valid, recomputedRoot: tree.root, mismatchedMessageIds: mismatched };
  state.metrics.merkleVerifications++;
  logEvent(
    state,
    now,
    "merkle-verify",
    valid ? "success" : "danger",
    valid ? `${batch.id} verified: root matches` : `${batch.id} failed verification`,
    {
      detail: valid
        ? `Recomputed root ${tree.root.slice(0, 16)}… equals the sealed root`
        : `Recomputed root ${tree.root.slice(0, 16)}… ≠ sealed root ${batch.root.slice(0, 16)}… · ${mismatched.length} altered message(s)`,
      traceId,
      durationMs,
    },
  );
  return { ok: true, valid };
}

export interface ProofCheck extends ProofVerification {
  batchId: string;
  messageId: string;
  leafIndex: number;
  recordedLeaf: string;
  proof: ReturnType<typeof getMerkleProof>;
}

/** Builds the stored proof for a message and verifies it against its current (possibly tampered) content. */
export async function checkMessageProof(state: LabState, batchId: string, messageId: string): Promise<Result<{ check: ProofCheck }>> {
  const batch = state.batches[batchId];
  if (!batch || batch.status !== "sealed" || !batch.root) return { ok: false, error: "Choose a sealed batch." };
  const leafIndex = batch.messageIds.indexOf(messageId);
  if (leafIndex < 0) return { ok: false, error: "That message is not in this batch." };
  const sealedTree = await buildMerkleTree(batch.leafHashes);
  const proof = getMerkleProof(sealedTree, leafIndex);
  const currentLeaf = await recomputeLeaf(state, batch, messageId);
  const verification = await verifyMerkleProof(currentLeaf, proof, batch.root);
  return { ok: true, check: { ...verification, batchId, messageId, leafIndex, recordedLeaf: batch.leafHashes[leafIndex], proof } };
}

export function logProofResult(state: LabState, check: ProofCheck, now: number) {
  state.metrics.merkleVerifications++;
  logEvent(
    state,
    now,
    "merkle-verify",
    check.valid ? "success" : "danger",
    check.valid ? `Proof valid for ${check.messageId}` : `Proof failed for ${check.messageId}`,
    { detail: `${check.proof.length} sibling hashes · computed root ${check.computedRoot.slice(0, 16)}… (${check.batchId})` },
  );
}

export async function tamperMessage(state: LabState, batchId: string, messageId: string, newContent: string, now: number): Promise<Result<{ valid: boolean }>> {
  const batch = state.batches[batchId];
  if (!batch || batch.status !== "sealed") return { ok: false, error: "Tamper tests run on sealed batches only." };
  if (!batch.messageIds.includes(messageId)) return { ok: false, error: "That message is not in this batch." };
  const content = newContent.trim();
  if (!content) return { ok: false, error: "Enter the altered text to store in the batch." };
  if (content === state.messages[messageId].content) return { ok: false, error: "Change at least one character to simulate tampering." };
  batch.tampered[messageId] = content;
  logEvent(state, now, "tamper", "warning", `Tamper test: ${messageId} altered in ${batch.id}`, {
    detail: `Stored text changed to "${content.slice(0, 60)}${content.length > 60 ? "…" : ""}"`,
  });
  const res = await verifyBatch(state, batchId, now);
  return res.ok ? { ok: true, valid: res.valid } : res;
}

export async function restoreBatch(state: LabState, batchId: string, now: number): Promise<Result<{ valid: boolean }>> {
  const batch = state.batches[batchId];
  if (!batch) return { ok: false, error: "Batch not found." };
  batch.tampered = {};
  logEvent(state, now, "tamper", "info", `${batch.id} restored to original content`);
  const res = await verifyBatch(state, batchId, now);
  return res.ok ? { ok: true, valid: res.valid } : res;
}

export function setBatchSize(state: LabState, size: number, now: number) {
  state.batchSize = clampInt(size, LIMITS.batchSize.min, LIMITS.batchSize.max);
  logEvent(state, now, "system", "info", `Batch size set to ${state.batchSize} messages`);
}

/* ------------------------------------------------------------------ */
/* Messaging                                                           */
/* ------------------------------------------------------------------ */

export interface SendOutcome {
  traceId: string;
  messageId: string;
  hash: string;
  hashTimeMs: number;
  keyId: string;
  rotatedBefore: boolean;
  rotatedAfter: boolean;
  sealedBatchId: string | null;
}

export async function sendMessage(state: LabState, input: SendMessageInput, now: number): Promise<Result<{ outcome: SendOutcome }>> {
  const error = validateMessageInput(input, state.users);
  if (error) return { ok: false, error };

  const { senderId, receiverId } = input;
  const content = input.content.trim();
  const traceId = newTrace(state);
  const pairId = pairIdOf(senderId, receiverId);

  // 1. Session-key lookup (hash map keyed by pair id)
  const l0 = nowMs();
  let session = state.sessions[pairId];
  const lookupMs = nowMs() - l0;
  if (!session) session = await createSession(state, senderId, receiverId, now, traceId);
  let key = state.keys[session.activeKeyId];
  logEvent(state, now, "key-lookup", "info", `Session key lookup: ${key.keyId}`, {
    detail: `${pairLabel(state, pairId)} · generation ${key.generation} · ${key.messageCount}/${state.policy.maxMessages} messages used`,
    traceId,
    durationMs: lookupMs,
  });

  // 2. Rotate first if the key is past its lifetime or message limit
  let rotatedBefore = false;
  const due = rotationDue(key, state.policy, now);
  if (due) {
    const r = await rotateKey(state, pairId, due, now, traceId);
    if (r.ok) {
      key = r.key;
      rotatedBefore = true;
    }
  }

  // 3. Build the envelope: unique ID, per-channel sequence number, nonce
  const channel = channelOf(senderId, receiverId);
  const seq = (state.channelSeq[channel] ?? 0) + 1;
  state.channelSeq[channel] = seq;
  const id = uniqueMessageId(state);

  // 4. SHA-256 leaf hash
  const h0 = nowMs();
  const hash = await hashLeaf(canonicalMessage({ id, seq, senderId, receiverId, timestamp: now, content }));
  const hashTimeMs = nowMs() - h0;
  state.metrics.hashSamples++;
  state.metrics.hashTotalMs += hashTimeMs;
  logEvent(state, now, "hash", "info", `SHA-256 computed for ${id}`, { detail: `${hash.slice(0, 24)}… · seq ${seq}`, traceId, durationMs: hashTimeMs });

  const env: Envelope = { id, seq, senderId, receiverId, content, timestamp: now, keyId: key.keyId, nonce: randomHex(12), hash };

  // 5. Receiver: replay check
  const check = checkReplay(state, env);
  if (!check.ok) {
    // Fresh envelopes cannot fail this check; kept for completeness.
    logEvent(state, now, "reject", "danger", `Message ${id} rejected`, { traceId });
    return { ok: false, error: "The receiver rejected the message." };
  }
  logEvent(state, now, "replay-check", "success", `Replay check passed for ${id}`, {
    detail: `ID not in the ${state.replay.capacity}-slot window · seq ${seq} > high-water ${state.highWater[channel] ?? 0}`,
    traceId,
  });

  // 6. Accept: record in replay window, advance high-water mark, add to open batch
  const evicted = bufferPush(state.replay, id);
  state.highWater[channel] = seq;
  key.messageCount++;
  const batch = state.batches[state.openBatchId];
  const stored: StoredMessage = { ...env, hashTimeMs, receivedAt: now, batchId: batch.id };
  state.messages[id] = stored;
  state.messageOrder.push(id);
  batch.messageIds.push(id);
  batch.leafHashes.push(hash);
  logEvent(state, now, "accept", "success", `Message ${id} accepted`, {
    detail: `${userName(state, senderId)} → ${userName(state, receiverId)} · added to ${batch.id} (${batch.messageIds.length}/${state.batchSize})${evicted ? ` · ${evicted} left the replay window` : ""}`,
    traceId,
  });

  // 7. Seal the batch when full
  let sealedBatchId: string | null = null;
  if (batch.messageIds.length >= state.batchSize) {
    const s = await sealBatch(state, now, traceId);
    if (s.ok) sealedBatchId = s.batchId;
  }

  // 8. Rotate after the message limit is reached so the next message uses a fresh key
  let rotatedAfter = false;
  if (state.policy.autoRotate && key.messageCount >= state.policy.maxMessages) {
    const r = await rotateKey(state, pairId, "message-limit", now, traceId);
    rotatedAfter = r.ok;
  }

  return { ok: true, outcome: { traceId, messageId: id, hash, hashTimeMs, keyId: key.keyId, rotatedBefore, rotatedAfter, sealedBatchId } };
}

/* ------------------------------------------------------------------ */
/* Replay attacks                                                      */
/* ------------------------------------------------------------------ */

export function replayCandidates(state: LabState, mode: ReplayMode): string[] {
  const inWindow = new Set(bufferOrdered(state.replay));
  if (mode === "evicted") return state.messageOrder.filter((id) => !inWindow.has(id));
  if (mode === "exact") return state.messageOrder.filter((id) => inWindow.has(id));
  return state.messageOrder.slice();
}

export async function replayMessage(
  state: LabState,
  messageId: string,
  mode: ReplayMode,
  now: number,
): Promise<Result<{ attempt: ReplayAttempt; traceId: string }>> {
  const original = state.messages[messageId];
  if (!original) return { ok: false, error: "Choose a previously accepted message to replay." };
  const traceId = newTrace(state);

  const env: Envelope = {
    id: original.id,
    seq: original.seq,
    senderId: original.senderId,
    receiverId: original.receiverId,
    content: original.content,
    timestamp: original.timestamp,
    keyId: original.keyId,
    nonce: original.nonce,
    hash: original.hash,
  };
  if (mode === "forged-id") env.id = uniqueMessageId(state);

  const modeLabel = { exact: "an exact copy of", "forged-id": "a copy with a forged new ID of", evicted: "an old copy of" }[mode];
  logEvent(state, now, "system", "warning", `Mallory re-sends ${modeLabel} ${original.id}`, {
    detail: `Claims ${userName(state, env.senderId)} → ${userName(state, env.receiverId)} · ID ${env.id} · seq ${env.seq}`,
    traceId,
  });

  const check = checkReplay(state, env);
  if (check.ok) {
    // Cannot happen: every replayed envelope has seq ≤ the channel's high-water mark.
    return { ok: false, error: "Replay was not detected. Check the protocol configuration." };
  }

  const key = state.keys[env.keyId];
  const keyExpired = !key || key.status === "expired";
  state.counters.replay++;
  state.metrics.replayDetected++;
  const attempt: ReplayAttempt = {
    id: `rp_${state.counters.replay}`,
    messageId: env.id,
    originalMessageId: original.id,
    seq: env.seq,
    senderId: env.senderId,
    receiverId: env.receiverId,
    content: env.content,
    originalTimestamp: original.timestamp,
    attemptedAt: now,
    reason: check.reason,
    mode,
    keyId: env.keyId,
    keyExpired,
    bufferSlot: check.slot,
    highWater: check.highWater,
  };
  state.replayAttempts.unshift(attempt);
  if (state.replayAttempts.length > REPLAY_LOG_LIMIT) state.replayAttempts.length = REPLAY_LOG_LIMIT;

  logEvent(
    state,
    now,
    "replay-check",
    "danger",
    check.reason === "duplicate-id" ? `Duplicate ID ${env.id} found in replay window` : `Stale sequence number ${env.seq}`,
    {
      detail:
        check.reason === "duplicate-id"
          ? `Matched buffer slot ${check.slot} (O(1) index lookup)`
          : `ID not in window, but seq ${env.seq} ≤ high-water ${check.highWater} for this channel`,
      traceId,
    },
  );
  logEvent(state, now, "reject", "danger", "Replay attack detected: message rejected", {
    detail: `${env.id} dropped before delivery${keyExpired ? ` · it was also sent under expired key ${env.keyId}` : ""}`,
    traceId,
  });
  return { ok: true, attempt, traceId };
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function logSystem(state: LabState, now: number, title: string, detail?: string) {
  logEvent(state, now, "system", "info", title, { detail });
}

export function isLabState(value: unknown): value is LabState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<LabState>;
  return (
    v.version === STATE_VERSION &&
    typeof v.messages === "object" &&
    Array.isArray(v.messageOrder) &&
    typeof v.batches === "object" &&
    typeof v.sessions === "object" &&
    typeof v.replay === "object" &&
    Array.isArray(v.events)
  );
}
