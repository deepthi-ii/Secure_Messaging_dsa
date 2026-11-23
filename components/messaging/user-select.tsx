"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserDot } from "@/components/shared/user-chip";
import type { User } from "@/lib/engine/types";

export function UserSelect({
  id,
  users,
  value,
  onChange,
  disabledId,
  label,
}: {
  id: string;
  users: User[];
  value: string;
  onChange: (v: string) => void;
  disabledId?: string;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label}>
        <SelectValue placeholder="Choose a user" />
      </SelectTrigger>
      <SelectContent>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id} disabled={u.id === disabledId}>
            <UserDot user={u} className="size-5" />
            <span>{u.name}</span>
            <span className="text-xs text-muted-foreground in-data-[slot=select-trigger]:hidden">{u.role}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
