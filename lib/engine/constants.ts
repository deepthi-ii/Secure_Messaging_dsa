import type { RotationPolicy, User } from "./types.ts";

export const STATE_VERSION = 1;
export const EVENT_LIMIT = 400;
export const ROTATION_LIMIT = 250;
export const REPLAY_LOG_LIMIT = 250;

/** Classic cryptography personas. All mock identities, no real accounts. */
export const USERS: User[] = [
  { id: "alice", name: "Alice", role: "Research lead", initials: "AL", color: "#4d8dff" },
  { id: "bob", name: "Bob", role: "Operations", initials: "BO", color: "#2ccdb8" },
  { id: "carol", name: "Carol", role: "Security officer", initials: "CA", color: "#9c8cff" },
  { id: "dave", name: "Dave", role: "Field engineer", initials: "DA", color: "#f2b544" },
];

/** The attacker who captures and re-sends envelopes in the replay demos. */
export const ATTACKER = { name: "Mallory", description: "Simulated network attacker" };

export const DEFAULT_POLICY: RotationPolicy = { autoRotate: true, maxMessages: 8, maxAgeSeconds: 300 };
export const DEFAULT_BATCH_SIZE = 4;
export const DEFAULT_REPLAY_CAPACITY = 16;

export const SAMPLE_MESSAGES = [
  "Lab results for sample set B are uploaded.",
  "Can we move the review to 3 pm?",
  "Firewall rule change approved for staging.",
  "Shipping the sensor firmware build tonight.",
  "Please confirm the backup completed.",
  "Meeting notes are in the shared folder.",
  "Rotating the test certificates tomorrow.",
  "Incident drill starts at 10:00.",
  "The demo dataset is anonymised now.",
  "Access request for the build server approved.",
  "Weekly report attached for review.",
  "Patch window confirmed for Friday.",
  "Field unit 7 is back online.",
  "Updated the threat model diagram.",
  "Benchmark run finished, numbers look stable.",
  "Who has the spare hardware token?",
];
