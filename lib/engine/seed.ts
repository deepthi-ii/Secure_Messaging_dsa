/**
 * Builds a realistic starting state by running the real protocol over the last
 * ~14 minutes of simulated time: messages, batch seals, key rotations and a few
 * replay attempts. Every hash and root in the seeded state is genuine.
 */
import { SAMPLE_MESSAGES } from "./constants.ts";
import { createInitialState, logSystem, replayCandidates, replayMessage, sendMessage, tick } from "./engine.ts";
import type { LabState, ReplayMode } from "./types.ts";

const PAIRS: [string, string][] = [
  ["alice", "bob"],
  ["bob", "alice"],
  ["carol", "dave"],
  ["alice", "carol"],
  ["dave", "bob"],
  ["carol", "alice"],
];

const REPLAY_PLAN: Record<number, ReplayMode> = { 6: "exact", 13: "exact", 19: "forged-id", 24: "exact", 29: "evicted", 33: "exact" };

export async function seedState(now: number = Date.now()): Promise<LabState> {
  const span = 14 * 60_000;
  const start = now - span;
  const state = createInitialState(start);
  logSystem(state, start, "Simulation started", "Mock users Alice, Bob, Carol and Dave are online. No real keys or data are used.");

  const total = 36;
  for (let i = 0; i < total; i++) {
    // Slightly uneven spacing so the throughput chart has some shape.
    const t = start + Math.round((span * (i + 0.5)) / total + Math.sin(i * 1.7) * 9000);
    await tick(state, t);
    const [senderId, receiverId] = PAIRS[(i * 7 + Math.floor(i / 3)) % PAIRS.length];
    await sendMessage(state, { senderId, receiverId, content: SAMPLE_MESSAGES[i % SAMPLE_MESSAGES.length] }, t);

    const mode = REPLAY_PLAN[i];
    if (mode) {
      const candidates = replayCandidates(state, mode);
      if (candidates.length) {
        const target = candidates[Math.max(0, candidates.length - 1 - (i % 4))];
        await replayMessage(state, target, mode, t + 2500);
      }
    }
  }
  await tick(state, now);
  return state;
}
