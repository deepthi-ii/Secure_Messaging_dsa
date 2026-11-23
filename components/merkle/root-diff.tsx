import { cn } from "@/lib/utils";

/** Full 64-hex root in four groups. Characters that differ from `compare` are marked. */
export function RootHex({ value, compare, className }: { value: string; compare?: string | null; className?: string }) {
  const groups = value.match(/.{1,16}/g) ?? [value];
  return (
    <p className={cn("font-hash flex flex-wrap gap-x-3 gap-y-1 text-[15px] leading-snug break-all sm:text-base", className)}>
      {groups.map((g, gi) => (
        <span key={gi}>
          {g.split("").map((ch, ci) => {
            const idx = gi * 16 + ci;
            const differs = compare && compare[idx] !== ch;
            return (
              <span key={ci} className={differs ? "rounded-[2px] bg-destructive/20 text-destructive" : undefined}>
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </p>
  );
}
