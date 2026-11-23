import { bufferOrdered } from "./replay-buffer.ts";
import type { LabState, SessionKey } from "./types.ts";

export function getMetrics(state: LabState) {
  const sealed = state.batchOrder.map((id) => state.batches[id]).filter((b) => b.status === "sealed");
  return {
    totalMessages: state.messageOrder.length,
    sealedBatches: sealed.length,
    verifiedBatches: sealed.filter((b) => b.lastVerification?.valid).length,
    failedBatches: sealed.filter((b) => b.lastVerification && !b.lastVerification.valid).length,
    activeKeys: Object.values(state.keys).filter((k) => k.status === "active").length,
    expiredKeys: Object.values(state.keys).filter((k) => k.status === "expired").length,
    replayAttempts: state.metrics.replayDetected,
    avgHashMs: state.metrics.hashSamples ? state.metrics.hashTotalMs / state.metrics.hashSamples : 0,
    rotations: state.metrics.rotations,
    bufferFill: state.replay.size / state.replay.capacity,
  };
}

export interface TrafficPoint {
  label: string;
  start: number;
  accepted: number;
  replays: number;
}

/** Accepted messages and replay attempts per bucket over a trailing window. */
export function getTrafficSeries(state: LabState, now: number, buckets = 15, bucketMs = 60_000): TrafficPoint[] {
  const end = Math.ceil(now / bucketMs) * bucketMs;
  const first = end - buckets * bucketMs;
  const points: TrafficPoint[] = Array.from({ length: buckets }, (_, i) => {
    const start = first + i * bucketMs;
    const d = new Date(start);
    return { label: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`, start, accepted: 0, replays: 0 };
  });
  const slot = (t: number) => Math.floor((t - first) / bucketMs);
  for (const id of state.messageOrder) {
    const i = slot(state.messages[id].receivedAt);
    if (i >= 0 && i < buckets) points[i].accepted++;
  }
  for (const r of state.replayAttempts) {
    const i = slot(r.attemptedAt);
    if (i >= 0 && i < buckets) points[i].replays++;
  }
  return points;
}

export function getSessionKeys(state: LabState, pairId: string): SessionKey[] {
  const s = state.sessions[pairId];
  return s ? s.keyIds.map((id) => state.keys[id]) : [];
}

export function getBufferView(state: LabState) {
  const ordered = bufferOrdered(state.replay);
  const newest = state.replay.size ? (state.replay.head - 1 + state.replay.capacity) % state.replay.capacity : null;
  const oldest = state.replay.size ? (state.replay.size === state.replay.capacity ? state.replay.head : 0) : null;
  return { ordered, newest, oldest };
}
