import React from "react";
import { BarChart3, X, Layers, Plus, Activity, Wallet } from "lucide-react";
import { formatIDR } from "../lib/helpers";
import type { Transaction, CategoryStat, ViewType } from "../lib/types";
import { DailyBarChart } from "../components/charts/DailyBarChart";
import { TrxRow } from "../components/TrxRow";

interface OverviewViewProps {
  monthDebit: number;
  monthCredit: number;
  chartData: { day: number; amount: number }[];
  selectedDay: number | null;
  setSelectedDay: (day: number | null) => void;
  categoryStats: CategoryStat[];
  monthTrx: Transaction[];
  setActiveView: (v: ViewType) => void;
  setIsAddOpen: (open: boolean) => void;
  onEdit: (trx: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function OverviewView({
  monthDebit, monthCredit,
  chartData, selectedDay, setSelectedDay,
  categoryStats, monthTrx,
  setActiveView, setIsAddOpen,
  onEdit, onDelete, deletingId,
}: OverviewViewProps) {
  const overviewTrx = selectedDay
    ? monthTrx.filter(
        (t) => t.transaction_date && new Date(t.transaction_date).getDate() === selectedDay
      )
    : monthTrx.slice(0, 8);

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#18181B] border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1">Total Pengeluaran</p>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-base font-bold text-zinc-500">Rp</span>
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight break-all">
                {formatIDR(monthDebit)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#18181B] border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
            <Wallet size={18} />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1">Total Pemasukkan</p>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-base font-bold text-zinc-500">Rp</span>
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight break-all">
                {formatIDR(monthCredit)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="sm:col-span-2 lg:col-span-1 bg-blue-600 hover:bg-blue-500 border border-blue-400/20 rounded-2xl p-5 sm:p-6 flex items-center gap-4 lg:flex-col lg:justify-center lg:gap-3 text-white transition-all shadow-[0_0_30px_rgba(37,99,235,0.15)] hover:shadow-[0_0_40px_rgba(37,99,235,0.3)] group"
        >
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Plus size={24} />
          </div>
          <div className="lg:text-center">
            <p className="font-bold text-lg leading-tight">Catat Manual</p>
            <p className="text-xs text-blue-200 mt-0.5">Input Cepat Transaksi</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Chart + Activity */}
        <div className="xl:col-span-2 flex flex-col gap-4 sm:gap-6">
          {/* Daily chart */}
          <div className="bg-[#18181B] border border-white/5 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-blue-500" />
                <h3 className="text-sm font-bold text-white">Tren Pengeluaran Harian</h3>
              </div>
              {selectedDay && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded-lg transition-colors"
                >
                  <X size={10} /> Hari {selectedDay}
                </button>
              )}
            </div>
            {chartData.every((d) => d.amount === 0) ? (
              <div className="h-[90px] flex items-center justify-center text-xs text-zinc-600">
                Belum ada data pengeluaran bulan ini
              </div>
            ) : (
              <DailyBarChart data={chartData} selectedDay={selectedDay} onDayClick={setSelectedDay} />
            )}
            {!selectedDay && (
              <p className="text-[9px] text-zinc-600 mt-2">
                Klik bar untuk filter transaksi per hari
              </p>
            )}
          </div>

          {/* Activity list */}
          <div className="bg-[#18181B] border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">
                {selectedDay ? `Transaksi Hari ke-${selectedDay}` : "Aktivitas Terkini"}
              </h3>
              <button
                onClick={() => setActiveView("transactions")}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Lihat Semua
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[300px]">
              {monthTrx.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-zinc-600">
                  <Layers size={32} className="opacity-20" />
                  <p className="text-xs">Belum ada transaksi bulan ini</p>
                </div>
              ) : overviewTrx.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-zinc-600">
                  <Layers size={28} className="opacity-20" />
                  <p className="text-xs">Tidak ada transaksi pada hari {selectedDay}</p>
                </div>
              ) : (
                overviewTrx.map((trx) => (
                  <TrxRow
                    key={trx.id}
                    trx={trx}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    deletingId={deletingId}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Category breakdown */}
        <div className="bg-[#18181B] border border-white/5 rounded-2xl p-5 sm:p-6">
          <h3 className="text-sm font-bold text-white mb-5">Breakdown Kategori</h3>
          <div className="space-y-4">
            {categoryStats.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-8">Belum ada data</p>
            ) : (
              categoryStats.map((cat, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-zinc-400 truncate max-w-[65%]">
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{cat.percentage}%</span>
                      {cat.budget > 0 && (
                        <span
                          className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                            cat.amount > cat.budget
                              ? "text-rose-400 bg-rose-500/10"
                              : "text-emerald-400 bg-emerald-500/10"
                          }`}
                        >
                          {cat.amount > cat.budget ? "Over" : "OK"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-[#0E0E12] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  {cat.budget > 0 && (
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[9px] text-zinc-600">
                        {formatIDR(cat.amount)} dipakai
                      </span>
                      <span
                        className={`text-[9px] font-medium ${
                          cat.amount > cat.budget ? "text-rose-500" : "text-zinc-600"
                        }`}
                      >
                        limit {formatIDR(cat.budget)}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
