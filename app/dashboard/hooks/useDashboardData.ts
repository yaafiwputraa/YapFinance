import { useMemo } from "react";
import type {
  Transaction, ViewType, CategoryStat, SourceStat,
  MonthlyTrendItem, MerchantStat, DayOfWeekStat,
} from "../lib/types";
import { COLORS, toYYYYMM, monthLabel, shiftMonth } from "../lib/helpers";

interface Params {
  initialTransactions: Transaction[];
  selectedMonth: string;
  searchQuery: string;
  activeView: ViewType;
  budgets: Record<string, number>;
}

interface DashboardData {
  monthTrx: Transaction[];
  monthDebit: number;
  monthCredit: number;
  categoryStats: CategoryStat[];
  allCategories: string[];
  sourceStats: SourceStat[];
  monthlyTrend: MonthlyTrendItem[];
  avgDailySpend: number;
  dayOfWeekStats: DayOfWeekStat[];
  topMerchants: MerchantStat[];
  filteredTrx: Transaction[];
  chartData: { day: number; amount: number }[];
}

export function useDashboardData({
  initialTransactions,
  selectedMonth,
  searchQuery,
  activeView,
  budgets,
}: Params): DashboardData {
  const today = new Date();

  const monthTrx = useMemo(
    () => initialTransactions.filter((t) => t.transaction_date?.startsWith(selectedMonth)),
    [initialTransactions, selectedMonth]
  );

  const monthDebit = useMemo(
    () => monthTrx.filter((t) => t.type === "DEBIT").reduce((s, t) => s + Number(t.amount), 0),
    [monthTrx]
  );

  const monthCredit = useMemo(
    () => monthTrx.filter((t) => t.type === "KREDIT").reduce((s, t) => s + Number(t.amount), 0),
    [monthTrx]
  );

  const categoryStats = useMemo((): CategoryStat[] => {
    const map: Record<string, number> = {};
    monthTrx.filter((t) => t.type === "DEBIT").forEach((t) => {
      const k = t.category || "Lainnya";
      map[k] = (map[k] || 0) + Number(t.amount);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount], i) => ({
        name,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: COLORS[i % COLORS.length],
        budget: budgets[name] ?? 0,
      }));
  }, [monthTrx, budgets]);

  const allCategories = useMemo(() => {
    const cats = new Set(["Food & Beverage", "Transportasi", "Belanja", "Tagihan", "Lainnya"]);
    initialTransactions.forEach((t) => cats.add(t.category || "Lainnya"));
    return Array.from(cats);
  }, [initialTransactions]);

  const sourceStats = useMemo((): SourceStat[] => {
    const map: Record<string, { debit: number; credit: number; count: number }> = {};
    initialTransactions.forEach((t) => {
      const k = t.source || "MANUAL";
      if (!map[k]) map[k] = { debit: 0, credit: 0, count: 0 };
      if (t.type === "DEBIT") map[k].debit += Number(t.amount);
      else map[k].credit += Number(t.amount);
      map[k].count++;
    });
    return Object.entries(map)
      .sort((a, b) => (b[1].debit + b[1].credit) - (a[1].debit + a[1].credit))
      .map(([name, v]) => ({ name, ...v }));
  }, [initialTransactions]);

  const monthlyTrend = useMemo((): MonthlyTrendItem[] => {
    return Array.from({ length: 12 }, (_, i) => {
      const ym = shiftMonth(toYYYYMM(today), -(11 - i));
      const trxs = initialTransactions.filter((t) => t.transaction_date?.startsWith(ym));
      const debit = trxs
        .filter((t) => t.type === "DEBIT")
        .reduce((s, t) => s + Number(t.amount), 0);
      return { ym, label: monthLabel(ym), debit };
    });
  }, [initialTransactions]);

  const avgDailySpend = useMemo(() => {
    if (monthDebit === 0) return 0;
    const [yr, mo] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const currentDay = selectedMonth === toYYYYMM(today) ? today.getDate() : daysInMonth;
    return Math.round(monthDebit / currentDay);
  }, [monthDebit, selectedMonth]);

  const dayOfWeekStats = useMemo(() => {
    const labels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const totals = Array(7).fill(0) as number[];
    monthTrx
      .filter((t) => t.type === "DEBIT" && t.transaction_date)
      .forEach((t) => {
        const dow = new Date(t.transaction_date!).getDay();
        totals[dow] += Number(t.amount);
      });
    return labels.map((label, i) => ({ label, total: totals[i] }));
  }, [monthTrx]);

  const topMerchants = useMemo((): MerchantStat[] => {
    const map: Record<string, number> = {};
    monthTrx.filter((t) => t.type === "DEBIT").forEach((t) => {
      const k = t.merchant_name || "Tanpa Nama";
      map[k] = (map[k] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));
  }, [monthTrx]);

  const filteredTrx = useMemo(() => {
    const base = activeView === "transactions" ? initialTransactions : monthTrx;
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(
      (t) =>
        (t.merchant_name || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q) ||
        (t.source || "").toLowerCase().includes(q)
    );
  }, [monthTrx, initialTransactions, searchQuery, activeView]);

  const chartData = useMemo(() => {
    const [yr, mo] = selectedMonth.split("-").map(Number);
    const days = new Date(yr, mo, 0).getDate();
    const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, amount: 0 }));
    monthTrx
      .filter((t) => t.type === "DEBIT" && t.transaction_date)
      .forEach((t) => {
        const d = new Date(t.transaction_date!).getDate();
        if (d >= 1 && d <= days) daily[d - 1].amount += Number(t.amount);
      });
    return daily;
  }, [monthTrx, selectedMonth]);

  return {
    monthTrx, monthDebit, monthCredit,
    categoryStats, allCategories, sourceStats,
    monthlyTrend, avgDailySpend, dayOfWeekStats,
    topMerchants, filteredTrx, chartData,
  };
}
