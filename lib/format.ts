export function shortHash(hash: string | null | undefined, chars = 10): string {
  if (!hash) return "—";
  return hash.length <= chars ? hash : `${hash.slice(0, chars)}…`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function formatMs(ms: number | null | undefined, digits = 3): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "—";
  if (ms === 0) return "≈0 ms"; // below the browser timer resolution
  if (ms < 0.001) return "<0.001 ms";
  return `${ms.toFixed(digits)} ms`;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "due now";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m > 0 ? `${m}m ${String(rest).padStart(2, "0")}s` : `${rest}s`;
}

export function formatRelative(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}
