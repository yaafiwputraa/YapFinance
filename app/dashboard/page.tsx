import { createClient } from "@/lib/supabase/server";
import ClientDashboard from "./ClientDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .limit(500);

  return <ClientDashboard initialTransactions={transactions ?? []} />;
}
