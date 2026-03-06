import { createClient } from "@/lib/supabase/server";
import TransactionTable from "./components/TransactionTable";
import SpendingChart from "./components/SpendingChart";
import ManualEntryDialog from "./components/ManualEntryDialog";
import SyncButton from "./components/SyncButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: transactions = [] } = await supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .limit(200);

  // Aggregate spending by category for the chart
  const categoryTotals: Record<string, number> = {};
  for (const tx of transactions ?? []) {
    if (tx.type === "DEBIT") {
      const cat = tx.category ?? "Other";
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Number(tx.amount);
    }
  }
  const chartData = Object.entries(categoryTotals).map(([name, total]) => ({
    name,
    total,
  }));

  // Total spending this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthTotal = (transactions ?? [])
    .filter((tx) => tx.type === "DEBIT" && tx.transaction_date >= monthStart)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">💸 DeepYap</h1>
            <p className="text-zinc-400 text-sm">AI-Powered Finance Tracker</p>
          </div>
          <div className="flex gap-3">
            <SyncButton />
            <ManualEntryDialog />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Bulan Ini</p>
            <p className="text-2xl font-bold">
              Rp {monthTotal.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Total Transaksi</p>
            <p className="text-2xl font-bold">{transactions?.length ?? 0}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Auto (Email)</p>
            <p className="text-2xl font-bold">
              {transactions?.filter((t) => t.entry_method === "AUTO_EMAIL").length ?? 0}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4">Pengeluaran per Kategori</h2>
          <SpendingChart data={chartData} />
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4">Riwayat Transaksi</h2>
          <TransactionTable transactions={transactions ?? []} />
        </div>
      </div>
    </div>
  );
}
