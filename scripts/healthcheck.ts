/**
 * Health check end-to-end: env, Supabase, Gmail, provider AI.
 * Jalankan: npx tsx --env-file=.env.local scripts/healthcheck.ts
 *
 * Read-only: tidak menulis apa pun ke Supabase maupun Gmail.
 */
import { createClient } from "@/lib/supabase/server";
import { getGmailClient, extractTextBody } from "@/lib/gmail";
import { parseEmailWithAI } from "@/lib/ai";

const ok = (m: string) => console.log(`  PASS  ${m}`);
const bad = (m: string) => {
  console.log(`  FAIL  ${m}`);
  process.exitCode = 1;
};
const warn = (m: string) => console.log(`  WARN  ${m}`);
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ── 1. Env ──────────────────────────────────────────────────────────────────
console.log("\n== 1. Environment variables ==");
const REQUIRED = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_REFRESH_TOKEN",
  "CRON_SECRET",
  "NEXT_PUBLIC_CRON_SECRET",
];
for (const k of REQUIRED) {
  const v = process.env[k]?.trim();
  if (!v) bad(`${k} kosong / tidak di-set`);
  else ok(`${k} terisi (${v.length} char)`);
}
const aiKey = process.env.AI_API_KEY?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
if (!aiKey) bad("AI_API_KEY / DEEPSEEK_API_KEY dua-duanya kosong");
else ok(`API key AI terisi (${aiKey.length} char)`);

console.log(`  INFO  AI_BASE_URL = ${process.env.AI_BASE_URL?.trim() || "(default https://api.deepseek.com)"}`);
console.log(`  INFO  AI_MODEL    = ${process.env.AI_MODEL?.trim() || "(default deepseek-chat)"}`);
if (process.env.CRON_SECRET?.trim() !== process.env.NEXT_PUBLIC_CRON_SECRET?.trim())
  bad("CRON_SECRET != NEXT_PUBLIC_CRON_SECRET — tombol sync manual akan kena 401");
else ok("CRON_SECRET cocok dengan NEXT_PUBLIC_CRON_SECRET");

// ── 2. Supabase ─────────────────────────────────────────────────────────────
console.log("\n== 2. Supabase ==");
let dbUp = false;
try {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  dbUp = true;
  ok(`koneksi berhasil, tabel "transactions" berisi ${count} baris`);

  const { data: sample, error: sampleErr } = await supabase
    .from("transactions")
    .select("*")
    .order("transaction_date", { ascending: false })
    .limit(1);
  if (sampleErr) throw new Error(sampleErr.message);

  if (!sample?.length) {
    warn("tabel masih kosong — kolom tidak bisa diverifikasi dari data");
  } else {
    const NEEDED = [
      "transaction_date", "amount", "type", "source", "merchant_name",
      "category", "entry_method", "message_id", "raw_snippet",
    ];
    const cols = Object.keys(sample[0]);
    const missing = NEEDED.filter((c) => !cols.includes(c));
    if (missing.length) bad(`kolom hilang di tabel: ${missing.join(", ")}`);
    else ok(`semua kolom yang dipakai cron tersedia (${cols.length} kolom total)`);
    const last = sample[0] as Record<string, unknown>;
    console.log(`  INFO  transaksi terbaru: ${last.transaction_date} | ${last.merchant_name} | ${last.type} ${last.amount} | ${last.entry_method}`);
  }
} catch (e) {
  bad(`Supabase: ${msg(e)}`);
}

// ── 3. Gmail ────────────────────────────────────────────────────────────────
console.log("\n== 3. Gmail API ==");
const GMAIL_QUERY = "from:receipts@blubybcadigital.id";
let emailBody = "";
let sampleId = "";
try {
  const gmail = getGmailClient();
  const profile = await gmail.users.getProfile({ userId: "me" });
  ok(`OAuth refresh token valid — akun ${profile.data.emailAddress}`);

  const list = await gmail.users.messages.list({
    userId: "me",
    q: GMAIL_QUERY,
    maxResults: 50,
  });
  const found = list.data.messages ?? [];
  if (!found.length) {
    warn(`query "${GMAIL_QUERY}" tidak menemukan email apa pun`);
  } else {
    ok(`query "${GMAIL_QUERY}" menemukan ${found.length} email`);
    sampleId = found[0].id!;
    const full = await gmail.users.messages.get({ userId: "me", id: sampleId, format: "full" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emailBody = extractTextBody((full.data.payload ?? {}) as any);
    if (!emailBody) bad(`extractTextBody menghasilkan body kosong untuk ${sampleId}`);
    else ok(`body email terekstrak (${emailBody.length} char) dari ${sampleId}`);
  }
} catch (e) {
  bad(`Gmail: ${msg(e)}`);
}

// ── 4. AI provider, pakai email asli ────────────────────────────────────────
console.log("\n== 4. Provider AI (dry run, tidak insert) ==");
const body = emailBody || `Halo Nasabah,
Transaksi Anda telah berhasil.
Tanggal: 05 Maret 2026 14:30 WIB
Jenis: Pembayaran QRIS
Merchant: KOPI KENANGAN GRAND INDONESIA
Nominal: Rp50.000,00
Terima kasih telah menggunakan blu.`;
if (!emailBody) warn("tidak ada email asli — memakai sample sintetis");
try {
  const t0 = Date.now();
  const parsed = await parseEmailWithAI(body);
  ok(`parse berhasil dalam ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  INFO  hasil: ${JSON.stringify(parsed)}`);
} catch (e) {
  bad(`AI: ${msg(e)}`);
}

// ── 4b. Mailbox cocok dengan data lama? ─────────────────────────────────────
console.log("\n== 4b. Kecocokan mailbox (deteksi risiko duplikat) ==");
if (dbUp) {
  try {
    const supabase = createClient();
    const { data: rows } = await supabase
      .from("transactions")
      .select("message_id")
      .eq("entry_method", "AUTO_EMAIL")
      .not("message_id", "is", null)
      .limit(3);
    const ids = (rows ?? []).map((r) => r.message_id as string);
    if (!ids.length) {
      warn("belum ada baris AUTO_EMAIL — tidak ada yang bisa dicocokkan");
    } else {
      const gmail = getGmailClient();
      let hit = 0;
      for (const id of ids) {
        try {
          await gmail.users.messages.get({ userId: "me", id, format: "minimal" });
          hit++;
        } catch { /* 404 = bukan dari mailbox ini */ }
      }
      if (hit === ids.length)
        ok(`${hit}/${ids.length} message_id lama ada di inbox ini — mailbox sama, dedup aman`);
      else if (hit === 0)
        bad(`0/${ids.length} message_id lama ditemukan — MAILBOX BEDA, sync akan bikin duplikat`);
      else
        warn(`${hit}/${ids.length} cocok — sebagian email lama sudah dihapus dari inbox`);
    }
  } catch (e) {
    warn(`cek mailbox gagal: ${msg(e)}`);
  }
} else {
  warn("dilewati — Supabase harus hidup");
}

// ── 5. Dedup ────────────────────────────────────────────────────────────────
console.log("\n== 5. Dedup cron ==");
if (dbUp && sampleId) {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("transactions")
      .select("id")
      .eq("message_id", sampleId)
      .single();
    ok(data
      ? `email ${sampleId} sudah ada di DB — cron akan skip (dedup jalan)`
      : `email ${sampleId} belum ada di DB — cron akan memprosesnya`);
  } catch (e) {
    warn(`cek dedup gagal: ${msg(e)}`);
  }
} else {
  warn("dilewati — perlu Supabase dan Gmail dua-duanya hidup");
}

console.log(`\nSelesai. Exit code ${process.exitCode ?? 0}\n`);
