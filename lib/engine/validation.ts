import type { RotationPolicy, SendMessageInput, User } from "./types.ts";

export const MESSAGE_MAX_LENGTH = 500;

export const LIMITS = {
  maxMessages: { min: 1, max: 100 },
  maxAgeSeconds: { min: 10, max: 3600 },
  batchSize: { min: 2, max: 16 },
  replayCapacity: { min: 4, max: 64 },
} as const;

export function validateMessageInput(input: SendMessageInput, users: User[]): string | null {
  const ids = new Set(users.map((u) => u.id));
  if (!input.senderId || !ids.has(input.senderId)) return "Choose a sender.";
  if (!input.receiverId || !ids.has(input.receiverId)) return "Choose a receiver.";
  if (input.senderId === input.receiverId) return "Sender and receiver must be different users.";
  const content = (input.content ?? "").trim();
  if (content.length === 0) return "Write a message before sending.";
  if (content.length > MESSAGE_MAX_LENGTH) return `Messages are limited to ${MESSAGE_MAX_LENGTH} characters.`;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(content)) return "Remove control characters from the message.";
  return null;
}

export function validatePolicy(policy: RotationPolicy): string | null {
  const { maxMessages, maxAgeSeconds } = LIMITS;
  if (!Number.isInteger(policy.maxMessages) || policy.maxMessages < maxMessages.min || policy.maxMessages > maxMessages.max)
    return `Message limit must be a whole number from ${maxMessages.min} to ${maxMessages.max}.`;
  if (!Number.isInteger(policy.maxAgeSeconds) || policy.maxAgeSeconds < maxAgeSeconds.min || policy.maxAgeSeconds > maxAgeSeconds.max)
    return `Key lifetime must be from ${maxAgeSeconds.min} to ${maxAgeSeconds.max} seconds.`;
  return null;
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
