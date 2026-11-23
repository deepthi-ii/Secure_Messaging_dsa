import type { User } from "@/lib/engine/types";
import { cn } from "@/lib/utils";

export function UserDot({ user, className }: { user: User | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-[#050d1c]", className)}
      style={{ backgroundColor: user?.color ?? "#8b9cb9" }}
    >
      {user?.initials.slice(0, 1) ?? "?"}
    </span>
  );
}

export function UserChip({ user, className }: { user: User | undefined; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <UserDot user={user} className="size-5" />
      <span>{user?.name ?? "Unknown"}</span>
    </span>
  );
}

export function Route({ from, to }: { from: User | undefined; to: User | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <UserChip user={from} />
      <span className="text-muted-foreground" aria-label="to">
        →
      </span>
      <UserChip user={to} />
    </span>
  );
}
