"use client";

import React, { useState } from "react";
import { 
  Plus, Search, ArrowUpRight, Sparkles, Command, X, Layers, Activity, 
  Settings, CreditCard, Wallet, Coffee, Car, ShoppingCart, Zap, 
  PanelLeftClose, PanelLeftOpen, LogOut, ArrowDownRight, RefreshCw, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatMonthYear(): string {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

const fontStyles = `
  @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
  
  :root {
    --font-jakarta: "Plus Jakarta Sans", sans-serif;
  }
  
  body {
    font-family: var(--font-jakarta);
    background-color: #000000;
    color: #FAFAFA; 
  }

  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 10px;
  }
  *:hover::-webkit-scrollbar-thumb {
    background: #27272A;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #3F3F46;
  }
`;

const formatIDR = (amount: number) => {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(amount);
};

function getCategoryIcon(category: string) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("food") || cat.includes("beverage") || cat.includes("kopi") || cat.includes("makan")) return Coffee;
  if (cat.includes("transport") || cat.includes("gojek") || cat.includes("grab")) return Car;
  if (cat.includes("belanja") || cat.includes("shopping")) return ShoppingCart;
  if (cat.includes("tagihan") || cat.includes("listrik") || cat.includes("pln") || cat.includes("internet")) return Zap;
  return Zap;
}

function AddTransactionModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    merchant_name: "",
    category: "Lainnya",
    source: "CASH",
    type: "DEBIT"
  });

  if (!isOpen) return null;

  async function handleSubmit() {
    setLoading(true);
    try {
      const payload = {
        amount: Number(formData.amount),
        merchant_name: formData.merchant_name || "Tanpa Nama",
        category: formData.category,
        source: formData.source,
        type: formData.type,
        transaction_date: new Date().toISOString()
      };

      const res = await fetch("/api/transactions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
        onClose();
        setFormData({ amount: "", merchant_name: "", category: "Lainnya", source: "CASH", type: "DEBIT" });
      } else {
        alert("Gagal menyimpan transaksi");
      }
    } catch (e) {
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
      
      <div className="relative bg-[#0E0E12] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 zoom-in-95 duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white tracking-tight">Catat Manual</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="group">
            <div className="flex justify-between mb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-focus-within:text-blue-500 transition-colors">Nominal</label>
              <select 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="bg-transparent text-xs font-bold tracking-wider float-right focus:outline-none cursor-pointer text-zinc-400"
              >
                <option value="DEBIT">Pengeluaran (-)</option>
                <option value="KREDIT">Pemasukan (+)</option>
              </select>
            </div>
            <div className="relative flex items-center border-b-2 border-zinc-800 focus-within:border-blue-500 transition-colors pb-2">
              <span className="text-2xl font-bold text-zinc-500 mr-3">Rp</span>
              <input 
                type="number" 
                placeholder="0" 
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                className="w-full bg-transparent text-4xl font-bold text-white focus:outline-none placeholder:text-zinc-800" 
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Merchant / Detail</label>
            <input 
              type="text" 
              placeholder="Cth: Kopi Susu Tetangga" 
              value={formData.merchant_name}
              onChange={e => setFormData({...formData, merchant_name: e.target.value})}
              className="w-full bg-[#18181B] border border-white/5 focus:border-blue-500/50 rounded-xl px-4 py-4 font-medium text-white transition-all placeholder:text-zinc-600 focus:outline-none" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Kategori</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full bg-[#18181B] border border-white/5 focus:border-blue-500/50 rounded-xl px-4 py-4 font-medium text-white appearance-none focus:outline-none cursor-pointer transition-all"
              >
                <option>Food & Beverage</option>
                <option>Transportasi</option>
                <option>Belanja</option>
                <option>Tagihan</option>
                <option>Lainnya</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Sumber Dana</label>
              <select 
                value={formData.source}
                onChange={e => setFormData({...formData, source: e.target.value})}
                className="w-full bg-[#18181B] border border-white/5 focus:border-blue-500/50 rounded-xl px-4 py-4 font-medium text-white appearance-none focus:outline-none cursor-pointer transition-all"
              >
                <option value="CASH">Uang Tunai</option>
                <option value="GOPAY">GoPay</option>
                <option value="BLU">Blu</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 pt-2">
          <button 
            onClick={handleSubmit} 
            disabled={loading || !formData.amount}
            className="w-full bg-white hover:bg-zinc-200 text-black py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : "Simpan Transaksi"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboard({ 
  initialTransactions, 
  monthTotalDebit,
  monthTotalCredit,
  categoryTotals 
}: { 
  initialTransactions: any[],
  monthTotalDebit: number,
  monthTotalCredit: number,
  categoryTotals: any[]
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  
  const CATEGORY_COLORS = ["bg-orange-500", "bg-blue-500", "bg-purple-500", "bg-zinc-500", "bg-emerald-500", "bg-rose-500"];
  const mappedCategoryStats = categoryTotals.map((cat, i) => ({
    ...cat,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
  }));

  const monthName = formatMonthYear();

  async function handleSync() {
    setSyncing(true);
    setSyncStatus("Syncing...");
    try {
      const res = await fetch("/api/cron/sync-emails", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`, 
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncStatus(`Error: ${data.error}`);
      } else {
        const parts = [`${data.processed} baru`, `${data.skipped} ada`];
        if (data.failed > 0) parts.push(`${data.failed} gagal`);
        setSyncStatus(parts.join(", "));
        router.refresh();
      }
    } catch (e) {
      setSyncStatus("Gagal sync");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      
      <div className="flex h-screen bg-[#000000] p-3 gap-3 overflow-hidden selection:bg-blue-500/30">
        <aside 
          className={`relative h-full bg-[#0E0E12] border border-white/10 rounded-[28px] flex flex-col transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shadow-2xl z-20 ${
            isSidebarCollapsed ? "w-[80px]" : "w-[280px]"
          }`}
        >
          <div className="flex items-center justify-between p-5 h-20 shrink-0">
            <div className={`flex items-center transition-opacity duration-300 ${isSidebarCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"}`}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                <Command size={16} />
              </div>
              <h1 className="ml-3 text-xl font-bold text-white tracking-tight">DeepYap.</h1>
            </div>
            
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all ${isSidebarCollapsed ? "mx-auto" : ""}`}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-1.5 mt-2 overflow-y-auto overflow-x-hidden">
            {[
              { icon: Activity, label: "Overview", active: true },
              { icon: Layers, label: "Transaksi" },
              { icon: CreditCard, label: "Sumber Dana" },
              { icon: Search, label: "AI Insights" },
              { icon: Settings, label: "Pengaturan" },
            ].map((item, index) => (
              <div key={index} className="relative group">
                <button 
                  className={`w-full flex items-center p-3 rounded-2xl transition-all duration-200 ${
                    item.active 
                      ? "bg-[#18181B] border border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                      : "border border-transparent hover:bg-white/[0.03]"
                  }`}
                >
                  <div className={`shrink-0 flex items-center justify-center transition-colors ${
                    item.active ? "text-blue-500" : "text-zinc-500 group-hover:text-zinc-300"
                  } ${isSidebarCollapsed ? "mx-auto" : ""}`}>
                    <item.icon size={20} strokeWidth={item.active ? 2.5 : 2} />
                  </div>
                  
                  <span className={`ml-3 text-sm transition-all duration-300 whitespace-nowrap overflow-hidden ${
                    item.active ? "font-semibold text-white" : "font-medium text-zinc-400 group-hover:text-zinc-200"
                  } ${isSidebarCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"}`}>
                    {item.label}
                  </span>
                </button>
              </div>
            ))}
          </nav>

          <div className="p-3 shrink-0 mb-2 border-t border-white/5 mt-2">
            <button className="w-full flex items-center p-2 rounded-2xl hover:bg-white/[0.03] transition-all group">
              <div className={`w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-white font-medium shrink-0 ${isSidebarCollapsed ? "mx-auto" : ""}`}>
                Y
              </div>
              <div className={`ml-3 text-left transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarCollapsed ? "opacity-0 w-0 ml-0" : "opacity-100"}`}>
                <p className="text-sm font-bold text-white">Yap Account</p>
                <p className="text-xs text-zinc-500">Free Plan</p>
              </div>
              {!isSidebarCollapsed && (
                <LogOut size={16} className="ml-auto text-zinc-600 group-hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" />
              )}
            </button>
          </div>
        </aside>

        <main className="flex-1 relative bg-[#0E0E12] border border-white/10 rounded-[28px] overflow-y-auto shadow-2xl z-10 flex flex-col">
          <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none z-0 rounded-t-[28px]"></div>

          <div className="p-8 lg:p-12 max-w-[1400px] mx-auto w-full min-h-full flex flex-col space-y-8 relative z-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Financial Overview</h2>
                <div className="flex gap-3 mt-1 items-center">
                  <p className="text-sm font-medium text-zinc-400 capitalize">{monthName}</p>
                </div>
              </div>

              <div className="flex gap-4 items-center w-full lg:w-auto">
                <div className="relative w-full lg:w-[350px]">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Sparkles size={18} className="text-blue-500" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Tanya AI: Berapa pengeluaran?" 
                    className="w-full bg-[#18181B] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.03] transition-all"
                  />
                </div>
                
                <button 
                  onClick={handleSync}
                  disabled={syncing}
                  className="bg-[#18181B] border border-white/5 hover:border-blue-500/30 rounded-2xl p-3 text-zinc-400 hover:text-white transition-all flex items-center justify-center shrink-0 group relative"
                  title="Sync Emails"
                >
                  <RefreshCw size={20} className={syncing ? "animate-spin text-blue-500" : "group-hover:text-blue-400"} />
                  {syncStatus && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-zinc-400 bg-[#0E0E12] border border-white/10 px-2 py-1 rounded-md">
                      {syncStatus}
                    </div>
                  )}
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#18181B] border border-white/5 rounded-3xl p-6 lg:p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
                    <Activity size={20} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Pengeluaran</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-zinc-500">Rp</span>
                    <h3 className="text-4xl font-bold text-white tracking-tight">{formatIDR(monthTotalDebit)}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-[#18181B] border border-white/5 rounded-3xl p-6 lg:p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
                    <Wallet size={20} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Pemasukkan</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-zinc-500">Rp</span>
                    <h3 className="text-4xl font-bold text-white tracking-tight">{formatIDR(monthTotalCredit)}</h3>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 border border-blue-400/20 rounded-3xl p-6 lg:p-8 flex flex-col items-center justify-center text-white transition-all group shadow-[0_0_30px_rgba(37,99,235,0.15)] hover:shadow-[0_0_40px_rgba(37,99,235,0.3)]"
              >
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus size={28} />
                </div>
                <span className="font-bold text-xl">Catat Manual</span>
                <span className="text-sm text-blue-200 mt-1 font-medium">Input Cepat Transaksi</span>
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
              <div className="xl:col-span-2 bg-[#18181B] border border-white/5 rounded-3xl p-6 lg:p-8 flex flex-col">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-bold text-white">Aktivitas Terkini</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {initialTransactions.length === 0 && (
                    <div className="text-zinc-500 text-center py-6">Belum ada transaksi</div>
                  )}
                  {initialTransactions.map((trx) => {
                    const IconComp = getCategoryIcon(trx.category);
                    const tDate = formatDate(trx.transaction_date);
                    return (
                    <div key={trx.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#0E0E12] border border-white/5 flex items-center justify-center text-zinc-400">
                          <IconComp size={20} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors uppercase">{trx.merchant_name || "TRANSAKSI"}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-zinc-500 font-medium">{tDate}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{trx.source || "MANUAL"}</span>
                            {trx.entry_method === "AUTO_EMAIL" && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                  <Sparkles size={10} /> Auto
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-bold text-base ${trx.type === "DEBIT" ? "text-white" : "text-emerald-400"}`}>
                          {trx.type === "DEBIT" ? "-" : "+"} {formatIDR(trx.amount)}
                        </p>
                      </div>
                    </div>
                  )})}
                </div>
              </div>

              <div className="xl:col-span-1 bg-[#18181B] border border-white/5 rounded-3xl p-6 lg:p-8 flex flex-col">
                 <h3 className="text-lg font-bold text-white mb-8">Breakdown Kategori</h3>
                 
                 <div className="space-y-6">
                   {mappedCategoryStats.length === 0 && (
                     <div className="text-zinc-500 text-center w-full mt-4 text-sm">Belum ada data</div>
                   )}
                   {mappedCategoryStats.map((cat, i) => (
                     <div key={i} className="flex flex-col">
                       <div className="flex justify-between items-end mb-3">
                         <span className="text-sm font-medium text-zinc-400">{cat.name}</span>
                         <span className="text-sm font-bold text-white">{cat.percentage}%</span>
                       </div>
                       <div className="h-2 w-full bg-[#0E0E12] rounded-full overflow-hidden">
                         <div className={`h-full ${cat.color} rounded-full`} style={{width: `${cat.percentage}%`}}></div>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => router.refresh()} 
      />
    </>
  );
}
