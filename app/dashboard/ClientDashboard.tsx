"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search, RefreshCw,
  Activity, Layers, BarChart3, Target, CalendarDays, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { monthLabel, toYYYYMM } from "./lib/helpers";
import type { Transaction, ViewType, NavItem } from "./lib/types";
import { useDashboardData } from "./hooks/useDashboardData";
import { Sidebar } from "./components/layout/Sidebar";
import { BottomNav } from "./components/layout/BottomNav";
import { AddTransactionModal } from "./components/modals/AddTransactionModal";
import { EditModal } from "./components/modals/EditModal";
import { OverviewView } from "./views/OverviewView";
import { TransactionsView } from "./views/TransactionsView";
import { AnalyticsView } from "./views/AnalyticsView";
import { BudgetView } from "./views/BudgetView";


/* ── Nav items ─────────────────────────────────────────────── */

const NAV_ITEMS: NavItem[] = [
  { icon: Activity, label: "Overview",   view: "overview" },
  { icon: Layers,   label: "Transaksi", view: "transactions" },
  { icon: BarChart3, label: "Analytics", view: "analytics" },
  { icon: Target,   label: "Budget",    view: "budget" },
];

/* ── ClientDashboard ─────────────────────────────────────────── */

export default function ClientDashboard({
  initialTransactions,
}: {
  initialTransactions: Transaction[];
}) {
  const router = useRouter();
  const today = new Date();

  /* ── State ── */
  const [selectedMonth, setSelectedMonth] = useState(() => toYYYYMM(today));
  const [activeView, setActiveView] = useState<ViewType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTrx, setEditingTrx] = useState<Transaction | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => today.getFullYear());
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  /* ── Effects ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("yb_budgets");
      if (saved) {
        const parsed = JSON.parse(saved);
        setBudgets(parsed);
        setBudgetInputs(
          Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]))
        );
      }
    } catch {}
  }, []);

  // Close month picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    }
    if (isMonthPickerOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMonthPickerOpen]);

  useEffect(() => {
    const id = setInterval(handleSyncSilent, 30 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived data ── */
  const {
    monthTrx, monthDebit, monthCredit,
    categoryStats, allCategories, budgetCategories,
    monthlyTrend, yearlyTrend, weeklyTrend,
    avgDailySpend, dayOfWeekStats,
    topMerchants, filteredTrx, chartData,
  } = useDashboardData({ initialTransactions, selectedMonth, searchQuery, selectedCategory, budgets });

  /* ── Actions ── */
  async function handleSync() {
    setSyncing(true);
    setSyncStatus("Syncing...");
    try {
      const secret = process.env.NEXT_PUBLIC_CRON_SECRET ?? "";
      const res = await fetch("/api/cron/sync-emails", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncStatus(`Error: ${data.error}`);
      } else {
        const processed = data.processed ?? 0;
        const skipped = data.skipped ?? 0;
        const failed = data.failed ?? 0;
        const parts = [`${processed} baru`, `${skipped} ada`];
        if (failed > 0) parts.push(`${failed} gagal`);
        setSyncStatus(parts.join(", "));
        router.refresh();
      }
    } catch {
      setSyncStatus("Gagal sync");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  }

  async function handleSyncSilent() {
    try {
      const secret = process.env.NEXT_PUBLIC_CRON_SECRET ?? "";
      const res = await fetch("/api/cron/sync-emails", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (res.ok) router.refresh();
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus transaksi ini?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert("Gagal menghapus transaksi");
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setDeletingId(null);
    }
  }

  function saveBudget(category: string) {
    const amount = Number(budgetInputs[category] ?? 0);
    const updated = { ...budgets, [category]: amount };
    setBudgets(updated);
    try { localStorage.setItem("yb_budgets", JSON.stringify(updated)); } catch {}
  }

  /* ── Shared action helpers (passed to row/views) ── */
  const sharedTrxActions = {
    onEdit: setEditingTrx,
    onDelete: handleDelete,
    deletingId,
  };

  /* ── View subtitle ── */
  const subtitleMap: Record<ViewType, string> = {
    overview: "Financial Overview",
    transactions: "Semua Transaksi",
    analytics: "Analytics & Insights",
    budget: "Budget Bulanan",
  };

  return (
    <>
      {/* Mobile bottom navigation */}
      <BottomNav
        navItems={NAV_ITEMS}
        activeView={activeView}
        setActiveView={setActiveView}
        onAddClick={() => setIsAddOpen(true)}
      />

      <div className="flex h-[100dvh] bg-[#000000] md:p-3 md:gap-3 overflow-hidden selection:bg-blue-500/30">
        {/* Desktop sidebar */}
        <Sidebar
          navItems={NAV_ITEMS}
          activeView={activeView}
          setActiveView={setActiveView}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        {/* Main panel */}
        <main className="flex-1 relative bg-[#0E0E12] border border-white/10 md:rounded-2xl overflow-y-auto overflow-x-hidden shadow-2xl z-10 flex flex-col min-w-0">
          {/* Background glow */}
          <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-600/20 via-blue-900/5 to-transparent pointer-events-none z-0" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[min(600px,100vw)] h-[400px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none z-0" />

          <div className="relative z-10 p-4 sm:p-6 lg:p-10 pb-24 md:pb-10 max-w-[1400px] mx-auto w-full flex flex-col gap-6 sm:gap-8">

            {/* ── Header ── */}
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {/* Month/Year Picker */}
                <div className="relative" ref={monthPickerRef}>
                  <button
                    onClick={() => { setIsMonthPickerOpen((o) => !o); setPickerYear(Number(selectedMonth.split("-")[0])); }}
                    className="flex items-center gap-2 group"
                  >
                    <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white tracking-tight capitalize group-hover:text-blue-400 transition-colors">
                      {monthLabel(selectedMonth)}
                    </h2>
                    <CalendarDays size={18} className="text-zinc-500 group-hover:text-blue-400 transition-colors mt-0.5 shrink-0" />
                  </button>

                  {isMonthPickerOpen && (
                    <div className="absolute top-full left-0 mt-2 z-50 bg-[#18181B] border border-white/10 rounded-2xl p-4 shadow-2xl w-[280px]">
                      {/* Year row */}
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => setPickerYear((y) => y - 1)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-white">{pickerYear}</span>
                        <button
                          onClick={() => setPickerYear((y) => y + 1)}
                          disabled={pickerYear >= today.getFullYear()}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:pointer-events-none"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                      {/* Month grid */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((label, i) => {
                          const ym = `${pickerYear}-${String(i + 1).padStart(2, "0")}`;
                          const isCurrent = ym === selectedMonth;
                          const isFuture = ym > toYYYYMM(today);
                          return (
                            <button
                              key={ym}
                              disabled={isFuture}
                              onClick={() => { setSelectedMonth(ym); setSelectedDay(null); setSelectedCategory(""); setIsMonthPickerOpen(false); }}
                              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                                isCurrent
                                  ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]"
                                  : isFuture
                                  ? "text-zinc-700 cursor-not-allowed"
                                  : "text-zinc-400 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {subtitleMap[activeView]}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeView === "transactions" && (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari..."
                      className="w-[130px] sm:w-[200px] bg-[#18181B] border border-white/5 rounded-xl py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-blue-500/40 transition-all"
                    />
                  </div>
                )}
                <div className="relative">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="p-2.5 bg-[#18181B] border border-white/5 hover:border-blue-500/30 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center justify-center"
                  >
                    <RefreshCw size={17} className={syncing ? "animate-spin text-blue-500" : ""} />
                  </button>
                  {syncStatus && (
                    <div className="absolute top-full right-0 mt-2 whitespace-nowrap text-[10px] font-medium text-zinc-300 bg-[#18181B] border border-white/10 px-2.5 py-1.5 rounded-lg z-10">
                      {syncStatus}
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* ── Views ── */}
            {activeView === "overview" && (
              <OverviewView
                monthDebit={monthDebit}
                monthCredit={monthCredit}
                chartData={chartData}
                selectedDay={selectedDay}
                setSelectedDay={setSelectedDay}
                categoryStats={categoryStats}
                monthTrx={monthTrx}
                setActiveView={setActiveView}
                setIsAddOpen={setIsAddOpen}
                {...sharedTrxActions}
              />
            )}

            {activeView === "transactions" && (
              <TransactionsView
                filteredTrx={filteredTrx}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={(cat) => { setSelectedCategory(cat); setSelectedDay(null); }}
                availableCategories={allCategories}
                {...sharedTrxActions}
              />
            )}

            {activeView === "analytics" && (
              <AnalyticsView
                monthTrx={monthTrx}
                monthDebit={monthDebit}
                monthCredit={monthCredit}
                avgDailySpend={avgDailySpend}
                monthlyTrend={monthlyTrend}
                yearlyTrend={yearlyTrend}
                weeklyTrend={weeklyTrend}
                dayOfWeekStats={dayOfWeekStats}
                categoryStats={categoryStats}
                topMerchants={topMerchants}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                setSelectedDay={setSelectedDay}
                setActiveView={setActiveView}
              />
            )}

            {activeView === "budget" && (
              <BudgetView
                allCategories={budgetCategories}
                categoryStats={categoryStats}
                budgets={budgets}
                budgetInputs={budgetInputs}
                setBudgetInputs={setBudgetInputs}
                saveBudget={saveBudget}
              />
            )}

          </div>
        </main>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => router.refresh()}
      />
      {editingTrx && (
        <EditModal
          trx={editingTrx}
          onClose={() => setEditingTrx(null)}
          onSuccess={() => { router.refresh(); setEditingTrx(null); }}
        />
      )}
    </>
  );
}
