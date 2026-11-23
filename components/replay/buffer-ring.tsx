"use client";

import * as React from "react";
import type { ReplayBufferState } from "@/lib/engine/types";
import { CHART } from "@/components/shared/chart-colors";

const SIZE = 300;
const C = SIZE / 2;
const R_OUT = 138;
const R_IN = 104;

function arc(start: number, end: number) {
  const p = (r: number, a: number) => [C + r * Math.cos(a), C + r * Math.sin(a)];
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = p(R_OUT, start);
  const [x2, y2] = p(R_OUT, end);
  const [x3, y3] = p(R_IN, end);
  const [x4, y4] = p(R_IN, start);
  return `M ${x1} ${y1} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${R_IN} ${R_IN} 0 ${large} 0 ${x4} ${y4} Z`;
}

/** Circular buffer drawn as a ring of slots. The write head moves clockwise. */
export function BufferRing({
  buffer,
  hitSlot,
  selectedSlot,
  onSelectSlot,
}: {
  buffer: ReplayBufferState;
  hitSlot: number | null;
  selectedSlot: number | null;
  onSelectSlot: (slot: number) => void;
}) {
  const cap = buffer.capacity;
  const step = (Math.PI * 2) / cap;
  const gap = Math.min(0.03, step * 0.12);
  const newest = buffer.size ? (buffer.head - 1 + cap) % cap : null;
  const nextToEvict = buffer.size === cap ? buffer.head : null;

  const headAngle = -Math.PI / 2 + buffer.head * step + step / 2;
  const hx = C + (R_OUT + 10) * Math.cos(headAngle);
  const hy = C + (R_OUT + 10) * Math.sin(headAngle);

  return (
    <svg viewBox={`-6 -6 ${SIZE + 12} ${SIZE + 12}`} className="mx-auto block w-full max-w-[320px]" role="group" aria-label={`Replay window: ${buffer.size} of ${cap} slots used`}>
      {Array.from({ length: cap }, (_, i) => {
        const id = buffer.slots[i];
        const start = -Math.PI / 2 + i * step + gap;
        const end = -Math.PI / 2 + (i + 1) * step - gap;
        let fill = "#15233b";
        let stroke = "#1f3150";
        if (id) {
          fill = "rgb(77 141 255 / 0.28)";
          stroke = "rgb(77 141 255 / 0.5)";
        }
        if (i === newest) {
          fill = "rgb(44 205 184 / 0.45)";
          stroke = CHART.teal;
        }
        if (i === nextToEvict) stroke = CHART.amber;
        if (i === hitSlot) {
          fill = "rgb(242 85 122 / 0.5)";
          stroke = CHART.rose;
        }
        const selected = i === selectedSlot;
        return (
          <path
            key={i}
            d={arc(start, end)}
            fill={fill}
            stroke={selected ? "#e4ecf7" : stroke}
            strokeWidth={selected ? 2 : 1}
            role="button"
            tabIndex={0}
            aria-label={`Slot ${i}: ${id ?? "empty"}${i === newest ? ", newest" : ""}${i === nextToEvict ? ", overwritten next" : ""}`}
            aria-pressed={selected}
            className="cursor-pointer outline-none focus-visible:stroke-[#9cc0ff]"
            onClick={() => onSelectSlot(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectSlot(i);
              }
            }}
          >
            <title>{`Slot ${i}: ${id ?? "empty"}`}</title>
          </path>
        );
      })}
      <circle cx={hx} cy={hy} r={4} fill={CHART.amber} />
      <text x={C} y={C - 10} textAnchor="middle" fontSize={34} fontWeight={600} fill="#e4ecf7" fontFamily="var(--font-sans)">
        {buffer.size}/{cap}
      </text>
      <text x={C} y={C + 14} textAnchor="middle" fontSize={12} fill={CHART.axis} fontFamily="var(--font-sans)">
        IDs in window
      </text>
      <text x={C} y={C + 32} textAnchor="middle" fontSize={11} fill={CHART.axis} fontFamily="var(--font-mono)">
        head → slot {buffer.head}
      </text>
    </svg>
  );
}
