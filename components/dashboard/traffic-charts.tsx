"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrafficPoint } from "@/lib/engine/selectors";
import { CHART } from "@/components/shared/chart-colors";

const axisProps = {
  tick: { fill: CHART.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number; color?: string }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">
        {payload[0].value} {unit}
      </p>
    </div>
  );
}

export function ThroughputChart({ data }: { data: TrafficPoint[] }) {
  return (
    <div className="h-48 w-full" role="img" aria-label="Accepted messages per minute over the last 15 minutes">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="throughputFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...axisProps} allowDecimals={false} width={48} />
          <Tooltip content={<ChartTooltip unit="messages" />} cursor={{ stroke: CHART.grid }} />
          <Area type="monotone" dataKey="accepted" stroke={CHART.blue} strokeWidth={2} fill="url(#throughputFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReplayChart({ data }: { data: TrafficPoint[] }) {
  return (
    <div className="h-48 w-full" role="img" aria-label="Replay attempts detected per minute over the last 15 minutes">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
          <YAxis {...axisProps} allowDecimals={false} width={48} />
          <Tooltip content={<ChartTooltip unit="replay attempts" />} cursor={{ fill: "rgb(242 85 122 / 0.08)" }} />
          <Bar dataKey="replays" fill={CHART.rose} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
