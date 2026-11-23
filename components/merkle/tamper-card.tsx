"use client";

import * as React from "react";
import { FlaskConical, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Batch, LabState } from "@/lib/engine/types";
import { useLab } from "@/lib/store/lab-store";

function suggestEdit(text: string): string {
  if (/\d/.test(text)) return text.replace(/\d/, (d) => String((Number(d) + 7) % 10));
  if (/approved/i.test(text)) return text.replace(/approved/i, "denied");
  return `${text.replace(/[.!?]?$/, ".")} Send a copy to Mallory too.`;
}

export function TamperCard({ state, batch, messageId }: { state: LabState; batch: Batch; messageId: string }) {
  const { tamper, restore } = useLab();
  const [enabled, setEnabled] = React.useState(false);
  const original = state.messages[messageId]?.content ?? "";
  const [draft, setDraft] = React.useState(original);
  const [error, setError] = React.useState<string | null>(null);
  const tamperedCount = Object.keys(batch.tampered).length;

  React.useEffect(() => {
    setDraft(batch.tampered[messageId] ?? suggestEdit(original));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId, batch.id, original, batch.tampered[messageId]]);

  const apply = async () => {
    const r = await tamper(batch.id, messageId, draft);
    if (!r.ok) return setError(r.error);
    setError(null);
    toast.error(`${batch.id} failed verification`, { description: `Changing ${messageId} changed its leaf hash and the root.` });
  };

  const undo = async () => {
    const r = await restore(batch.id);
    if (r.ok) toast.success(`${batch.id} restored`, { description: r.valid ? "Root matches again." : undefined });
  };

  const sealed = batch.status === "sealed";

  return (
    <Card className={enabled ? "border-amber/40" : undefined}>
      <CardHeader>
        <CardTitle>Tamper test</CardTitle>
        <CardDescription>Change a stored message and watch the batch fail verification.</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Switch id="tamper-mode" checked={enabled} onCheckedChange={setEnabled} disabled={!sealed} />
            <Label htmlFor="tamper-mode" className="sr-only">
              Tamper test mode
            </Label>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {!sealed ? (
          <p className="text-sm text-muted-foreground">Tamper tests need a sealed batch with a recorded root.</p>
        ) : !enabled ? (
          <p className="text-sm text-muted-foreground">
            Turn on tamper test mode to edit {messageId} as an attacker with write access to storage would. The original is kept so you can restore it.
          </p>
        ) : (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Original text</p>
              <p className="mt-0.5 text-sm">{original}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tamper-text">Altered text stored in the batch</Label>
              <Textarea id="tamper-text" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} aria-invalid={!!error} />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" onClick={apply}>
                <FlaskConical />
                Apply tampering
              </Button>
              <Button variant="outline" onClick={undo} disabled={tamperedCount === 0}>
                <RotateCcw />
                Restore original
              </Button>
            </div>
          </>
        )}
        {tamperedCount > 0 && (
          <Alert variant="amber">
            <TriangleAlert />
            <AlertTitle>
              {tamperedCount} message{tamperedCount === 1 ? "" : "s"} altered in {batch.id}
            </AlertTitle>
            <AlertDescription>
              <p>Altered leaves and every node above them are shown in red in the tree.</p>
              {!enabled && (
                <Button variant="link" className="h-auto p-0" onClick={undo}>
                  Restore original content
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
