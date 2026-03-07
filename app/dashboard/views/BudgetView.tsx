import React from "react";
import { Check } from "lucide-react";
import { formatIDR, getCategoryIcon } from "../lib/helpers";
import type { CategoryStat } from "../lib/types";

interface BudgetViewProps {
  allCategories: string[];
  categoryStats: CategoryStat[];
  budgets: Record<string, number>;
  budgetInputs: Record<string, string>;
  setBudgetInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saveBudget: (category: string) => void;
}

export function BudgetView({
  allCategories, categoryStats, budgets, budgetInputs, setBudgetInputs, saveBudget,
}: BudgetViewProps) {
  return (
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
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 shrink-0">
                  {React.createElement(getCategoryIcon(cat), { size: 14 })}
                </div>
                <p className="text-sm font-bold text-white truncate">{cat}</p>
              </div>

              {/* Progress */}
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

              {/* Input */}
              <div className="flex items-center gap-2">
                <div className="flex items-center flex-1 bg-[#0E0E12] border border-white/5 focus-within:border-blue-500/50 rounded-xl px-3 py-2 transition-all">
                  <span className="text-xs text-zinc-500 mr-1 shrink-0">Rp</span>
                  <input
                    type="number"
                    placeholder="0 = tidak ada limit"
                    value={budgetInputs[cat] ?? (budget > 0 ? String(budget) : "")}
                    onChange={(e) =>
                      setBudgetInputs((p) => ({ ...p, [cat]: e.target.value }))
                    }
                    className="flex-1 bg-transparent text-xs font-medium text-white focus:outline-none placeholder:text-zinc-700 min-w-0"
                  />
                </div>
                <button
                  onClick={() => saveBudget(cat)}
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all shrink-0"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
