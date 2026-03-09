import { Layers } from "lucide-react";
import type { Transaction } from "../lib/types";
import { TrxRow } from "../components/TrxRow";

interface TransactionsViewProps {
  filteredTrx: Transaction[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  availableCategories: string[];
  onEdit: (trx: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function TransactionsView({
  filteredTrx, searchQuery, setSearchQuery,
  selectedCategory, setSelectedCategory, availableCategories,
  onEdit, onDelete, deletingId,
}: TransactionsViewProps) {
  const hasFilter = !!searchQuery || !!selectedCategory;

  return (
    <div className="bg-[#18181B] border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">
          {selectedCategory || searchQuery
            ? selectedCategory || `"${searchQuery}"`
            : "Semua Transaksi"}
          <span className="ml-2 text-[10px] font-normal text-zinc-500">
            ({filteredTrx.length})
          </span>
        </h3>
        {hasFilter && (
          <button
            onClick={() => { setSearchQuery(""); setSelectedCategory(""); }}
            className="text-[10px] text-zinc-500 hover:text-white"
          >
            Reset
          </button>
        )}
      </div>

      {/* Category chips */}
      {availableCategories.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-4">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                selectedCategory === cat
                  ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto">
        {filteredTrx.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-zinc-600">
            <Layers size={36} className="opacity-20" />
            <p className="text-xs">
              {hasFilter ? "Tidak ada yang cocok" : "Belum ada transaksi"}
            </p>
          </div>
        ) : (
          filteredTrx.map((trx) => (
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
  );
}
