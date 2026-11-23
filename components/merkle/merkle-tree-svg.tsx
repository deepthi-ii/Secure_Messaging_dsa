"use client";

import type { MerkleTree } from "@/lib/engine/types";
import { CHART } from "@/components/shared/chart-colors";

const CELL_W = 96;
const NODE_W = 84;
const NODE_H = 40;
const LEVEL_GAP = 78;
const PAD = 14;

interface Props {
  current: MerkleTree;
  sealed: MerkleTree | null;
  path: number[] | null;
  siblings: (number | null)[] | null;
  selectedIndex: number | null;
  onSelectLeaf: (index: number) => void;
  leafLabels: string[];
}

/** Interactive Merkle tree: root at the top, leaves (messages) at the bottom. */
export function MerkleTreeSvg({ current, sealed, path, siblings, selectedIndex, onSelectLeaf, leafLabels }: Props) {
  const levels = current.levels;
  const L = levels.length;
  const leafCount = levels[0].length;
  const width = Math.max(leafCount, 2) * CELL_W + PAD * 2;
  const height = (L - 1) * LEVEL_GAP + NODE_H + PAD * 2;

  // x positions bottom-up; promoted nodes keep their child's position.
  const xs: number[][] = [levels[0].map((_, i) => PAD + (i + 0.5) * CELL_W + (leafCount === 1 ? CELL_W / 2 : 0))];
  for (let l = 1; l < L; l++) {
    xs.push(levels[l].map((_, j) => (2 * j + 1 < levels[l - 1].length ? (xs[l - 1][2 * j] + xs[l - 1][2 * j + 1]) / 2 : xs[l - 1][2 * j])));
  }
  const y = (l: number) => PAD + (L - 1 - l) * LEVEL_GAP;

  const mismatch = (l: number, j: number) => !!sealed && sealed.levels[l]?.[j] !== undefined && sealed.levels[l][j] !== levels[l][j];
  const onPath = (l: number, j: number) => !!path && path[l] === j;
  const isSibling = (l: number, j: number) => !!siblings && siblings[l] === j;

  const edges: React.ReactNode[] = [];
  for (let l = 1; l < L; l++) {
    levels[l].forEach((_, j) => {
      [2 * j, 2 * j + 1].forEach((c) => {
        if (c >= levels[l - 1].length) return;
        const bad = mismatch(l - 1, c);
        const hot = onPath(l - 1, c) && onPath(l, j);
        const stroke = bad ? CHART.rose : hot ? CHART.blue : CHART.grid;
        edges.push(
          <path
            key={`e-${l}-${j}-${c}`}
            d={`M ${xs[l][j]} ${y(l) + NODE_H} C ${xs[l][j]} ${y(l) + NODE_H + 26}, ${xs[l - 1][c]} ${y(l - 1) - 26}, ${xs[l - 1][c]} ${y(l - 1)}`}
            fill="none"
            stroke={stroke}
            strokeWidth={hot || bad ? 2 : 1.25}
          />,
        );
      });
    });
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="mx-auto block"
      role="group"
      aria-label={`Merkle tree with ${leafCount} leaves and ${L} levels`}
    >
      {edges}
      {levels.map((nodes, l) =>
        nodes.map((h, j) => {
          const isRoot = l === L - 1;
          const isLeaf = l === 0;
          const bad = mismatch(l, j);
          const pathNode = onPath(l, j);
          const sib = isSibling(l, j);
          const selected = isLeaf && selectedIndex === j;
          const stroke = bad ? CHART.rose : pathNode ? CHART.blue : sib ? CHART.teal : isRoot ? "#35507d" : "#2a4068";
          const fill = bad ? "rgb(242 85 122 / 0.12)" : pathNode ? "rgb(77 141 255 / 0.14)" : sib ? "rgb(44 205 184 / 0.10)" : "#122038";
          const label = isRoot ? "Root" : isLeaf ? leafLabels[j] ?? `Leaf ${j}` : `Node ${l}.${j}`;
          const x = xs[l][j] - NODE_W / 2;
          return (
            <g
              key={`n-${l}-${j}`}
              transform={`translate(${x} ${y(l)})`}
              {...(isLeaf
                ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-label": `Select ${label}, hash ${h.slice(0, 8)}${bad ? ", altered" : ""}`,
                    "aria-pressed": selected,
                    onClick: () => onSelectLeaf(j),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectLeaf(j);
                      }
                    },
                    className: "cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#9cc0ff]",
                  }
                : {})}
            >
              <title>{`${label}\n${h}`}</title>
              <rect width={NODE_W} height={NODE_H} rx={isLeaf ? 8 : 10} fill={fill} stroke={stroke} strokeWidth={selected || pathNode || bad ? 2 : 1.25} strokeDasharray={sib && !pathNode ? "4 3" : undefined} />
              <text x={NODE_W / 2} y={15} textAnchor="middle" fontSize={10} fill={bad ? CHART.rose : CHART.axis} fontFamily="var(--font-sans)">
                {label}
              </text>
              <text x={NODE_W / 2} y={30} textAnchor="middle" fontSize={11} fill="#e4ecf7" fontFamily="var(--font-mono)">
                {h.slice(0, 8)}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}
