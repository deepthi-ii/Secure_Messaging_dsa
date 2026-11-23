import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  blue: "text-primary bg-primary/12",
  teal: "text-teal bg-teal/12",
  rose: "text-destructive bg-destructive/12",
  amber: "text-amber bg-amber/12",
  violet: "text-violet bg-violet/12",
} as const;

export function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="panel-glow rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", TONES[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-[28px] leading-none font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
