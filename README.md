# SecureMessage Lab

An academic capstone prototype that demonstrates three building blocks of a secure messaging protocol, as an interactive dashboard:

1. **Merkle tree batch integrity.** Every message gets a SHA-256 leaf hash; batches are sealed with a Merkle root; single messages are proven with a sibling-hash path; tampering makes verification fail.
2. **Session key management.** One mock session key per user pair, O(1) lookup, automatic rotation by message count or key age, manual rotation, and a rotation timeline with expired, wiped keys.
3. **Replay attack detection.** Unique message IDs plus per-channel sequence numbers, a fixed-size circular buffer of recent IDs, and a log of every rejected replay.

> **Disclaimer.** This is a learning prototype. All security operations are simulated: keys are mock values, messages are **not encrypted**, and nothing here provides end-to-end encryption. Do not use it for real private communication.

## Quick start

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Other scripts:

```bash
npm test           # engine unit tests (node:test, no extra dependencies)
npm run lint       # TypeScript type-check
```

The first load seeds about 14 minutes of simulated history (36 messages, sealed batches, key rotations and a few replay attempts) by running the real protocol code, so every hash and root you see is genuine. State is saved in the browser's localStorage; **Reset demo** in the top bar generates a fresh simulation.

## Demo script (about 5 minutes)

1. **Dashboard.** Point out the five metrics, the throughput and replay charts and the event feed. Turn on **Simulate live traffic** to make the numbers move, then turn it off.
2. **Messaging demo.** Send a message from Alice to Bob. Walk through the *Latest message pipeline*: key lookup → SHA-256 → replay check → accepted → (batch sealed and verified). Then click **Resend previous message** to trigger *Replay attack detected*. Switch the mode to *forged new ID* to show the sequence check catching it too.
3. **Merkle verification.** Select a sealed batch, click a leaf in the tree, then **Generate and verify proof** and **Cross-check on server** (Node.js crypto agrees with the browser). Turn on **Tamper test**, apply the edit, and show the red path, the highlighted root characters and the failed proof. **Restore original** to recover.
4. **Key management.** Pick the *Demo (fast)* preset and save. Send a few messages and watch keys rotate on the message limit, or wait for the lifetime countdown. Rotate a key manually and show the timeline: old material is *wiped*.
5. **Replay protection.** Use **Burst of 5** and watch the ring flash red at the matched slot. Shrink the window to 4 slots, then try *Evicted from window* to show why the sequence-number check is still needed.
6. **About the project.** Objectives, complexity table and the disclaimer.

## Project structure

```
app/
  page.tsx                 Dashboard
  messaging/ merkle/ keys/ replay/ about/   Pages
  api/hash/route.ts        POST { data } → SHA-256 + leaf hash (Node.js crypto)
  api/merkle/verify/route.ts  POST { leafHash, root, proof } → independent proof check
  api/health/route.ts      GET status
components/
  ui/                      shadcn/ui components (Radix + Tailwind)
  layout/                  Sidebar, mobile sheet navigation, top bar
  shared/                  Metric tiles, event feed, hash text, empty/loading states
  dashboard/ messaging/ merkle/ keys/ replay/   Page-specific components
lib/
  engine/                  Framework-free simulation engine (unit tested)
    types.ts               Shared domain types
    crypto.ts              Web Crypto SHA-256, hex helpers, randomness
    merkle.ts              Tree build, proofs, verification (RFC 6962-style prefixes)
    replay-buffer.ts       Circular buffer + O(1) index
    session-keys.ts        Pair IDs, hash-ratchet key derivation, rotation rules
    engine.ts              Protocol operations: send, replay, seal, verify, tamper, rotate
    seed.ts                Generates realistic starting history
    benchmark.ts           Hash / Merkle benchmark
    selectors.ts           Metrics and chart series
    validation.ts          Input and policy validation
  store/lab-store.tsx      React context store: serial operation queue, persistence, timers
tests/engine.test.ts       Unit tests for the engine
```

## How the protocol works

**Sending a message**

1. Look up the pair's `SessionRecord` in a hash map keyed by pair ID (`alice:bob`).
2. If the active key reached its message limit or lifetime, rotate it first.
3. Build the envelope: unique ID (`msg_…`), next sequence number for the `sender>receiver` channel, mock nonce, key ID.
4. Leaf hash = `SHA-256(0x00 ‖ JSON[id, seq, sender, receiver, timestamp, content])`, timed with `performance.now()`.
5. Receiver replay check: reject if the ID is in the recent-ID window (duplicate) or `seq ≤` the channel's high-water mark (stale or forged).
6. Accept: push the ID into the circular buffer (evicting the oldest when full), advance the high-water mark, add the leaf to the open batch.
7. When the batch reaches the batch size, build the Merkle tree (`node = SHA-256(0x01 ‖ left ‖ right)`, odd nodes promoted), store the root and verify it.

**Key rotation** derives `material[n+1] = SHA-256(material[n] ‖ "ratchet" ‖ n)` and wipes `material[n]`. This illustrates why a stolen current key cannot reveal earlier keys (the forward secrecy intuition). Real messengers use authenticated key exchange such as X3DH and the Double Ratchet instead.

| Operation | Structure | Time | Space |
|---|---|---|---|
| Session-key lookup | Hash map by pair ID | O(1) | one record per pair |
| Replay ID check | Circular buffer + index | O(1) | k IDs |
| Sequence check | High-water mark per channel | O(1) | one number per channel |
| Batch seal | Merkle tree build | O(n) | 2n − 1 hashes |
| Single-message proof | Sibling path | O(log n) | ⌈log₂ n⌉ hashes |

## Out of scope (what production would need)

- Encryption (AEAD) of message bodies and a MAC covering ID, sequence number and headers.
- Real authenticated key exchange and identity verification.
- Server-side persistence, user accounts and access control.
- A security review.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix UI) · Recharts · Web Crypto API · Node.js `crypto` · IBM Plex Sans / Mono (self-hosted via Fontsource, no network fetch at build time).
