import { z } from "zod";
import { CATEGORIES } from "@/lib/categories";

/**
 * Ubah amount hasil model jadi angka.
 *
 * Model diinstruksikan mengembalikan angka polos, tapi model kecil sering
 * menyalin format dari email. Email Blu BCA memakai konvensi angka Indonesia
 * ("Rp50.000,00" = lima puluh ribu), jadi titik dibaca sebagai pemisah ribuan
 * dan koma sebagai desimal. Konsekuensinya "50.5" dibaca 505 — nominal rupiah
 * di email tersebut tidak pernah ditulis dengan desimal titik, jadi kasus itu
 * tidak muncul.
 */
export function normalizeAmount(input: unknown): number {
  if (typeof input === "number") return input;
  if (typeof input !== "string") return Number.NaN;

  let s = input.replace(/[^\d.,]/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/\./g, "");
  }
  if (s === "") return Number.NaN;
  return Number.parseFloat(s);
}

const trimIfString = (v: unknown) => (typeof v === "string" ? v.trim() : v);
const upperIfString = (v: unknown) =>
  typeof v === "string" ? v.trim().toUpperCase() : v;

export const ParsedTransactionSchema = z.object({
  /** ISO 8601. Cron memakai internalDate dari Gmail sebagai sumber otoritatif
   *  dan field ini cuma cadangan, jadi jangan sampai menggagalkan transaksi. */
  date: z
    .string()
    .trim()
    .min(1)
    .catch(() => new Date().toISOString()),
  amount: z.preprocess(normalizeAmount, z.number().finite().positive()),
  type: z.preprocess(upperIfString, z.enum(["DEBIT", "KREDIT"])),
  merchant: z.string().trim().min(1),
  category: z.preprocess(trimIfString, z.enum(CATEGORIES).catch("Other")),
});

export type ParsedTransaction = z.infer<typeof ParsedTransactionSchema>;
