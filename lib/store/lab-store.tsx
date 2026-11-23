"use client";

/**
 * Client-side store for the simulation. State lives in memory, is persisted to
 * localStorage, and every operation runs through a serial queue so async
 * hashing steps never interleave.
 */
import * as React from "react";
import { SAMPLE_MESSAGES } from "@/lib/engine/constants";
import {
  checkMessageProof,
  isLabState,
  logProofResult,
  logSystem,
  needsTick,
  replayCandidates,
  replayMessage,
  restoreBatch,
  rotateKey,
  sealBatch,
  sendMessage,
  setBatchSize,
  setPolicy,
  setReplayCapacity,
  tamperMessage,
  tick,
  verifyBatch,
  type ProofCheck,
  type SendOutcome,
} from "@/lib/engine/engine";
import { seedState } from "@/lib/engine/seed";
import type { LabState, ReplayAttempt, ReplayMode, Result, RotationPolicy, SendMessageInput } from "@/lib/engine/types";

const STORAGE_KEY = "securemessage-lab:state:v1";

interface LabContextValue {
  state: LabState | null;
  ready: boolean;
  traffic: boolean;
  setTraffic: (on: boolean) => void;
  send: (input: SendMessageInput) => Promise<Result<{ outcome: SendOutcome }>>;
  replay: (messageId: string, mode: ReplayMode) => Promise<Result<{ attempt: ReplayAttempt; traceId: string }>>;
  replayRandom: (mode: ReplayMode, count?: number) => Promise<Result<{ attempts: ReplayAttempt[] }>>;
  rotate: (pairId: string) => Promise<Result<object>>;
  updatePolicy: (policy: RotationPolicy) => Promise<Result<object>>;
  updateBatchSize: (size: number) => Promise<void>;
  sealOpenBatch: () => Promise<Result<{ batchId: string }>>;
  verify: (batchId: string) => Promise<Result<{ valid: boolean }>>;
  checkProof: (batchId: string, messageId: string) => Promise<Result<{ check: ProofCheck }>>;
  tamper: (batchId: string, messageId: string, content: string) => Promise<Result<{ valid: boolean }>>;
  restore: (batchId: string) => Promise<Result<{ valid: boolean }>>;
  updateReplayCapacity: (capacity: number) => Promise<void>;
  reset: () => Promise<void>;
}

const LabContext = React.createContext<LabContextValue | null>(null);

function loadStored(): LabState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLabState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function LabProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LabState | null>(null);
  const [traffic, setTraffic] = React.useState(false);
  const stateRef = React.useRef<LabState | null>(null);
  const queueRef = React.useRef<Promise<unknown>>(Promise.resolve());

  const commit = React.useCallback((next: LabState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /** Runs an operation on a cloned draft, then commits it. Operations are serialized. */
  const run = React.useCallback(
    <T,>(op: (draft: LabState, now: number) => Promise<T> | T): Promise<T> => {
      const task = queueRef.current.then(async () => {
        const base = stateRef.current;
        if (!base) throw new Error("The simulation is still loading.");
        const draft = structuredClone(base);
        const result = await op(draft, Date.now());
        commit(draft);
        return result;
      });
      queueRef.current = task.catch(() => undefined);
      return task;
    },
    [commit],
  );

  // Initial load: restore from localStorage or seed a fresh simulation.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = loadStored();
      const initial = stored ?? (await seedState(Date.now()));
      if (cancelled) return;
      if (stored) logSystem(initial, Date.now(), "Simulation restored from this browser");
      await tick(initial, Date.now());
      commit(initial);
    })();
    return () => {
      cancelled = true;
    };
  }, [commit]);

  // Persist (debounced).
  React.useEffect(() => {
    if (!state) return;
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* storage full or unavailable: the demo keeps working in memory */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [state]);

  // Time-based key rotation.
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const s = stateRef.current;
      if (s && needsTick(s, Date.now())) void run((d, now) => tick(d, now));
    }, 1000);
    return () => window.clearInterval(id);
  }, [run]);

  // Optional background traffic generator for live demos.
  React.useEffect(() => {
    if (!traffic) return;
    const id = window.setInterval(() => {
      void run(async (d, now) => {
        if (Math.random() < 0.16 && d.messageOrder.length > 0) {
          const mode: ReplayMode = Math.random() < 0.6 ? "exact" : "forged-id";
          const candidates = replayCandidates(d, mode);
          if (candidates.length) await replayMessage(d, pick(candidates.slice(-12)), mode, now);
          return;
        }
        const sender = pick(d.users);
        const receiver = pick(d.users.filter((u) => u.id !== sender.id));
        await sendMessage(d, { senderId: sender.id, receiverId: receiver.id, content: pick(SAMPLE_MESSAGES) }, now);
      });
    }, 2200);
    return () => window.clearInterval(id);
  }, [traffic, run]);

  const value = React.useMemo<LabContextValue>(
    () => ({
      state,
      ready: state !== null,
      traffic,
      setTraffic,
      send: (input) => run((d, now) => sendMessage(d, input, now)),
      replay: (messageId, mode) => run((d, now) => replayMessage(d, messageId, mode, now)),
      replayRandom: (mode, count = 1) =>
        run(async (d, now) => {
          const candidates = replayCandidates(d, mode);
          if (!candidates.length) {
            return {
              ok: false as const,
              error:
                mode === "evicted"
                  ? `No message has left the ${d.replay.capacity}-slot window yet. Send more messages or shrink the window.`
                  : "There are no accepted messages to replay yet.",
            };
          }
          const attempts: ReplayAttempt[] = [];
          for (let i = 0; i < count; i++) {
            const r = await replayMessage(d, pick(candidates), mode, now + i);
            if (r.ok) attempts.push(r.attempt);
          }
          return { ok: true as const, attempts };
        }),
      rotate: (pairId) =>
        run(async (d, now) => {
          const r = await rotateKey(d, pairId, "manual", now);
          return r.ok ? { ok: true as const } : r;
        }),
      updatePolicy: (policy) => run((d, now) => setPolicy(d, policy, now)),
      updateBatchSize: (size) => run((d, now) => setBatchSize(d, size, now)),
      sealOpenBatch: () => run((d, now) => sealBatch(d, now)),
      verify: (batchId) => run((d, now) => verifyBatch(d, batchId, now)),
      checkProof: (batchId, messageId) =>
        run(async (d, now) => {
          const r = await checkMessageProof(d, batchId, messageId);
          if (r.ok) logProofResult(d, r.check, now);
          return r;
        }),
      tamper: (batchId, messageId, content) => run((d, now) => tamperMessage(d, batchId, messageId, content, now)),
      restore: (batchId) => run((d, now) => restoreBatch(d, batchId, now)),
      updateReplayCapacity: (capacity) => run((d, now) => setReplayCapacity(d, capacity, now)),
      reset: async () => {
        setTraffic(false);
        const fresh = await seedState(Date.now());
        await (queueRef.current = queueRef.current.then(() => commit(fresh)));
      },
    }),
    [state, traffic, run, commit],
  );

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab(): LabContextValue {
  const ctx = React.useContext(LabContext);
  if (!ctx) throw new Error("useLab must be used inside <LabProvider>");
  return ctx;
}

/** Re-renders on an interval so countdowns and relative times stay current. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
