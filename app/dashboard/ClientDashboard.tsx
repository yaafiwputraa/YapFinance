"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Search, Sparkles, Command, X, Layers, Activity,
  Settings, CreditCard, Wallet, Coffee, Car, ShoppingCart, Zap,
  PanelLeftClose, PanelLeftOpen, RefreshCw, Loader2,
  Trash2, Pencil, ChevronLeft, ChevronRight, BarChart3, Target, Check,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ── Helpers ──────────────────────────────────────────────── */

const fontStyles = `
  @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
  :root { --font-jakarta: "Plus Jakarta Sans", sans-serif; }
  body { font-family: var(--font-jakarta); background-color: #000000; color: #FAFAFA; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: transparent; border-radius: 10px; }
  *:hover::-webkit-scrollbar-thumb { background: #27272A; }
  ::-webkit-scrollbar-thumb:hover { background: #3F3F46; }
`;

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

function formatDate(s?: string | null): string {
  if (!s) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
    }).format(new Date(s));
  } catch { return "-"; }
}

function getCategoryIcon(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("food") || c.includes("beverage") || c.includes("kopi") || c.includes("makan")) return Coffee;
  if (c.includes("transport") || c.includes("gojek") || c.includes("grab")) return Car;
  if (c.includes("belanja") || c.includes("shopping")) return ShoppingCart;
  if (c.includes("tagihan") || c.includes("listrik") || c.includes("pln") || c.includes("internet")) return Zap;
  return Zap;
}

function toYYYYMM(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(+y, +m - 1)
  );
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  return toYYYYMM(new Date(y, m - 1 + delta, 1));
}

/* ── Daily Bar Chart ──────────────────────────────────────── */

function DailyBarChart({ data }: { data: { day: number; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="w-full">
      <div className="flex items-end gap-[2px] h-[72px]">
        {data.map((d, i) => {
          const h = d.amount > 0 ? Math.max(8, (d.amount / max) * 72) : 3;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end group relative">
              <div
                className={`rounded-sm transition-all ${d.amount > 0 ? "bg-blue-500/70 group-hover:bg-blue-400" : "bg-zinc-800"}`}
                style={{ height: `${h}px` }}
              />
              {d.amount > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-white bg-[#18181B] border border-white/10 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {d.day} - {formatIDR(d.amount)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-zinc-600 mt-1.5">
        <span>1</span>
        <span>{Math.ceil(data.length / 2)}</span>
        <span>{data.length}</span>
      </div>
    </div>
  );
}

/* ── Edit Modal ───────────────────────────────────────────── */

function EditModal({ trx, onClose, onSuccess }: { trx: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: String(trx.amount),
    merchant_name: trx.merchant_name || "",
    category: trx.category || "Lainnya",
    source: trx.source || "CASH",
    type: trx.type || "DEBIT",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${trx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.amount),
          merchant_name: form.merchant_name,
          category: form.category,
          source: form.source,
          type: form.type,
        }),
      });
      if (res.ok) onSuccess();
      else alert("Gagal menyimpan perubahan");
    } catch { alert("Terjadi kesalahan"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0E0E12] border border-white/10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95dvh]">
        <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
          <h2 className="text-lg font-bold text-white">Edit Transaksi</h2>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nominal</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-zinc-400 focus:outline-none cursor-pointer">
                <option value="DEBIT">Pengeluaran</option>
                <option value="KREDIT">Pemasukan</option>
              </select>
            </div>
            <div className="flex items-center border-b-2 border-zinc-800 focus-within:border-blue-500 transition-colors pb-2">
              <span className="text-xl font-bold text-zinc-500 mr-2">Rp</span>
              <input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)}
                className="flex-1 bg-transparent text-2xl font-bold text-white focus:outline-none min-w-0" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Merchant</label>
            <input type="text" value={form.merchant_name} onChange={(e) => set("merchant_name", e.target.value)}
              className="w-full bg-[#18181B] border border-white/5 focus:border-blue-500/50 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Kategori</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}
                className="w-full bg-[#18181B] border border-white/5 rounded-xl px-3 py-3 text-sm font-medium text-white appearance-none focus:outline-none cursor-pointer">
                <option>Food & Beverage</option>
                <option>Transportasi</option>
                <option>Belanja</option>
                <option>Tagihan</option>
                <option>Lainnya</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Sumber</label>
              <select value={form.source} onChange={(e) => set("source", e.target.value)}
                className="w-full bg-[#18181B] border border-white/5 rounded-xl px-3 py-3 text-sm font-medium text-white appearance-none focus:outline-none cursor-pointer">
                <option value="CASH">Uang Tunai</option>
                <option value="GOPAY">GoPay</option>
                <option value="BLU">Blu</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-5 pt-3 shrink-0">
          <button onClick={handleSave} disabled={loading || !form.amount}
            className="w-full bg-white hover:bg-zinc-100 text-black py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Check size={16} /> Simpan Perubahan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Transaction Modal ────────────────────────────────── */

function AddTransactionModal({
  isOpen, onClose, onSuccess,
}: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: "", merchant_name: "", category: "Lainnya", source: "CASH", type: "DEBIT",
  });
  if (!isOpen) return null;
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.amount),
          merchant_name: form.merchant_name || "Tanpa Nama",
          category: form.category,
          source: form.source,
          type: form.type,
          transaction_date: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        onSuccess(); onClose();
        setForm({ amount: "", merchant_name: "", category: "Lainnya", source: "CASH", type: "DEBIT" });
      } else { alert("Gagal menyimpan transaksi"); }
    } catch { alert("Terjadi kesalahan"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0E0E12] border border-white/10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95dvh]">
        <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
          <h2 className="text-lg font-bold text-white">Catat Manual</h2>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nominal</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-zinc-400 focus:outline-none cursor-pointer">
                <option value="DEBIT">Pengeluaran</option>
                <option value="KREDIT">Pemasukan</option>
              </select>
            </div>
            <div className="flex items-center border-b-2 border-zinc-800 focus-within:border-blue-500 transition-colors pb-2">
              <span className="text-2xl font-bold text-zinc-500 mr-2">Rp</span>
              <input type="number" placeholder="0" value={form.amount} onChange={(e) => set("amount", e.target.value)}
                className="flex-1 bg-transparent text-3xl font-bold text-white focus:outline-none placeholder:text-zinc-700 min-w-0" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Merchant / Detail</label>
            <input type="text" placeholder="Cth: Kopi Susu Tetangga" value={form.merchant_name}
              onChange={(e) => set("merchant_name", e.target.value)}
              className="w-full bg-[#18181B] border border-white/5 focus:border-blue-500/50 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none placeholder:text-zinc-600 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Kategori</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}
                className="w-full bg-[#18181B] border border-white/5 rounded-xl px-3 py-3 text-sm font-medium text-white appearance-none focus:outline-none cursor-pointer">
                <option>Food & Beverage</option>
                <option>Transportasi</option>
                <option>Belanja</option>
                <option>Tagihan</option>
                <option>Lainnya</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Sumber Dana</label>
              <select value={form.source} onChange={(e) => set("source", e.target.value)}
                className="w-full bg-[#18181B] border border-white/5 rounded-xl px-3 py-3 text-sm font-medium text-white appearance-none focus:outline-none cursor-pointer">
                <option value="CASH">Uang Tunai</option>
                <option value="GOPAY">GoPay</option>
                <option value="BLU">Blu</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-5 pt-3 shrink-0">
          <button onClick={handleSubmit} disabled={loading || !form.amount}
            className="w-full bg-white hover:bg-zinc-100 text-black py-4 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={20} className="animate-spin" /> : "Simpan Transaksi"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ───────────────────────────────────────── */

export default function ClientDashboard({ initialTransactions }: { initialTransactions: any[] }) {
  const router = useRouter();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => toYYYYMM(today));
  const [activeView, setActiveView] = useState<"overview" | "transactions" | "sources" | "budget">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTrx, setEditingTrx] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("yb_budgets");
      if (saved) {
        const parsed = JSON.parse(saved);
        setBudgets(parsed);
        setBudgetInputs(Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)])));
      }
    } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(handleSyncSilent, 30 * 60 * 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived data ── */
  const monthTrx = useMemo(
    () => initialTransactions.filter((t) => t.transaction_date?.startsWith(selectedMonth)),
    [initialTransactions, selectedMonth]
  );

  const monthDebit = useMemo(
    () => monthTrx.filter((t) => t.type === "DEBIT").reduce((s, t) => s + Number(t.amount), 0),
    [monthTrx]
  );

  const monthCredit = useMemo(
    () => monthTrx.filter((t) => t.type === "KREDIT").reduce((s, t) => s + Number(t.amount), 0),
    [monthTrx]
  );

  const COLORS = ["bg-orange-500", "bg-blue-500", "bg-purple-500", "bg-zinc-500", "bg-emerald-500", "bg-rose-500"];

  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    monthTrx.filter((t) => t.type === "DEBIT").forEach((t) => {
      const k = t.category || "Lainnya";
      map[k] = (map[k] || 0) + Number(t.amount);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount], i) => ({
        name, amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: COLORS[i % COLORS.length],
        budget: budgets[name] ?? 0,
      }));
  }, [monthTrx, budgets]);

  const allCategories = useMemo(() => {
    const cats = new Set(["Food & Beverage", "Transportasi", "Belanja", "Tagihan", "Lainnya"]);
    initialTransactions.forEach((t) => cats.add(t.category || "Lainnya"));
    return Array.from(cats);
  }, [initialTransactions]);

  const sourceStats = useMemo(() => {
    const map: Record<string, { debit: number; credit: number; count: number }> = {};
    initialTransactions.forEach((t) => {
      const k = t.source || "MANUAL";
      if (!map[k]) map[k] = { debit: 0, credit: 0, count: 0 };
      if (t.type === "DEBIT") map[k].debit += Number(t.amount);
      else map[k].credit += Number(t.amount);
      map[k].count++;
    });
    return Object.entries(map)
      .sort((a, b) => (b[1].debit + b[1].credit) - (a[1].debit + a[1].credit))
      .map(([name, v]) => ({ name, ...v }));
  }, [initialTransactions]);

  const filteredTrx = useMemo(() => {
    const base = activeView === "transactions" ? initialTransactions : monthTrx;
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(
      (t) =>
        (t.merchant_name || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q) ||
        (t.source || "").toLowerCase().includes(q)
    );
  }, [monthTrx, initialTransactions, searchQuery, activeView]);

  const chartData = useMemo(() => {
    const [yr, mo] = selectedMonth.split("-").map(Number);
    const days = new Date(yr, mo, 0).getDate();
    const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, amount: 0 }));
    monthTrx
      .filter((t) => t.type === "DEBIT" && t.transaction_date)
      .forEach((t) => {
        const d = new Date(t.transaction_date).getDate();
        if (d >= 1 && d <= days) daily[d - 1].amount += Number(t.amount);
      });
    return daily;
  }, [monthTrx, selectedMonth]);

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
    } catch { setSyncStatus("Gagal sync"); }
    finally { setSyncing(false); setTimeout(() => setSyncStatus(null), 5000); }
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
    } catch { alert("Terjadi kesalahan"); }
    finally { setDeletingId(null); }
  }

  function saveBudget(category: string) {
    const amount = Number(budgetInputs[category] ?? 0);
    const updated = { ...budgets, [category]: amount };
    setBudgets(updated);
    try { localStorage.setItem("yb_budgets", JSON.stringify(updated)); } catch {}
  }

  const canGoNext = shiftMonth(selectedMonth, 1) <= toYYYYMM(today);

  const navItems = [
    { icon: Activity, label: "Overview", view: "overview" as const },
    { icon: Layers, label: "Transaksi", view: "transactions" as const },
    { icon: CreditCard, label: "Sumber Dana", view: "sources" as const },
    { icon: Target, label: "Budget", view: "budget" as const },
  ];

  function TrxRow({ trx }: { trx: any }) {
    const Icon = getCategoryIcon(trx.category);
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group">
        <div className="w-10 h-10 rounded-full bg-[#0E0E12] border border-white/5 flex items-center justify-center text-zinc-400 shrink-0">
          <Icon size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-white truncate uppercase">
            {trx.merchant_name || "TRANSAKSI"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] text-zinc-500">{formatDate(trx.transaction_date)}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase">{trx.source || "MANUAL"}</span>
            {trx.entry_method === "AUTO_EMAIL" && (
              <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Sparkles size={8} /> Auto
              </span>
            )}
          </div>
        </div>
        <p className={`text-sm font-bold shrink-0 ${trx.type === "DEBIT" ? "text-white" : "text-emerald-400"}`}>
          {trx.type === "DEBIT" ? "-" : "+"} {formatIDR(Number(trx.amount))}
        </p>
        <div className="hidden group-hover:flex items-center gap-1 ml-1 shrink-0">
          <button onClick={() => setEditingTrx(trx)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-zinc-500 hover:text-blue-400 transition-all">
            <Pencil size={12} />
          </button>
          <button onClick={() => handleDelete(trx.id)} disabled={deletingId === trx.id}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all">
            {deletingId === trx.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-[50] md:hidden bg-[#0E0E12]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-2">
        {[navItems[0], navItems[1]].map((item) => (
          <button key={item.view} onClick={() => setActiveView(item.view)}
            className="flex flex-col items-center gap-1 py-3 px-4 flex-1">
            <item.icon size={22}
              className={activeView === item.view ? "text-blue-500" : "text-zinc-500"}
              strokeWidth={activeView === item.view ? 2.5 : 2} />
            <span className={`text-[10px] font-semibold ${activeView === item.view ? "text-blue-400" : "text-zinc-500"}`}>
              {item.label}
            </span>
          </button>
        ))}
        <button onClick={() => setIsAddOpen(true)}
          className="-mt-5 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all active:scale-95 shrink-0">
          <Plus size={26} className="text-white" />
        </button>
        {[navItems[2], navItems[3]].map((item) => (
          <button key={item.view} onClick={() => setActiveView(item.view)}
            className="flex flex-col items-center gap-1 py-3 px-4 flex-1">
            <item.icon size={22}
              className={activeView === item.view ? "text-blue-500" : "text-zinc-500"}
              strokeWidth={activeView === item.view ? 2.5 : 2} />
            <span className={`text-[10px] font-semibold ${activeView === item.view ? "text-blue-400" : "text-zinc-500"}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="flex h-[100dvh] bg-[#000000] md:p-3 md:gap-3 overflow-hidden selection:bg-blue-500/30">
        {/* Desktop sidebar */}
        <aside className={`hidden md:flex relative h-full bg-[#0E0E12] border border-white/10 rounded-[28px] flex-col transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shadow-2xl z-20 ${isSidebarCollapsed ? "w-[80px]" : "w-[260px]"}`}>
          <div className="flex items-center justify-between p-5 h-20 shrink-0">
            <div className={`flex items-center ${isSidebarCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"}`}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                <Command size={16} />
              </div>
              <h1 className="ml-3 text-xl font-bold text-white tracking-tight">DeepYap.</h1>
            </div>
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all ${isSidebarCollapsed ? "mx-auto" : ""}`}>
              {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          </div>
          <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
            {navItems.map((item, i) => (
              <button key={i} onClick={() => setActiveView(item.view)}
                className={`w-full flex items-center p-3 rounded-2xl transition-all duration-200 ${activeView === item.view ? "bg-[#18181B] border border-white/5" : "border border-transparent hover:bg-white/[0.03]"}`}>
                <item.icon size={20} strokeWidth={activeView === item.view ? 2.5 : 2}
                  className={`shrink-0 ${activeView === item.view ? "text-blue-500" : "text-zinc-500"} ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                <span className={`ml-3 text-sm whitespace-nowrap overflow-hidden ${activeView === item.view ? "font-semibold text-white" : "font-medium text-zinc-400"} ${isSidebarCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
          <div className="p-3 shrink-0 mb-2 border-t border-white/5 mt-2">
            <div className={`flex items-center p-2 rounded-2xl ${isSidebarCollapsed ? "" : "gap-3"}`}>
              <div className={`w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-white font-medium shrink-0 ${isSidebarCollapsed ? "mx-auto" : ""}`}>Y</div>
              <div className={`text-left overflow-hidden whitespace-nowrap ${isSidebarCollapsed ? "opacity-0 w-0" : "opacity-100"}`}>
                <p className="text-sm font-bold text-white">Yap Account</p>
                <p className="text-xs text-zinc-500">Free Plan</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 relative bg-[#0E0E12] border border-white/10 md:rounded-[28px] overflow-y-auto shadow-2xl z-10 flex flex-col min-w-0">
          <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none z-0" />
          <div className="relative z-10 p-4 sm:p-6 lg:p-10 pb-24 md:pb-10 max-w-[1400px] mx-auto w-full flex flex-col gap-6 sm:gap-8">

            {/* Header - month navigation */}
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all shrink-0">
                    <ChevronLeft size={18} />
                  </button>
                  <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white tracking-tight truncate capitalize">
                    {monthLabel(selectedMonth)}
                  </h2>
                  <button onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                    disabled={!canGoNext}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all shrink-0 disabled:opacity-20 disabled:pointer-events-none">
                    <ChevronRight size={18} />
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5 ml-9">
                  {activeView === "overview" && "Financial Overview"}
                  {activeView === "transactions" && "Semua Transaksi"}
                  {activeView === "sources" && "Sumber Dana"}
                  {activeView === "budget" && "Budget Bulanan"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeView === "transactions" && (
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari..."
                      className="w-[130px] sm:w-[200px] bg-[#18181B] border border-white/5 rounded-xl py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-blue-500/40 transition-all" />
                  </div>
                )}
                <div className="relative">
                  <button onClick={handleSync} disabled={syncing}
                    className="p-2.5 bg-[#18181B] border border-white/5 hover:border-blue-500/30 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center justify-center">
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

            {/* OVERVIEW */}
            {activeView === "overview" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
                      <Activity size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-1">Total Pengeluaran</p>
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className="text-base font-bold text-zinc-500">Rp</span>
                        <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight break-all">{formatIDR(monthDebit)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-1">Total Pemasukkan</p>
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className="text-base font-bold text-zinc-500">Rp</span>
                        <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight break-all">{formatIDR(monthCredit)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setIsAddOpen(true)}
                    className="sm:col-span-2 lg:col-span-1 bg-blue-600 hover:bg-blue-500 border border-blue-400/20 rounded-3xl p-5 sm:p-6 flex items-center gap-4 lg:flex-col lg:justify-center lg:gap-3 text-white transition-all shadow-[0_0_30px_rgba(37,99,235,0.15)] hover:shadow-[0_0_40px_rgba(37,99,235,0.3)] group">
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
                  <div className="xl:col-span-2 flex flex-col gap-4 sm:gap-6">
                    <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={15} className="text-blue-500" />
                        <h3 className="text-sm font-bold text-white">Tren Pengeluaran Harian</h3>
                      </div>
                      {chartData.every((d) => d.amount === 0) ? (
                        <div className="h-[72px] flex items-center justify-center text-xs text-zinc-600">
                          Belum ada data pengeluaran bulan ini
                        </div>
                      ) : (
                        <DailyBarChart data={chartData} />
                      )}
                    </div>

                    <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5 sm:p-6 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-white">Aktivitas Terkini</h3>
                        <button onClick={() => setActiveView("transactions")}
                          className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors">
                          Lihat Semua
                        </button>
                      </div>
                      <div className="space-y-1 overflow-y-auto max-h-[300px]">
                        {monthTrx.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-10 text-zinc-600">
                            <Layers size={32} className="opacity-20" />
                            <p className="text-xs">Belum ada transaksi bulan ini</p>
                          </div>
                        ) : (
                          monthTrx.slice(0, 8).map((trx) => <TrxRow key={trx.id} trx={trx} />)
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5 sm:p-6">
                    <h3 className="text-sm font-bold text-white mb-5">Breakdown Kategori</h3>
                    <div className="space-y-4">
                      {categoryStats.length === 0 ? (
                        <p className="text-xs text-zinc-600 text-center py-8">Belum ada data</p>
                      ) : (
                        categoryStats.map((cat, i) => (
                          <div key={i}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-xs font-medium text-zinc-400 truncate max-w-[65%]">{cat.name}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white">{cat.percentage}%</span>
                                {cat.budget > 0 && (
                                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${cat.amount > cat.budget ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10"}`}>
                                    {cat.amount > cat.budget ? "Over" : "OK"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="h-1.5 w-full bg-[#0E0E12] rounded-full overflow-hidden">
                              <div className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                                style={{ width: `${cat.percentage}%` }} />
                            </div>
                            {cat.budget > 0 && (
                              <div className="flex justify-between mt-0.5">
                                <span className="text-[9px] text-zinc-600">{formatIDR(cat.amount)} dipakai</span>
                                <span className={`text-[9px] font-medium ${cat.amount > cat.budget ? "text-rose-500" : "text-zinc-600"}`}>
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
            )}

            {/* TRANSACTIONS VIEW */}
            {activeView === "transactions" && (
              <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5 sm:p-6 flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">
                    {searchQuery ? `"${searchQuery}"` : "Semua Transaksi"}
                    <span className="ml-2 text-[10px] font-normal text-zinc-500">({filteredTrx.length})</span>
                  </h3>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-[10px] text-zinc-500 hover:text-white">
                      Reset
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto">
                  {filteredTrx.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-zinc-600">
                      <Layers size={36} className="opacity-20" />
                      <p className="text-xs">{searchQuery ? "Tidak ada yang cocok" : "Belum ada transaksi"}</p>
                    </div>
                  ) : (
                    filteredTrx.map((trx) => <TrxRow key={trx.id} trx={trx} />)
                  )}
                </div>
              </div>
            )}

            {/* SOURCES VIEW */}
            {activeView === "sources" && (
              <div className="space-y-4">
                {sourceStats.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-20 text-zinc-600 bg-[#18181B] rounded-3xl border border-white/5">
                    <CreditCard size={36} className="opacity-20" />
                    <p className="text-xs">Belum ada data sumber dana</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sourceStats.map((src, i) => (
                      <div key={i} className="bg-[#18181B] border border-white/5 rounded-3xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 shrink-0">
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{src.name}</p>
                            <p className="text-[10px] text-zinc-500">{src.count} transaksi (all time)</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#0E0E12] rounded-2xl p-3">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Total Keluar</p>
                            <p className="text-xs sm:text-sm font-bold text-white break-all">{formatIDR(src.debit)}</p>
                          </div>
                          <div className="bg-[#0E0E12] rounded-2xl p-3">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Total Masuk</p>
                            <p className="text-xs sm:text-sm font-bold text-emerald-400 break-all">{formatIDR(src.credit)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BUDGET VIEW */}
            {activeView === "budget" && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500">
                  Set batas pengeluaran per kategori. Tersimpan di perangkat ini.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allCategories.map((cat) => {
                    const stat = categoryStats.find((s) => s.name === cat);
                    const budget = budgets[cat] ?? 0;
                    const spent = stat?.amount ?? 0;
                    const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
                    const isOver = budget > 0 && spent > budget;
                    return (
                      <div key={cat} className="bg-[#18181B] border border-white/5 rounded-3xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 shrink-0">
                            {React.createElement(getCategoryIcon(cat), { size: 14 })}
                          </div>
                          <p className="text-sm font-bold text-white truncate">{cat}</p>
                        </div>
                        {budget > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-zinc-500">{formatIDR(spent)} dipakai</span>
                              <span className={isOver ? "text-rose-400 font-bold" : "text-zinc-500"}>
                                {pct}%{isOver ? " Over!" : ""}
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#0E0E12] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isOver ? "bg-rose-500" : "bg-blue-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center flex-1 bg-[#0E0E12] border border-white/5 focus-within:border-blue-500/50 rounded-xl px-3 py-2 transition-all">
                            <span className="text-xs text-zinc-500 mr-1 shrink-0">Rp</span>
                            <input
                              type="number"
                              placeholder="0 = tidak ada limit"
                              value={budgetInputs[cat] ?? (budget > 0 ? String(budget) : "")}
                              onChange={(e) => setBudgetInputs((p) => ({ ...p, [cat]: e.target.value }))}
                              className="flex-1 bg-transparent text-xs font-medium text-white focus:outline-none placeholder:text-zinc-700 min-w-0"
                            />
                          </div>
                          <button onClick={() => saveBudget(cat)}
                            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all shrink-0">
                            <Check size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

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