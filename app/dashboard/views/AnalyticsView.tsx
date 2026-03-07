"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { formatIDR, COLORS } from "../lib/helpers";
import type {
  Transaction, ViewType, SourceStat, MonthlyTrendItem,
  YearlyTrendItem, WeeklyTrendItem, MerchantStat, DayOfWeekStat,
} from "../lib/types";
import { TrendLineChart } from "../components/charts/TrendLineChart";
import type { LineChartPoint } from "../components/charts/TrendLineChart";

type ChartTab = "monthly" | "weekly" | "yearly";

interface AnalyticsViewProps {
  monthTrx: Transaction[];
  monthDebit: number;
  monthCredit: number;
  avgDailySpend: number;
  monthlyTrend: MonthlyTrendItem[];
  yearlyTrend: YearlyTrendItem[];
  weeklyTrend: WeeklyTrendItem[];
  dayOfWeekStats: DayOfWeekStat[];
  sourceStats: SourceStat[];
  topMerchants: MerchantStat[];
  selectedMonth: string;
  setSelectedMonth: (ym: string) => void;
  setSelectedDay: (day: number | null) => void;
  setActiveView: (v: ViewType) => void;
}

export function AnalyticsView({
  monthTrx, monthDebit, monthCredit, avgDailySpend,
  monthlyTrend, yearlyTrend, weeklyTrend,
  dayOfWeekStats, sourceStats, topMerchants,
  selectedMonth, setSelectedMonth, setSelectedDay, setActiveView,
}: AnalyticsViewProps) {
  const [chartTab, setChartTab] = useState<ChartTab>("monthly");

  const net = monthCredit - monthDebit;
  const maxDow = Math.max(...dayOfWeekStats.map((d) => d.total), 1);
  const maxMerchant = topMerchants[0]?.amount ?? 1;

  /* ── Yearly summary ── */
  const currentYear = yearlyTrend[yearlyTrend.length - 1];
  const prevYear = yearlyTrend.length >= 2 ? yearlyTrend[yearlyTrend.length - 2] : null;
  const yoyChange =
    prevYear && prevYear.debit > 0
      ? Math.round(((currentYear.debit - prevYear.debit) / prevYear.debit) * 100)
      : null;

  /* ── Convert data → LineChartPoint[] ── */
  const monthlyPoints: LineChartPoint[] = monthlyTrend.map((d) => ({
    label: d.label.split(" ")[0].substring(0, 3),
    debit: d.debit,
    credit: d.credit,
    key: d.ym,
  }));

  const weeklyPoints: LineChartPoint[] = weeklyTrend.map((d) => ({
    label: `W${d.week}`,
    debit: d.debit,
    credit: d.credit,
  }));

  const yearlyPoints: LineChartPoint[] = yearlyTrend.map((d) => ({
    label: d.label,
    debit: d.debit,
    credit: d.credit,
    key: d.label,
  }));

  function handlePointClick(point: LineChartPoint) {
    if (chartTab === "monthly" && point.key) {
      setSelectedMonth(point.key);
      setSelectedDay(null);
      setActiveView("overview");
    }
  }

  const TABS: { key: ChartTab; label: string }[] = [
    { key: "monthly", label: "12 Bulan" },
    { key: "weekly", label: "Mingguan" },
    { key: "yearly", label: "Tahunan" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#18181B] border border-white/5 rounded-3xl p-4 sm:p-5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
            Avg / Hari
          </p>
          <p className="text-lg sm:text-xl font-bold text-white break-all">
            Rp {formatIDR(avgDailySpend)}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">bulan ini</p>
        </div>

        <div className="bg-[#18181B] border border-white/5 rounded-3xl p-4 sm:p-5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
            Net Balance
          </p>
          <p className={`text-lg sm:text-xl font-bold break-all ${net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {net >= 0 ? "+" : "−"} {formatIDR(Math.abs(net))}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            {net >= 0 ? "surplus" : "defisit"}
          </p>
        </div>

        <div className="bg-[#18181B] border border-white/5 rounded-3xl p-4 sm:p-5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
            Tahun Ini
          </p>
          <p className="text-lg sm:text-xl font-bold text-white break-all">
            {formatIDR(currentYear?.debit ?? 0)}
          </p>
          {yoyChange !== null && (
            <p className={`text-[10px] mt-1 font-bold ${yoyChange > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {yoyChange > 0 ? "↑" : "↓"} {Math.abs(yoyChange)}% vs tahun lalu
            </p>
          )}
        </div>

        <div className="bg-[#18181B] border border-white/5 rounded-3xl p-4 sm:p-5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
            Total Transaksi
          </p>
          <p className="text-lg sm:text-xl font-bold text-white">{monthTrx.length}</p>
          <p className="text-[10px] text-zinc-600 mt-1">bulan ini</p>
        </div>
      </div>

      {/* ── Trend line chart with tabs ── */}
      <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-bold text-white">Pengeluaran vs Pemasukan</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {chartTab === "monthly" && "Klik titik untuk langsung pindah ke bulan tersebut"}
              {chartTab === "weekly" && "Tren per minggu — bulan yang dipilih"}
              {chartTab === "yearly" && "Perbandingan 5 tahun terakhir"}
            </p>
          </div>
          <div className="flex bg-[#0E0E12] rounded-xl p-0.5 gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setChartTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  chartTab === tab.key
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {chartTab === "monthly" && (
            <TrendLineChart data={monthlyPoints} height={220} onPointClick={handlePointClick} />
          )}
          {chartTab === "weekly" && (
            <TrendLineChart data={weeklyPoints} height={200} />
          )}
          {chartTab === "yearly" && (
            <TrendLineChart data={yearlyPoints} height={200} />
          )}
        </div>
      </div>

      {/* ── Day of week + Source breakdown ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Day of week */}
        <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5">
          <h3 className="text-sm font-bold text-white mb-1">Pengeluaran per Hari dalam Seminggu</h3>
          <p className="text-[10px] text-zinc-500 mb-4">
            Total pengeluaran berdasarkan hari, bulan ini
          </p>
          <div className="space-y-2.5">
            {dayOfWeekStats.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-zinc-500 w-6 shrink-0">{d.label}</span>
                <div className="flex-1 h-2 bg-[#0E0E12] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500/70 rounded-full transition-all duration-700"
                    style={{ width: `${maxDow > 0 ? (d.total / maxDow) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 shrink-0 w-20 text-right">
                  {d.total > 0 ? formatIDR(d.total) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Source breakdown */}
        <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">Sumber Dana</h3>
          {sourceStats.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-2.5">
              {sourceStats.map((src, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-[#0E0E12] rounded-2xl"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400">
                      <CreditCard size={13} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{src.name}</p>
                      <p className="text-[9px] text-zinc-600">{src.count} transaksi</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white">{formatIDR(src.debit)}</p>
                    {src.credit > 0 && (
                      <p className="text-[9px] text-emerald-500">+{formatIDR(src.credit)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Top merchants ── */}
      <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">
            Top Merchant
            <span className="ml-2 text-[10px] font-normal text-zinc-500">
              bulan ini berdasarkan total pengeluaran
            </span>
          </h3>
        </div>
        {topMerchants.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-6">Belum ada data</p>
        ) : (
          <div className="space-y-4">
            {topMerchants.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-zinc-600 w-4 shrink-0 text-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-xs font-semibold text-white truncate uppercase">{m.name}</p>
                    <p className="text-xs font-bold text-white shrink-0 ml-3">
                      Rp {formatIDR(m.amount)}
                    </p>
                  </div>
                  <div className="h-1.5 bg-[#0E0E12] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${COLORS[i % COLORS.length]}`}
                      style={{ width: `${(m.amount / maxMerchant) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
