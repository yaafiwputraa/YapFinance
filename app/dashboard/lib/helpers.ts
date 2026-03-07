import { Coffee, Car, ShoppingCart, Zap } from "lucide-react";
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

export const CATEGORIES = [
  "Food & Beverage",
  "Transportasi",
  "Belanja",
  "Tagihan",
  "Lainnya",
];

export const SOURCES = [
  { value: "CASH", label: "Uang Tunai" },
  { value: "GOPAY", label: "GoPay" },
  { value: "BLU", label: "Blu" },
];

/* ── Font / global CSS injection ──────────────────────────── */

export const fontStyles = `
  @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
  :root { --font-jakarta: "Plus Jakarta Sans", sans-serif; }
  body { font-family: var(--font-jakarta); background-color: #000000; color: #FAFAFA; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: transparent; border-radius: 10px; }
  *:hover::-webkit-scrollbar-thumb { background: #27272A; }
  ::-webkit-scrollbar-thumb:hover { background: #3F3F46; }
`;

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
  if (c.includes("belanja") || c.includes("shopping"))
    return ShoppingCart;
  if (c.includes("tagihan") || c.includes("listrik") || c.includes("pln") || c.includes("internet"))
    return Zap;
  return Zap;
}
