import type { LucideIcon } from "lucide-react";

export type ViewType = "overview" | "transactions" | "analytics" | "budget";

export interface Transaction {
  id: string;
  amount: number | string;
  merchant_name?: string | null;
  category?: string | null;
  source?: string | null;
  type: "DEBIT" | "KREDIT";
  transaction_date?: string | null;
  entry_method?: string | null;
}

export interface CategoryStat {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  budget: number;
}


export interface MonthlyTrendItem {
  ym: string;
  label: string;
  debit: number;
  credit: number;
}

export interface YearlyTrendItem {
  year: number;
  label: string;
  debit: number;
  credit: number;
}

export interface WeeklyTrendItem {
  week: number;
  label: string;
  debit: number;
  credit: number;
}

export interface MerchantStat {
  name: string;
  amount: number;
}

export interface DayOfWeekStat {
  label: string;
  total: number;
  count: number;
  avg: number;
}

export interface NavItem {
  icon: LucideIcon;
  label: string;
  view: ViewType;
}
