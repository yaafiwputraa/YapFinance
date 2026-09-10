/**
 * Backfill transaksi dari Gmail ke Supabase.
 * Jalankan: npx tsx --env-file=.env.local scripts/backfill.ts
 *
 * Ada untuk kasus yang tidak bisa ditangani cron: endpoint cron mengambil 50
 * email terbaru tanpa pagination dan dibatasi maxDuration 60 detik, jadi
 * backlog berbulan-bulan tidak akan pernah terkejar dari sana. Script ini
 * berjalan lokal tanpa batas waktu dan menelusuri seluruh halaman hasil.
 *
 * Aman diulang: insert memakai upsert dengan ignoreDuplicates pada message_id,
 * jadi run yang terputus tinggal dijalankan lagi dan melanjutkan sendiri.
 */
import { createClient } from "@/lib/supabase/server";
import { getGmailClient, extractTextBody } from "@/lib/gmail";
import { parseEmailWithAI } from "@/lib/ai";

const SENDER = "receipts@blubybcadigital.id";
const CONCURRENCY = 3;
const INSERT_BATCH = 50;

/**
 * Gmail membatasi kuota per menit per user, dan messages.get memakan 5 unit.
 * Tanpa ini, backlog ratusan email menabrak limit itu dalam hitungan detik dan
 * sebagian besar request gagal. Kuota hanya transien, jadi mundur sebentar dan
 * ulangi jauh lebih benar daripada menghitung ulang seluruh batch.
 */
async function withRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /quota|rate limit|429|backend error|503/i.test(msg);
      if (!transient || attempt >= tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
}

const sb = createClient();
const gmail = getGmailClient();

// Sengaja tanpa filter tanggal. Memakai transaksi terbaru sebagai titik mulai
// terlihat lebih hemat, tapi salah: email yang gagal diproses meninggalkan
// lubang di tengah rentang, dan begitu ada satu baris yang lebih baru, seluruh
// lubang di belakangnya jadi tak terjangkau selamanya. Menelusuri semuanya lalu
// menyaring lewat dedup selalu benar, dan yang mahal (messages.get + panggilan
// AI) tetap hanya jalan untuk yang memang belum ada.
const query = `from:${SENDER}`;
console.log(`Query              : ${query}\n`);

// ── Kumpulkan seluruh id, semua halaman ─────────────────────────────────────
const ids: string[] = [];
let pageToken: string | undefined;
do {
  const res = await withRetry(() =>
    gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 500,
      pageToken,
    })
  );
  for (const m of res.data.messages ?? []) ids.push(m.id!);
  pageToken = res.data.nextPageToken ?? undefined;
} while (pageToken);

// ── Buang yang sudah ada di DB ──────────────────────────────────────────────
const existing = new Set<string>();
for (let i = 0; i < ids.length; i += 100) {
  const { data } = await sb
    .from("transactions")
    .select("message_id")
    .in("message_id", ids.slice(i, i + 100));
  for (const r of data ?? []) existing.add(r.message_id as string);
}

const todo = ids.filter((id) => !existing.has(id));
console.log(`Email cocok        : ${ids.length}`);
console.log(`Sudah ada di DB    : ${existing.size}`);
console.log(`Akan diproses      : ${todo.length}\n`);

if (!todo.length) {
  console.log("Tidak ada yang perlu dikerjakan.");
  process.exit(0);
}

type Row = Record<string, unknown>;

const failures: string[] = [];
let done = 0;
let inserted = 0;
let pending: Row[] = [];

async function flush() {
  if (!pending.length) return;
  const { error } = await sb
    .from("transactions")
    .upsert(pending, { onConflict: "message_id", ignoreDuplicates: true });
  if (error) {
    failures.push(`insert batch (${pending.length} baris): ${error.message}`);
  } else {
    inserted += pending.length;
  }
  pending = [];
}

/** Satu email → satu baris siap insert, atau null kalau gagal. */
async function build(id: string): Promise<Row | null> {
  try {
    const full = await withRetry(() =>
      gmail.users.messages.get({ userId: "me", id, format: "full" })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = extractTextBody((full.data.payload ?? {}) as any);
    if (!body) throw new Error("body kosong");

    const parsed = await parseEmailWithAI(body);

    // internalDate dari Gmail adalah sumber otoritatif, sama seperti cron.
    const gmailDate = full.data.internalDate
      ? new Date(Number(full.data.internalDate)).toISOString()
      : null;

    return {
      transaction_date: gmailDate ?? parsed.date,
      amount: parsed.amount,
      type: parsed.type,
      source: "BLU",
      merchant_name: parsed.merchant,
      category: parsed.category,
      entry_method: "AUTO_EMAIL",
      message_id: id,
      raw_snippet: full.data.snippet ?? "",
    };
  } catch (err) {
    failures.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

const started = Date.now();

for (let i = 0; i < todo.length; i += CONCURRENCY) {
  const rows = await Promise.all(todo.slice(i, i + CONCURRENCY).map(build));
  for (const row of rows) if (row) pending.push(row);
  done += rows.length;

  if (pending.length >= INSERT_BATCH) await flush();

  const elapsed = (Date.now() - started) / 1000;
  const rate = done / elapsed;
  const eta = Math.round((todo.length - done) / rate);
  console.log(
    `  ${done}/${todo.length}  ok=${inserted + pending.length}  gagal=${failures.length}  sisa ~${Math.floor(eta / 60)}m${eta % 60}s`
  );
}

await flush();

console.log(`\nSelesai dalam ${((Date.now() - started) / 60000).toFixed(1)} menit`);
console.log(`Ter-insert : ${inserted}`);
console.log(`Gagal      : ${failures.length}`);
for (const f of failures.slice(0, 20)) console.log(`  ${f}`);
if (failures.length > 20) console.log(`  ... dan ${failures.length - 20} lagi`);

const { count } = await sb
  .from("transactions")
  .select("*", { count: "exact", head: true });
console.log(`\nTotal baris di DB sekarang: ${count}`);
