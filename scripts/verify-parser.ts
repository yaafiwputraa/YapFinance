/**
 * Harness verifikasi untuk parser AI.
 * Jalankan: npm run verify:parser
 *
 * Proyek ini tidak punya test framework; file ini adalah pengganti yang
 * disengaja. Ia juga berguna untuk membandingkan model: ubah AI_MODEL di
 * .env.local lalu jalankan ulang.
 */
import assert from "node:assert/strict";
import {
  normalizeAmount,
  parseEmailWithAI,
  ParsedTransactionSchema,
} from "@/lib/ai";

let passed = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${label}`);
  } catch (err) {
    console.error(`FAIL  ${label}`);
    console.error(`      ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}

console.log("\n== normalizeAmount ==");
check("angka lewat apa adanya", () => assert.equal(normalizeAmount(50000), 50000));
check("angka negatif tidak dibalik diam-diam", () =>
  assert.equal(normalizeAmount(-50000), -50000));
check("string polos", () => assert.equal(normalizeAmount("50000"), 50000));
check("titik ribuan", () => assert.equal(normalizeAmount("50.000"), 50000));
check("titik desimal gaya Inggris tidak digelembungkan", () =>
  assert.equal(normalizeAmount("50000.00"), 50000));
check("format rupiah penuh", () => assert.equal(normalizeAmount("Rp50.000,00"), 50000));
check("spasi dan prefix", () => assert.equal(normalizeAmount("Rp 1.250.000,50"), 1250000.5));
check("koma ribuan gaya Inggris", () =>
  assert.equal(normalizeAmount("1,234,567"), 1234567));
check("titik ribuan + koma desimal", () =>
  assert.equal(normalizeAmount("1.234.567,89"), 1234567.89));
check("koma ribuan + titik desimal", () =>
  assert.equal(normalizeAmount("1,234,567.89"), 1234567.89));
check("pemisah tunggal + 3 digit dibaca ribuan", () =>
  assert.equal(normalizeAmount("1,500"), 1500));
check("pemisah tunggal + bukan 3 digit dibaca desimal", () =>
  assert.equal(normalizeAmount("1,5"), 1.5));
check("tanda minus dipertahankan", () =>
  assert.equal(normalizeAmount("-50000"), -50000));
check("notasi eksponen jadi NaN", () =>
  assert.ok(Number.isNaN(normalizeAmount("1e5"))));
check("sampah jadi NaN", () => assert.ok(Number.isNaN(normalizeAmount("abc"))));
check("string kosong jadi NaN", () => assert.ok(Number.isNaN(normalizeAmount(""))));

console.log("\n== ParsedTransactionSchema ==");
const base = {
  date: "2026-03-05T14:30:00+07:00",
  amount: 50000,
  type: "DEBIT",
  merchant: "Kopi Kenangan",
  category: "Food & Beverage",
};

check("objek valid lolos", () => {
  const r = ParsedTransactionSchema.parse(base);
  assert.equal(r.amount, 50000);
  assert.equal(r.category, "Food & Beverage");
});

check("amount format rupiah dinormalisasi", () => {
  const r = ParsedTransactionSchema.parse({ ...base, amount: "Rp50.000,00" });
  assert.equal(r.amount, 50000);
});

check("type huruf kecil di-uppercase", () => {
  const r = ParsedTransactionSchema.parse({ ...base, type: "debit" });
  assert.equal(r.type, "DEBIT");
});

check("merchant di-trim", () => {
  const r = ParsedTransactionSchema.parse({ ...base, merchant: "  Kopi Kenangan  " });
  assert.equal(r.merchant, "Kopi Kenangan");
});

check("kategori karangan jatuh ke Other", () => {
  const r = ParsedTransactionSchema.parse({ ...base, category: "Kopi Susu" });
  assert.equal(r.category, "Other");
});

check("Sports diterima (regresi bug prompt)", () => {
  const r = ParsedTransactionSchema.parse({ ...base, category: "Sports" });
  assert.equal(r.category, "Sports");
});

check("Game diterima (regresi bug prompt)", () => {
  const r = ParsedTransactionSchema.parse({ ...base, category: "Game" });
  assert.equal(r.category, "Game");
});

check("date kosong dapat fallback, bukan gagal", () => {
  const r = ParsedTransactionSchema.parse({ ...base, date: "" });
  assert.ok(r.date.length > 0);
});

check("amount nol ditolak", () => {
  assert.equal(ParsedTransactionSchema.safeParse({ ...base, amount: 0 }).success, false);
});

check("amount sampah ditolak", () => {
  assert.equal(ParsedTransactionSchema.safeParse({ ...base, amount: "abc" }).success, false);
});

check("amount negatif (string) ditolak", () => {
  assert.equal(ParsedTransactionSchema.safeParse({ ...base, amount: "-50000" }).success, false);
});

check("amount negatif (number) ditolak", () => {
  assert.equal(ParsedTransactionSchema.safeParse({ ...base, amount: -50000 }).success, false);
});

check("amount notasi eksponen ditolak", () => {
  assert.equal(ParsedTransactionSchema.safeParse({ ...base, amount: "1e5" }).success, false);
});

check("merchant kosong ditolak", () => {
  assert.equal(ParsedTransactionSchema.safeParse({ ...base, merchant: "   " }).success, false);
});

check("type ngawur ditolak", () => {
  assert.equal(ParsedTransactionSchema.safeParse({ ...base, type: "REFUND" }).success, false);
});

console.log("\n== live call ke provider aktif ==");

const SAMPLE = `Halo Nasabah,
Transaksi Anda telah berhasil.
Tanggal: 05 Maret 2026 14:30 WIB
Jenis: Pembayaran QRIS
Merchant: KOPI KENANGAN GRAND INDONESIA
Nominal: Rp50.000,00
Terima kasih telah menggunakan blu.`;

try {
  const started = Date.now();
  const parsed = await parseEmailWithAI(SAMPLE);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`  provider: ${process.env.AI_BASE_URL ?? "(default DeepSeek)"}`);
  console.log(`  model:    ${process.env.AI_MODEL ?? "(default deepseek-chat)"}`);
  console.log(`  waktu:    ${elapsed}s`);
  console.log(`  hasil:    ${JSON.stringify(parsed)}`);
  check("amount terbaca 50000", () => assert.equal(parsed.amount, 50000));
  check("type DEBIT", () => assert.equal(parsed.type, "DEBIT"));
  check("merchant menyebut Kopi Kenangan", () =>
    assert.match(parsed.merchant, /kopi kenangan/i));
} catch (err) {
  console.error(`FAIL  live call: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}

console.log(`\n${passed} pemeriksaan lolos, exit code ${process.exitCode ?? 0}\n`);
