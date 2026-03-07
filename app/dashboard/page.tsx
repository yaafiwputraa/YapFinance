import { createClient } from "@/lib/supabase/server";
import ClientDashboard from "./ClientDashboard";

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
      const cat = tx.category ?? "Lainnya";
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Number(tx.amount);     
    }
  }
  
  // Total spending this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();                                                                                
  const monthTotalDebit = (transactions ?? [])
    .filter((tx) => tx.type === "DEBIT" && tx.transaction_date >= monthStart)   
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
  const monthTotalCredit = (transactions ?? [])
    .filter((tx) => tx.type === "KREDIT" && tx.transaction_date >= monthStart)   
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const chartData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]) // highest first
    .map(([name, total]) => ({    
      name,
      amount: total,
      percentage: monthTotalDebit > 0 ? Math.round((total / monthTotalDebit) * 100) : 0
  }));

  return (
    <ClientDashboard 
      initialTransactions={transactions || []} 
      monthTotalDebit={monthTotalDebit}
      monthTotalCredit={monthTotalCredit}
      categoryTotals={chartData}
    />
  );
}
