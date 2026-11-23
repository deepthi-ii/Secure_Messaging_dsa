"use client";

import * as React from "react";
import { Gauge, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { runBenchmark } from "@/lib/engine/benchmark";
import type { BenchmarkResult } from "@/lib/engine/types";
import { formatMs, formatNumber } from "@/lib/format";

const SIZES = ["256", "1024", "4096"];

export function BenchmarkCard() {
  const [size, setSize] = React.useState("1024");
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(0);
  const [result, setResult] = React.useState<BenchmarkResult | null>(null);

  const start = async () => {
    setRunning(true);
    setDone(0);
    const r = await runBenchmark(Number(size), setDone);
    setResult(r);
    setRunning(false);
  };

  const rows: [string, string][] = result
    ? [
        ["Average hash time", formatMs(result.avgHashMs, 4)],
        ["Hash throughput", `${formatNumber(Math.round(result.hashesPerSecond))} / s`],
        ["Merkle build", formatMs(result.treeBuildMs, 2)],
        ["Tree depth", `${result.treeDepth} levels`],
        ["Proof size", `${result.proofSteps} hashes`],
        ["Proof check", `${formatMs(result.proofVerifyMs, 3)} · ${result.proofValid ? "valid" : "invalid"}`],
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hashing benchmark</CardTitle>
        <CardDescription>SHA-256 and Merkle timings in this browser, using Web Crypto.</CardDescription>
        <CardAction>
          <Gauge className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Select value={size} onValueChange={setSize} disabled={running}>
            <SelectTrigger className="w-auto min-w-[9.5rem]" aria-label="Number of messages to hash">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatNumber(Number(s))} messages
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={start} disabled={running} className="flex-1">
            <Play />
            {running ? "Running…" : "Run benchmark"}
          </Button>
        </div>
        {running && (
          <div className="space-y-1.5" role="status">
            <Progress value={(done / Number(size)) * 100} />
            <p className="text-xs text-muted-foreground">
              Hashed {formatNumber(done)} of {formatNumber(Number(size))} messages
            </p>
          </div>
        )}
        {result && !running ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-hash mt-0.5 text-[13px]">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          !running && (
            <p className="text-sm text-muted-foreground">
              Hashes synthetic messages, builds one Merkle tree over all of them, then verifies a proof. Results stay on this page.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
