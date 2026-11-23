"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { shortHash } from "@/lib/format";

/** Truncated monospace value with the full value in a tooltip and a copy button. */
export function HashText({
  value,
  chars = 12,
  className,
  copy = true,
}: {
  value: string | null | undefined;
  chars?: number;
  className?: string;
  copy?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  if (!value) return <span className="text-muted-foreground">—</span>;
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="font-hash rounded-sm text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            {shortHash(value, chars)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="font-hash max-w-sm break-all">{value}</TooltipContent>
      </Tooltip>
      {copy && (
        <button
          type="button"
          onClick={onCopy}
          className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={copied ? "Copied" : "Copy full value"}
        >
          {copied ? <Check className="size-3.5 text-teal" /> : <Copy className="size-3.5" />}
        </button>
      )}
    </span>
  );
}
