import type { Metadata } from "next";
import Link from "next/link";
import { Gauge, KeyRound, Network, ShieldAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "About the project" };

const OBJECTIVES: { icon: LucideIcon; title: string; href: string; tone: string; body: string; detail: string }[] = [
  {
    icon: Network,
    title: "Batch integrity through SHA-256 Merkle trees",
    href: "/merkle",
    tone: "text-primary bg-primary/12",
    body: "Messages are grouped into batches. Each message becomes a leaf hash, pairs of hashes are combined up to a single root, and that root is recorded when the batch seals.",
    detail:
      "Changing any stored message changes its leaf, every node above it and the root, so batch verification fails. A single message can be proven with only log₂(n) sibling hashes. Leaves and nodes use different prefixes (0x00 and 0x01) so a node cannot be passed off as a message.",
  },
  {
    icon: KeyRound,
    title: "Fast session-key lookup and rotation",
    href: "/keys",
    tone: "text-violet bg-violet/12",
    body: "Each user pair has one session record in a hash map keyed by the pair, so finding the active key takes constant time no matter how many sessions exist.",
    detail:
      "Keys rotate after a configurable number of messages or seconds, or by hand. Each new key is derived from the previous one with a one-way hash, and the old key is marked expired and wiped. This models the idea behind forward secrecy without implementing real key exchange.",
  },
  {
    icon: ShieldAlert,
    title: "Replay detection using a recent message-ID buffer",
    href: "/replay",
    tone: "text-destructive bg-destructive/12",
    body: "Every message carries a unique ID and a per-channel sequence number. The receiver keeps the latest IDs in a fixed-size circular buffer with an index for constant-time lookups.",
    detail:
      "A duplicate ID in the window is rejected immediately. IDs that have aged out of the window, or forged new IDs on an old message, are caught because their sequence number is not above the highest one already accepted on that channel.",
  },
  {
    icon: Gauge,
    title: "Benchmarking hash time, throughput, rotations and replays",
    href: "/",
    tone: "text-amber bg-amber/12",
    body: "The dashboard records the SHA-256 time of every message, charts accepted messages and replay attempts per minute, and counts key rotations.",
    detail:
      "A separate benchmark hashes up to 4,096 synthetic messages in the browser, builds one tree over them and verifies a proof, reporting average hash time, hashes per second and tree build time.",
  },
];

const PIPELINE = [
  ["Session-key lookup", "Find the pair's session record by its pair ID and read the active key."],
  ["Rotation check", "If the key has reached its message limit or lifetime, derive the next key and expire the old one."],
  ["Envelope", "Assign a unique message ID, the next sequence number for this sender → receiver channel and a mock nonce."],
  ["Hashing", "Compute SHA-256(0x00 ‖ canonical message) with the Web Crypto API and record how long it took."],
  ["Replay check", "Reject if the ID is in the recent-ID window or the sequence number is not above the channel's high-water mark."],
  ["Acceptance", "Store the ID in the window, advance the high-water mark and add the leaf hash to the open batch."],
  ["Seal and verify", "When the batch is full, build the Merkle tree, record the root and immediately verify it."],
];

const COMPLEXITY = [
  ["Session-key lookup", "Hash map keyed by pair ID", "O(1)", "One record per pair"],
  ["Replay ID check", "Circular buffer + index map", "O(1)", "Fixed: window size k"],
  ["Sequence check", "High-water mark per channel", "O(1)", "One number per channel"],
  ["Batch seal", "Merkle tree build", "O(n)", "2n − 1 hashes"],
  ["Single-message proof", "Sibling path to the root", "O(log n)", "⌈log₂ n⌉ hashes"],
];

const NOT_INCLUDED = [
  "No encryption. Message text is stored and shown in plain form; nothing is confidential.",
  "No real key exchange. Production messengers use authenticated protocols such as X3DH and the Double Ratchet.",
  "No message authentication. A real protocol would protect the ID, sequence number and body with an AEAD cipher or MAC under the session key, so an attacker could not forge a higher sequence number.",
  "No accounts or passwords. Alice, Bob, Carol, Dave and Mallory are fixed mock personas.",
  "State lives in your browser's local storage and can be wiped with Reset demo.",
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About the project"
        description="SecureMessage Lab is an academic capstone prototype that makes three building blocks of secure messaging visible and testable: batch integrity, session-key lifecycle and replay protection."
      />

      <Alert variant="destructive" className="mb-6">
        <TriangleAlert />
        <AlertTitle>Learning prototype. Do not use it for real private communication.</AlertTitle>
        <AlertDescription>
          <p>
            Every security operation here is a simulation. Keys are mock values, messages are not encrypted, and the protocol has not been reviewed or audited. It
            does not provide end-to-end encryption and must not be used to send anything sensitive.
          </p>
        </AlertDescription>
      </Alert>

      <section aria-labelledby="objectives" className="space-y-3">
        <h2 id="objectives" className="text-lg font-semibold">
          Project objectives
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {OBJECTIVES.map((o) => (
            <Card key={o.title}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${o.tone}`}>
                    <o.icon className="size-[18px]" />
                  </span>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{o.title}</CardTitle>
                    <CardDescription className="leading-relaxed">{o.body}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed text-secondary-foreground">{o.detail}</p>
                <Button asChild variant="link" className="h-auto p-0">
                  <Link href={o.href}>Try it in the lab</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>How one message moves through the protocol</CardTitle>
            <CardDescription>The same steps appear in the Messaging demo&apos;s pipeline view.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {PIPELINE.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="font-hash grid size-6 shrink-0 place-items-center rounded-full bg-primary/12 text-xs text-primary">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Data structures and cost</CardTitle>
              <CardDescription>n = messages in a batch, k = replay window size</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Structure</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Space</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPLEXITY.map(([op, ds, t, s]) => (
                    <TableRow key={op}>
                      <TableCell className="font-medium">{op}</TableCell>
                      <TableCell className="text-muted-foreground">{ds}</TableCell>
                      <TableCell className="font-hash">{t}</TableCell>
                      <TableCell className="text-muted-foreground">{s}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What a production system would add</CardTitle>
              <CardDescription>Deliberately out of scope for this prototype</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-secondary-foreground marker:text-muted-foreground">
                {NOT_INCLUDED.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Implementation</CardTitle>
          <CardDescription>Built with Next.js, TypeScript, Tailwind CSS, shadcn/ui and Recharts</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 text-sm leading-relaxed md:grid-cols-3">
          <div>
            <p className="font-medium">Simulation engine</p>
            <p className="mt-1 text-muted-foreground">
              Pure TypeScript modules in <code className="font-hash text-secondary-foreground">lib/engine</code> for hashing, Merkle trees, the replay buffer and the
              key lifecycle, covered by unit tests.
            </p>
          </div>
          <div>
            <p className="font-medium">Hashing</p>
            <p className="mt-1 text-muted-foreground">
              SHA-256 via the browser&apos;s Web Crypto API. The server cross-checks proofs independently with Node.js <code className="font-hash">crypto</code>.
            </p>
          </div>
          <div>
            <p className="font-medium">API layer</p>
            <p className="mt-1 text-muted-foreground">
              <code className="font-hash text-secondary-foreground">POST /api/hash</code>, <code className="font-hash text-secondary-foreground">POST /api/merkle/verify</code> and{" "}
              <code className="font-hash text-secondary-foreground">GET /api/health</code>.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
