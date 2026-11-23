/**
 * Shared domain types for the SecureMessage Lab simulation.
 *
 * EDUCATIONAL SIMULATION: nothing here encrypts data. "Keys" are random mock
 * values used to demonstrate lifecycle concepts (lookup, rotation, expiry).
 */

export type UserId = string;
/** Unordered pair of users, e.g. "alice:bob" (sorted). One session per pair. */
export type PairId = string;
/** Directed channel, e.g. "alice>bob". Sequence numbers are tracked per channel. */
export type ChannelId = string;

export interface User {
  id: UserId;
  name: string;
  role: string;
  initials: string;
  color: string;
}

/** What travels over the (simulated) wire. */
export interface Envelope {
  id: string;
  seq: number;
  senderId: UserId;
  receiverId: UserId;
  content: string;
  timestamp: number;
  keyId: string;
  nonce: string;
  /** SHA-256 leaf hash (hex) of the canonical message. */
  hash: string;
}

/** A message accepted by the receiver and stored in a batch. */
export interface StoredMessage extends Envelope {
  hashTimeMs: number;
  receivedAt: number;
  batchId: string;
}

export interface MerkleTree {
  /** levels[0] are leaves, the last level holds only the root. */
  levels: string[][];
  root: string;
}

export interface MerkleProofStep {
  sibling: string;
  /** Where the sibling sits relative to the running hash. */
  position: "left" | "right";
  level: number;
}

export interface ProofVerification {
  valid: boolean;
  leafHash: string;
  computedRoot: string;
  expectedRoot: string;
  /** Running hash after each proof step (leaf first, computed root last). */
  path: string[];
}

export interface BatchVerification {
  at: number;
  valid: boolean;
  recomputedRoot: string;
  mismatchedMessageIds: string[];
}

export type BatchStatus = "open" | "sealed";

export interface Batch {
  id: string;
  index: number;
  messageIds: string[];
  /** Leaf hashes as recorded when each message was accepted. */
  leafHashes: string[];
  root: string | null;
  status: BatchStatus;
  createdAt: number;
  sealedAt: number | null;
  buildTimeMs: number | null;
  lastVerification: BatchVerification | null;
  /** Tamper test overrides: messageId -> altered content stored in the batch. */
  tampered: Record<string, string>;
}

export type KeyStatus = "active" | "expired";
export type RotationReason = "initial" | "manual" | "message-limit" | "time-limit";

export interface SessionKey {
  keyId: string;
  pairId: PairId;
  generation: number;
  /** 96-bit mock nonce (hex). */
  nonce: string;
  /** Short SHA-256 fingerprint of the mock key material. */
  fingerprint: string;
  /** Mock key material. Wiped (null) when the key expires. Never used for encryption. */
  material: string | null;
  createdAt: number;
  expiresAt: number;
  messageCount: number;
  status: KeyStatus;
  expiredAt: number | null;
  expiredReason: RotationReason | null;
}

export interface SessionRecord {
  pairId: PairId;
  userA: UserId;
  userB: UserId;
  activeKeyId: string;
  keyIds: string[];
  rotationCount: number;
  createdAt: number;
}

export interface RotationEvent {
  id: string;
  pairId: PairId;
  fromKeyId: string | null;
  toKeyId: string;
  reason: RotationReason;
  at: number;
}

export interface RotationPolicy {
  autoRotate: boolean;
  /** Rotate after this many messages on one key. */
  maxMessages: number;
  /** Rotate after the key is this many seconds old. */
  maxAgeSeconds: number;
}

/** Fixed-capacity circular buffer of recently accepted message IDs. */
export interface ReplayBufferState {
  capacity: number;
  slots: (string | null)[];
  /** Next slot to write (also the oldest entry once full). */
  head: number;
  size: number;
  /** messageId -> slot, for O(1) membership checks. */
  index: Record<string, number>;
  totalInserted: number;
  totalEvicted: number;
}

export type ReplayReason = "duplicate-id" | "stale-sequence";
export type ReplayMode = "exact" | "forged-id" | "evicted";

export interface ReplayAttempt {
  id: string;
  messageId: string;
  originalMessageId: string;
  seq: number;
  senderId: UserId;
  receiverId: UserId;
  content: string;
  originalTimestamp: number;
  attemptedAt: number;
  reason: ReplayReason;
  mode: ReplayMode;
  keyId: string;
  keyExpired: boolean;
  /** Slot where the duplicate ID was found, if any. */
  bufferSlot: number | null;
  highWater: number;
}

export type EventKind =
  | "hash"
  | "key-lookup"
  | "key-rotation"
  | "replay-check"
  | "accept"
  | "reject"
  | "batch-seal"
  | "merkle-verify"
  | "tamper"
  | "system";

export type EventLevel = "info" | "success" | "warning" | "danger";

export interface SecurityEvent {
  id: string;
  at: number;
  kind: EventKind;
  level: EventLevel;
  title: string;
  detail?: string;
  traceId?: string;
  durationMs?: number;
}

export interface Metrics {
  hashSamples: number;
  hashTotalMs: number;
  replayDetected: number;
  rotations: number;
  merkleVerifications: number;
}

export interface LabState {
  version: number;
  createdAt: number;
  users: User[];
  messages: Record<string, StoredMessage>;
  messageOrder: string[];
  batches: Record<string, Batch>;
  batchOrder: string[];
  openBatchId: string;
  batchSize: number;
  sessions: Record<PairId, SessionRecord>;
  keys: Record<string, SessionKey>;
  rotations: RotationEvent[];
  policy: RotationPolicy;
  replay: ReplayBufferState;
  /** Sender side: last sequence number assigned per channel. */
  channelSeq: Record<ChannelId, number>;
  /** Receiver side: highest accepted sequence number per channel. */
  highWater: Record<ChannelId, number>;
  replayAttempts: ReplayAttempt[];
  events: SecurityEvent[];
  metrics: Metrics;
  counters: { event: number; trace: number; batch: number; replay: number; rotation: number };
  lastTraceId: string | null;
}

export interface SendMessageInput {
  senderId: UserId;
  receiverId: UserId;
  content: string;
}

export type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

export interface BenchmarkResult {
  messages: number;
  totalHashMs: number;
  avgHashMs: number;
  hashesPerSecond: number;
  treeBuildMs: number;
  treeDepth: number;
  proofSteps: number;
  proofVerifyMs: number;
  proofValid: boolean;
  ranAt: number;
}
