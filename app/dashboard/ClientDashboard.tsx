"use client";

import { useState, useEffect } from "react";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  Activity, Layers, BarChart3, Target,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { fontStyles, monthLabel, shiftMonth, toYYYYMM } from "./lib/helpers";
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

  useEffect(() => {
    const id = setInterval(handleSyncSilent, 30 * 60 * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived data ── */
  const {
    monthTrx, monthDebit, monthCredit,
    categoryStats, allCategories, sourceStats,
    monthlyTrend, avgDailySpend, dayOfWeekStats,
    topMerchants, filteredTrx, chartData,
  } = useDashboardData({ initialTransactions, selectedMonth, searchQuery, activeView, budgets });

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

  const canGoNext = shiftMonth(selectedMonth, 1) <= toYYYYMM(today);

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
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

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
        <main className="flex-1 relative bg-[#0E0E12] border border-white/10 md:rounded-[28px] overflow-y-auto shadow-2xl z-10 flex flex-col min-w-0">
          {/* Background glow */}
          <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-blue-600/20 via-blue-900/5 to-transparent pointer-events-none z-0" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none z-0" />

          <div className="relative z-10 p-4 sm:p-6 lg:p-10 pb-24 md:pb-10 max-w-[1400px] mx-auto w-full flex flex-col gap-6 sm:gap-8">

            {/* ── Header ── */}
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setSelectedMonth(shiftMonth(selectedMonth, -1)); setSelectedDay(null); }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all shrink-0"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white tracking-tight truncate capitalize">
                    {monthLabel(selectedMonth)}
                  </h2>
                  <button
                    onClick={() => { setSelectedMonth(shiftMonth(selectedMonth, 1)); setSelectedDay(null); }}
                    disabled={!canGoNext}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all shrink-0 disabled:opacity-20 disabled:pointer-events-none"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5 ml-9">
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
                dayOfWeekStats={dayOfWeekStats}
                sourceStats={sourceStats}
                topMerchants={topMerchants}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                setSelectedDay={setSelectedDay}
                setActiveView={setActiveView}
              />
            )}

            {activeView === "budget" && (
              <BudgetView
                allCategories={allCategories}
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
