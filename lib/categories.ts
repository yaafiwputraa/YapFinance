/**
 * Single source of truth untuk kategori transaksi.
 *
 * Dipakai oleh system prompt parser AI (lib/ai.ts), form entri manual, dan
 * filter kategori di dashboard. Sebelum file ini ada, daftarnya diduplikasi di
 * tiga tempat dan versi di prompt AI sudah drift — "Sports" dan "Game" hilang,
 * sehingga sync otomatis tidak pernah bisa menghasilkan kedua kategori itu.
 *
 * File ini sengaja tidak mengimpor apa pun: ia dipakai dari Client Component
 * maupun dari route handler serverless.
 */
export const CATEGORIES = [
  "Food & Beverage",
  "Transportation",
  "Shopping",
  "Bills & Utilities",
  "Transfer",
  "Top-up",
  "ATM Withdrawal",
  "Sports",
  "Game",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** `as const` bikin CATEGORIES jadi tuple literal, jadi .includes() tidak bisa
 *  menerima string biasa. Guard ini melebarkan tipenya di satu tempat saja. */
export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
