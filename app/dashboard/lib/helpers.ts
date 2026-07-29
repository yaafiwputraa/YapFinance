import { Coffee, Car, ShoppingCart, Zap, Dumbbell, Gamepad2, ArrowLeftRight, Wallet, Landmark, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Constants ─────────────────────────────────────────────── */

export const COLORS = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-zinc-500",
  "bg-emerald-500",
  "bg-rose-500",
];

export { CATEGORIES, isCategory } from "@/lib/categories";
export type { Category } from "@/lib/categories";

export const SOURCES = [
  { value: "CASH", label: "Uang Tunai" },
  { value: "GOPAY", label: "GoPay" },
  { value: "BLU", label: "Blu" },
];

/* ── Formatters ────────────────────────────────────────────── */

export const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

export function formatDate(s?: string | null): string {
  if (!s) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(s));
  } catch {
    return "-";
  }
}

/* ── Date helpers ─────────────────────────────────────────── */

export function toYYYYMM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(+y, +m - 1));
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  return toYYYYMM(new Date(y, m - 1 + delta, 1));
}

/* ── Category → icon mapping ─────────────────────────────── */

export function getCategoryIcon(category?: string | null): LucideIcon {
  const c = (category || "").toLowerCase();
  if (c.includes("food") || c.includes("beverage") || c.includes("kopi") || c.includes("makan"))
    return Coffee;
  if (c.includes("transport") || c.includes("gojek") || c.includes("grab"))
    return Car;
  if (c.includes("shopping") || c.includes("belanja"))
    return ShoppingCart;
  if (c.includes("bills") || c.includes("utilities") || c.includes("tagihan") || c.includes("listrik") || c.includes("internet"))
    return Zap;
  if (c.includes("transfer"))
    return ArrowLeftRight;
  if (c.includes("top-up") || c.includes("topup") || c.includes("top up"))
    return Wallet;
  if (c.includes("atm") || c.includes("withdrawal") || c.includes("tarik"))
    return Landmark;
  if (c.includes("sport") || c.includes("gym") || c.includes("olahraga") || c.includes("fitness"))
    return Dumbbell;
  if (c.includes("game") || c.includes("gaming") || c.includes("steam") || c.includes("playstation"))
    return Gamepad2;
  return HelpCircle;
}
