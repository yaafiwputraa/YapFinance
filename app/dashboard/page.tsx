import { createClient } from "@/lib/supabase/server";
import ClientDashboard from "./ClientDashboard";
import type { Transaction } from "./lib/types";

export const dynamic = "force-dynamic";

/** Supabase memotong respons di 1000 baris apa pun nilai .limit(), jadi
 *  jumlah sebanyak ini hanya bisa diambil per halaman. */
const PAGE_SIZE = 1000;

/**
 * Ambil seluruh transaksi, bukan sepotong.
 *
 * Sebelumnya di sini ada .limit(500), yang diam-diam menyembunyikan sebagian
 * besar data begitu tabelnya tumbuh — semua agregat dashboard dihitung
 * client-side dari apa yang dikirim, jadi baris yang tidak terambil bukan
 * sekadar tak terlihat di daftar, tapi hilang dari setiap total dan grafik.
 */
async function fetchAllTransactions(
  supabase: ReturnType<typeof createClient>
): Promise<Transaction[]> {
  const all: Transaction[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    // Kembalikan yang sudah terkumpul daripada merobohkan halaman: dashboard
    // dengan data sebagian masih berguna, layar error tidak.
    if (error) {
      console.error(`[Dashboard] gagal ambil baris ${from}+: ${error.message}`);
      break;
    }

    if (!data?.length) break;
    all.push(...(data as Transaction[]));
    if (data.length < PAGE_SIZE) break;
  }

  return all;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const transactions = await fetchAllTransactions(supabase);

  return <ClientDashboard initialTransactions={transactions} />;
}
