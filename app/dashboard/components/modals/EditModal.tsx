"use client";

import { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { CATEGORIES, SOURCES } from "../../lib/helpers";
import type { Transaction } from "../../lib/types";

interface EditModalProps {
  trx: Transaction;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditModal({ trx, onClose, onSuccess }: EditModalProps) {
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
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0E0E12] border border-white/10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
          <h2 className="text-lg font-bold text-white">Edit Transaksi</h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Amount + type */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Nominal
              </label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-zinc-400 focus:outline-none cursor-pointer"
              >
                <option value="DEBIT">Pengeluaran</option>
                <option value="KREDIT">Pemasukan</option>
              </select>
            </div>
            <div className="flex items-center border-b-2 border-zinc-800 focus-within:border-blue-500 transition-colors pb-2">
              <span className="text-xl font-bold text-zinc-500 mr-2">Rp</span>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className="flex-1 bg-transparent text-2xl font-bold text-white focus:outline-none min-w-0"
              />
            </div>
          </div>

          {/* Merchant */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
              Merchant
            </label>
            <input
              type="text"
              value={form.merchant_name}
              onChange={(e) => set("merchant_name", e.target.value)}
              className="w-full bg-[#18181B] border border-white/5 focus:border-blue-500/50 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none transition-all"
            />
          </div>

          {/* Category + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
                Kategori
              </label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full bg-[#18181B] border border-white/5 rounded-xl px-3 py-3 text-sm font-medium text-white appearance-none focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">
                Sumber
              </label>
              <select
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                className="w-full bg-[#18181B] border border-white/5 rounded-xl px-3 py-3 text-sm font-medium text-white appearance-none focus:outline-none cursor-pointer"
              >
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={loading || !form.amount}
            className="w-full bg-white hover:bg-zinc-100 text-black py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <><Check size={16} /> Simpan Perubahan</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
