/**
 * Mock session-key lifecycle. Each user pair has one SessionRecord in a hash map
 * keyed by PairId, so lookup is O(1). Keys advance with a one-way hash ratchet:
 *   material[n+1] = SHA-256(material[n] || "ratchet" || n)
 * and the old material is wiped. Knowing a new key does not reveal an old one,
 * which is the intuition behind forward secrecy. This is a teaching model only:
 * real protocols use authenticated key exchange (e.g. X3DH + Double Ratchet).
 */
import { randomHex, sha256Hex } from "./crypto.ts";
import type { PairId, RotationPolicy, RotationReason, SessionKey, UserId } from "./types.ts";

export function pairIdOf(a: UserId, b: UserId): PairId {
  return [a, b].sort().join(":");
}

export function channelOf(sender: UserId, receiver: UserId): string {
  return `${sender}>${receiver}`;
}

export async function deriveKey(params: {
  pairId: PairId;
  generation: number;
  previousMaterial: string | null;
  now: number;
  policy: RotationPolicy;
}): Promise<SessionKey> {
  const { pairId, generation, previousMaterial, now, policy } = params;
  const material = previousMaterial
    ? await sha256Hex(`${previousMaterial}|ratchet|${generation}`)
    : await sha256Hex(`${randomHex(32)}|${pairId}|seed`);
  const fingerprint = (await sha256Hex(`fp|${material}`)).slice(0, 16);
  return {
    keyId: `sk_${randomHex(4)}`,
    pairId,
    generation,
    nonce: randomHex(12),
    fingerprint,
    material,
    createdAt: now,
    expiresAt: now + policy.maxAgeSeconds * 1000,
    messageCount: 0,
    status: "active",
    expiredAt: null,
    expiredReason: null,
  };
}

export function rotationDue(key: SessionKey, policy: RotationPolicy, now: number): RotationReason | null {
  if (!policy.autoRotate || key.status !== "active") return null;
  if (key.messageCount >= policy.maxMessages) return "message-limit";
  if (now >= key.expiresAt) return "time-limit";
  return null;
}

export function nextRotationInfo(key: SessionKey, policy: RotationPolicy, now: number) {
  return {
    msRemaining: Math.max(0, key.expiresAt - now),
    messagesRemaining: Math.max(0, policy.maxMessages - key.messageCount),
  };
}

export const ROTATION_REASON_LABEL: Record<RotationReason, string> = {
  initial: "Session established",
  manual: "Manual rotation",
  "message-limit": "Message limit reached",
  "time-limit": "Key lifetime reached",
};
