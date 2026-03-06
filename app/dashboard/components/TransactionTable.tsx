"use client";

interface Transaction {
  id: string;
  transaction_date: string;
  amount: number;
  type: "DEBIT" | "KREDIT";
  source: string;
  merchant_name: string | null;
  category: string | null;
  entry_method: string;
}

interface Props {
  transactions: Transaction[];
}

const SOURCE_BADGE: Record<string, string> = {
  BLU: "bg-blue-500/20 text-blue-400",
  GOPAY: "bg-green-500/20 text-green-400",
  CASH: "bg-yellow-500/20 text-yellow-400",
};

const TYPE_BADGE: Record<string, string> = {
  DEBIT: "text-red-400",
  KREDIT: "text-green-400",
};

export default function TransactionTable({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        Belum ada transaksi. Tambah manual atau sync email.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
            <th className="text-left py-2 pr-4">Tanggal</th>
            <th className="text-left py-2 pr-4">Merchant</th>
            <th className="text-left py-2 pr-4">Kategori</th>
            <th className="text-left py-2 pr-4">Sumber</th>
            <th className="text-right py-2">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
            >
              <td className="py-2 pr-4 text-zinc-400">
                {new Date(tx.transaction_date).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="py-2 pr-4 font-medium">{tx.merchant_name ?? "—"}</td>
              <td className="py-2 pr-4 text-zinc-400">{tx.category ?? "—"}</td>
              <td className="py-2 pr-4">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_BADGE[tx.source] ?? "bg-zinc-700 text-zinc-300"}`}
                >
                  {tx.source}
                </span>
              </td>
              <td
                className={`py-2 text-right font-semibold tabular-nums ${TYPE_BADGE[tx.type]}`}
              >
                {tx.type === "DEBIT" ? "−" : "+"}
                Rp {Number(tx.amount).toLocaleString("id-ID")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
