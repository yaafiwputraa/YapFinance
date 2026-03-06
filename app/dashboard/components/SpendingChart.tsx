"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  data: { name: string; total: number }[];
}

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
];

export default function SpendingChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-zinc-500 text-sm">Belum ada data pengeluaran.</p>;
  }

  const sorted = [...data].sort((a, b) => b.total - a.total);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={sorted} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}jt`
              : `${(v / 1_000).toFixed(0)}rb`
          }
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 8,
            color: "#f4f4f5",
            fontSize: 12,
          }}
          formatter={(value: number) => [
            `Rp ${value.toLocaleString("id-ID")}`,
            "Total",
          ]}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
