"use client";

import { useState } from "react";
import { formatIDR } from "../../lib/helpers";

export interface LineChartPoint {
  label: string;
  debit: number;
  credit: number;
  /** Extra payload for click handler */
  key?: string;
}

interface TrendLineChartProps {
  data: LineChartPoint[];
  height?: number;
  onPointClick?: (point: LineChartPoint) => void;
}

/**
 * Pure-SVG dual-line chart with dots, area fill, hover tooltip.
 * Inspired by the "Budget vs Actual" reference image.
 */
export function TrendLineChart({
  data,
  height = 220,
  onPointClick,
}: TrendLineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-zinc-600"
        style={{ height }}
      >
        Belum ada data
      </div>
    );
  }

  /* ── Layout constants ── */
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 32;
  const chartW = 100; // percent-based: we use viewBox
  const svgW = 600;
  const drawW = svgW - padL - padR;
  const drawH = height - padT - padB;

  const allValues = data.flatMap((d) => [d.debit, d.credit]);
  const maxVal = Math.max(...allValues, 1) * 1.1;

  /* ── Helpers ── */
  const x = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * drawW;
  const y = (v: number) => padT + drawH - (v / maxVal) * drawH;

  const buildPath = (accessor: (d: LineChartPoint) => number) =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(accessor(d))}`)
      .join(" ");

  const buildArea = (accessor: (d: LineChartPoint) => number) => {
    const baseline = y(0);
    const top = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(accessor(d))}`).join(" ");
    const close = ` L ${x(data.length - 1)} ${baseline} L ${x(0)} ${baseline} Z`;
    return top + close;
  };

  const debitPath = buildPath((d) => d.debit);
  const creditPath = buildPath((d) => d.credit);
  const debitArea = buildArea((d) => d.debit);
  const creditArea = buildArea((d) => d.credit);

  /* ── Y-axis grid lines ── */
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = (maxVal / gridCount) * i;
    return { y: y(val), label: formatIDR(Math.round(val)) };
  });

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="w-full relative select-none">
      <svg
        viewBox={`0 0 ${svgW} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Grid */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={svgW - padR}
              y1={g.y}
              y2={g.y}
              stroke="#27272a"
              strokeWidth={0.5}
              strokeDasharray={i > 0 ? "4 4" : undefined}
            />
          </g>
        ))}

        {/* Area fills */}
        <path d={debitArea} fill="url(#debitGrad)" opacity={0.15} />
        <path d={creditArea} fill="url(#creditGrad)" opacity={0.1} />

        {/* Lines */}
        <path
          d={debitPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={creditPath}
          fill="none"
          stroke="#71717a"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="6 3"
        />

        {/* Dots */}
        {data.map((d, i) => (
          <g key={i}>
            {/* Debit dot */}
            <circle
              cx={x(i)}
              cy={y(d.debit)}
              r={hoveredIdx === i ? 5 : 3}
              fill="#3b82f6"
              stroke="#0E0E12"
              strokeWidth={2}
              className="transition-all duration-150"
            />
            {/* Credit dot */}
            <circle
              cx={x(i)}
              cy={y(d.credit)}
              r={hoveredIdx === i ? 4 : 2.5}
              fill="#71717a"
              stroke="#0E0E12"
              strokeWidth={1.5}
              className="transition-all duration-150"
            />
            {/* Invisible hover target */}
            <rect
              x={x(i) - drawW / data.length / 2}
              y={padT}
              width={drawW / data.length}
              height={drawH}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onClick={() => onPointClick?.(d)}
            />
          </g>
        ))}

        {/* Hover vertical line */}
        {hoveredIdx !== null && (
          <line
            x1={x(hoveredIdx)}
            x2={x(hoveredIdx)}
            y1={padT}
            y2={padT + drawH}
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.4}
          />
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="debitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#71717a" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#71717a" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between px-1 -mt-1">
        {data.map((d, i) => (
          <span
            key={i}
            className={`text-[8px] sm:text-[9px] truncate text-center flex-1 ${
              hoveredIdx === i ? "text-blue-400 font-bold" : "text-zinc-600"
            }`}
          >
            {d.label}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {hovered && hoveredIdx !== null && (
        <div
          className="absolute pointer-events-none z-20 bg-[#18181B] border border-white/10 rounded-xl px-3.5 py-2.5 shadow-2xl"
          style={{
            left: `${(hoveredIdx / Math.max(data.length - 1, 1)) * 100}%`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <p className="text-[10px] font-bold text-white mb-1.5 border-b border-white/5 pb-1">
            {hovered.label}
          </p>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span className="text-[9px] text-zinc-400">Pengeluaran</span>
            <span className="text-[10px] font-bold text-white ml-auto">
              {formatIDR(hovered.debit)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
            <span className="text-[9px] text-zinc-400">Pemasukan</span>
            <span className="text-[10px] font-bold text-white ml-auto">
              {formatIDR(hovered.credit)}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-[2px] bg-blue-500 rounded-full" />
          <span className="text-[9px] text-zinc-400">Pengeluaran</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-[2px] bg-zinc-500 rounded-full border-dashed" />
          <span className="text-[9px] text-zinc-400">Pemasukan</span>
        </div>
      </div>
    </div>
  );
}
