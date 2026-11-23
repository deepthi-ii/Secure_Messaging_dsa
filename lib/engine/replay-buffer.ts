/**
 * Replay-protection window: a fixed-size circular buffer of recently accepted
 * message IDs plus an index map for O(1) "have I seen this ID?" checks.
 * When the buffer is full, the oldest ID is overwritten (evicted).
 */
import type { ReplayBufferState } from "./types.ts";

export function createReplayBuffer(capacity: number): ReplayBufferState {
  return { capacity, slots: Array(capacity).fill(null), head: 0, size: 0, index: {}, totalInserted: 0, totalEvicted: 0 };
}

export function bufferLookup(buf: ReplayBufferState, id: string): number | null {
  return Object.prototype.hasOwnProperty.call(buf.index, id) ? buf.index[id] : null;
}

/** Inserts an ID, returning the evicted ID if the buffer was full. Mutates `buf`. */
export function bufferPush(buf: ReplayBufferState, id: string): string | null {
  let evicted: string | null = null;
  if (buf.size === buf.capacity) {
    evicted = buf.slots[buf.head];
    if (evicted !== null) {
      delete buf.index[evicted];
      buf.totalEvicted++;
    }
  } else {
    buf.size++;
  }
  buf.slots[buf.head] = id;
  buf.index[id] = buf.head;
  buf.head = (buf.head + 1) % buf.capacity;
  buf.totalInserted++;
  return evicted;
}

/** IDs from oldest to newest. */
export function bufferOrdered(buf: ReplayBufferState): string[] {
  const out: string[] = [];
  const start = buf.size === buf.capacity ? buf.head : 0;
  for (let i = 0; i < buf.size; i++) {
    const v = buf.slots[(start + i) % buf.capacity];
    if (v !== null) out.push(v);
  }
  return out;
}

/** Returns a new buffer with the given capacity, keeping the most recent IDs. */
export function bufferResize(buf: ReplayBufferState, capacity: number): ReplayBufferState {
  const ordered = bufferOrdered(buf);
  const next = createReplayBuffer(capacity);
  for (const id of ordered.slice(-capacity)) bufferPush(next, id);
  next.totalInserted = buf.totalInserted;
  next.totalEvicted = buf.totalEvicted + Math.max(0, ordered.length - capacity);
  return next;
}
