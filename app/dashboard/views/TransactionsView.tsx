import { Layers } from "lucide-react";
import type { Transaction } from "../lib/types";
import { TrxRow } from "../components/TrxRow";

interface TransactionsViewProps {
  filteredTrx: Transaction[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onEdit: (trx: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function TransactionsView({
  filteredTrx, searchQuery, setSearchQuery,
  onEdit, onDelete, deletingId,
}: TransactionsViewProps) {
  return (
    <div className="bg-[#18181B] border border-white/5 rounded-3xl p-5 sm:p-6 flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">
          {searchQuery ? `"${searchQuery}"` : "Semua Transaksi"}
          <span className="ml-2 text-[10px] font-normal text-zinc-500">
            ({filteredTrx.length})
          </span>
        </h3>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-[10px] text-zinc-500 hover:text-white"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {filteredTrx.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-zinc-600">
            <Layers size={36} className="opacity-20" />
            <p className="text-xs">
              {searchQuery ? "Tidak ada yang cocok" : "Belum ada transaksi"}
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
