"use client";

import { Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BatchStatusBadge } from "@/components/shared/status-badges";
import { LIMITS } from "@/lib/engine/validation";
import { shortHash, formatTime } from "@/lib/format";
import { useLab } from "@/lib/store/lab-store";
import { cn } from "@/lib/utils";

const SIZE_OPTIONS = Array.from({ length: LIMITS.batchSize.max - LIMITS.batchSize.min + 1 }, (_, i) => i + LIMITS.batchSize.min);

export function BatchList({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const { state, updateBatchSize, sealOpenBatch } = useLab();
  if (!state) return null;
  const batches = state.batchOrder.slice().reverse().map((id) => state.batches[id]);
  const open = state.batches[state.openBatchId];

  const seal = async () => {
    const r = await sealOpenBatch();
    if (!r.ok) return toast.error("Batch not sealed", { description: r.error });
    toast.success(`${r.batchId} sealed`, { description: "Merkle root computed and verified." });
    onSelect(r.batchId);
  };

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Batches</CardTitle>
        <CardDescription>A batch seals when it reaches the batch size.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="batch-size" className="text-xs text-muted-foreground">
              Batch size
            </Label>
            <Select value={String(state.batchSize)} onValueChange={(v) => updateBatchSize(Number(v))}>
              <SelectTrigger id="batch-size" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} messages
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="secondary" onClick={seal} disabled={open.messageIds.length === 0}>
            <Layers />
            Seal now
          </Button>
        </div>
        <ul className="scrollbar-thin -mx-1 flex max-h-[min(560px,60vh)] flex-col gap-1 overflow-y-auto px-1" aria-label="Batches">
          {batches.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                aria-current={b.id === selectedId}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  b.id === selectedId ? "border-primary/50 bg-primary/10" : "border-transparent hover:bg-accent/60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-hash text-sm">{b.id}</span>
                  <BatchStatusBadge batch={b} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {b.messageIds.length} msg{b.messageIds.length === 1 ? "" : "s"} · {formatTime(b.sealedAt ?? b.createdAt)}
                  </span>
                  <span className="font-hash">{b.root ? shortHash(b.root, 8) : "no root yet"}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
