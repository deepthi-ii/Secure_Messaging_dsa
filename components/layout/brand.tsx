import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-teal text-primary-foreground">
        <ShieldCheck className="size-[18px]" strokeWidth={2.25} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">SecureMessage Lab</span>
        <span className="block text-xs text-muted-foreground">Protocol simulation</span>
      </span>
    </Link>
  );
}
