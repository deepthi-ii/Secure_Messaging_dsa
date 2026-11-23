"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { RotationPolicy } from "@/lib/engine/types";
import { LIMITS, validatePolicy } from "@/lib/engine/validation";
import { useLab } from "@/lib/store/lab-store";

const PRESETS: { label: string; policy: Omit<RotationPolicy, "autoRotate"> }[] = [
  { label: "Demo (fast)", policy: { maxMessages: 3, maxAgeSeconds: 45 } },
  { label: "Balanced", policy: { maxMessages: 8, maxAgeSeconds: 300 } },
  { label: "Relaxed", policy: { maxMessages: 50, maxAgeSeconds: 1800 } },
];

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-1.5">
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={Number.isNaN(value) ? "" : value}
            onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
            className="font-hash h-8 w-20 text-right"
          />
          <span className="w-14 text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <Slider value={[Number.isNaN(value) ? min : value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} aria-label={label} />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function PolicyCard() {
  const { state, updatePolicy } = useLab();
  const [draft, setDraft] = React.useState<RotationPolicy | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  if (!state) return null;
  const policy = draft ?? state.policy;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(state.policy);

  const set = (patch: Partial<RotationPolicy>) => {
    setDraft({ ...policy, ...patch });
    setError(null);
  };

  const save = async () => {
    const problem = validatePolicy(policy);
    if (problem) return setError(problem);
    const r = await updatePolicy(policy);
    if (!r.ok) return setError(r.error);
    setDraft(null);
    toast.success("Rotation policy saved", {
      description: policy.autoRotate ? `Keys rotate every ${policy.maxMessages} messages or ${policy.maxAgeSeconds} seconds.` : "Automatic rotation is off.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automatic rotation</CardTitle>
        <CardDescription>A key rotates when either limit is reached, whichever comes first.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
          <div>
            <Label htmlFor="auto-rotate">Rotate keys automatically</Label>
            <p className="mt-1 text-xs text-muted-foreground">When off, keys only change when you rotate them by hand.</p>
          </div>
          <Switch id="auto-rotate" checked={policy.autoRotate} onCheckedChange={(v) => set({ autoRotate: v })} />
        </div>
        <fieldset disabled={!policy.autoRotate} className="space-y-5 disabled:opacity-50">
          <NumberField
            id="max-messages"
            label="Message limit"
            hint="Messages one key may protect before it is replaced."
            value={policy.maxMessages}
            onChange={(n) => set({ maxMessages: n })}
            min={LIMITS.maxMessages.min}
            max={LIMITS.maxMessages.max}
            unit="messages"
          />
          <NumberField
            id="max-age"
            label="Key lifetime"
            hint="Seconds a key stays active, even if it is idle."
            value={policy.maxAgeSeconds}
            onChange={(n) => set({ maxAgeSeconds: n })}
            min={LIMITS.maxAgeSeconds.min}
            max={LIMITS.maxAgeSeconds.max}
            step={5}
            unit="seconds"
          />
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button key={p.label} type="button" variant="secondary" size="sm" onClick={() => set(p.policy)}>
                {p.label}
              </Button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={save} disabled={!dirty} className="flex-1">
            <Save />
            Save policy
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Discard
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
