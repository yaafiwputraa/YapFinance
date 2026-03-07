"use client";

import { Sparkles, Pencil, Trash2, Loader2 } from "lucide-react";
import { formatIDR, formatDate, getCategoryIcon } from "../lib/helpers";
import type { Transaction } from "../lib/types";

interface TrxRowProps {
  trx: Transaction;
  onEdit: (trx: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function TrxRow({ trx, onEdit, onDelete, deletingId }: TrxRowProps) {
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
          <span className="text-[10px] font-bold text-zinc-400 uppercase">
            {trx.source || "MANUAL"}
          </span>
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
        <button
          onClick={() => onEdit(trx)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-zinc-500 hover:text-blue-400 transition-all"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(trx.id)}
          disabled={deletingId === trx.id}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all"
        >
          {deletingId === trx.id ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Trash2 size={12} />
          )}
        </button>
      </div>
    </div>
  );
}
