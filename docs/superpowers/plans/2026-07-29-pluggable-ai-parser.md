# Pluggable AI Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bikin provider LLM untuk parser email bisa diganti lewat environment variable, supaya model self-hosted (Ollama) bisa dipakai lokal sementara Vercel tetap memakai DeepSeek.

**Architecture:** `lib/deepseek.ts` di-rename jadi `lib/ai.ts` dan membaca `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` dengan default yang mempertahankan perilaku DeepSeek sekarang. Output model dipaksa JSON lewat `response_format: {"type":"json_object"}`, lalu divalidasi dengan Zod (bukan di-cast buta seperti sekarang) dan di-retry sekali dengan pesan koreksi bila gagal. Daftar kategori dipindah ke `lib/categories.ts` sebagai satu sumber kebenaran.

**Tech Stack:** Next.js 15.2.8 (App Router), TypeScript strict, `openai` SDK v4 (dipakai untuk DeepSeek maupun Ollama lewat endpoint OpenAI-compatible), Zod v3, Ollama v0.32.1.

**Spec:** `docs/superpowers/specs/2026-07-29-pluggable-ai-parser-design.md`

## Global Constraints

- Install dependency selalu dengan `npm install --legacy-peer-deps`.
- **Tidak ada test framework di proyek ini** dan plan ini tidak menambahkannya. Verifikasi memakai `scripts/verify-parser.ts`, dijalankan lewat `npm run verify:parser`, memakai `node:assert` dari standard library. Kombinasi ini sudah diuji di mesin target dari dalam `scripts/`: alias `@/*` ter-resolve, `.env.local` termuat, `zod` dan `openai` ter-import.
- Harness ini **di-commit** dan jadi artefak permanen — tujuannya supaya model lain bisa dicoba kapan saja tanpa menulis ulang alat ujinya.
- Setiap langkah `git add` di plan ini menyebut path secara eksplisit — jangan pernah pakai `git add -A` atau `git add .`. `.env.local` berisi kredensial asli dan tidak boleh ikut ter-commit (sudah tercakup `.gitignore`; jangan diuji).
- Node v22.11.0, npm 10.9.0 di mesin target.
- Default `AI_*` wajib mempertahankan perilaku DeepSeek. Deployment Vercel yang ada tidak boleh rusak walau variabel `AI_*` tidak pernah diisi di sana.
- System prompt **wajib memuat kata "JSON"**. Mode `response_format: {"type":"json_object"}` milik DeepSeek menolak request yang prompt-nya tidak menyebut json. Jangan hapus kata itu saat mengedit prompt.
- Jangan pakai `response_format: {"type":"json_schema"}`. Ollama mendukungnya, DeepSeek tidak — memakainya memecah code path per provider.
- Branch kerja: `feat/pluggable-ai-parser` (sudah dibuat, spec sudah di-commit di sana).

## File Structure

| File | Status | Tanggung jawab |
|---|---|---|
| `lib/categories.ts` | Create | Satu sumber kebenaran daftar kategori + type guard |
| `lib/ai.ts` | Create (gantikan `lib/deepseek.ts`) | Klien LLM yang bisa dikonfigurasi, schema Zod, retry |
| `lib/deepseek.ts` | Delete | Digantikan `lib/ai.ts` |
| `app/api/cron/sync-emails/route.ts` | Modify baris 4, 81 | Ganti import + komentar |
| `app/dashboard/lib/helpers.ts` | Modify baris 15–26 | Re-export dari `lib/categories.ts` |
| `app/dashboard/components/ManualEntryDialog.tsx` | Modify baris 6–17 | Hapus array duplikat, import |
| `app/dashboard/hooks/useDashboardData.ts` | Modify baris 91 | Pakai `isCategory()` |
| `app/dashboard/components/modals/EditModal.tsx` | Modify baris 17–19 | Pakai `isCategory()` |
| `scripts/verify-parser.ts` | Create | Harness verifikasi (di-commit) |
| `package.json` | Modify | Tambah devDependency `tsx` + script `verify:parser` |
| `.env.local` | Modify | Konfigurasi Ollama lokal (tidak ter-commit, sudah di `.gitignore`) |
| `.env.local.example`, `CLAUDE.md`, `README.md`, `DEPLOYMENT.md` | Modify | Dokumentasi |

---

### Task 1: Satu sumber kebenaran untuk kategori

Saat ini daftar kategori punya tiga salinan dan yang di prompt AI sudah drift — `Sports` dan `Game` tidak pernah dikirim ke model, jadi sync otomatis tidak pernah bisa menghasilkan dua kategori itu. Task ini menyatukan sumbernya.

`lib/categories.ts` harus memakai `as const` supaya bisa dipakai `z.enum()` di Task 2. Konsekuensinya, dua pemanggilan `.includes()` yang ada sekarang akan gagal compile karena argumennya bertipe `string` sedangkan array-nya jadi tuple literal. Karena itu task ini juga menyediakan type guard `isCategory()` dan memakainya di dua tempat tersebut.

**Files:**
- Create: `lib/categories.ts`
- Modify: `app/dashboard/lib/helpers.ts:15-26`
- Modify: `app/dashboard/components/ManualEntryDialog.tsx:6-17`
- Modify: `app/dashboard/hooks/useDashboardData.ts:91`
- Modify: `app/dashboard/components/modals/EditModal.tsx:17-19`

**Interfaces:**
- Consumes: tidak ada (task pertama)
- Produces:
  - `CATEGORIES: readonly ["Food & Beverage", ..., "Other"]` — tuple literal 10 item
  - `type Category = (typeof CATEGORIES)[number]`
  - `isCategory(value: string): value is Category`

- [ ] **Step 1: Buat `lib/categories.ts`**

```ts
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
```

- [ ] **Step 2: Ganti array di `app/dashboard/lib/helpers.ts` jadi re-export**

Hapus baris 15–26 (deklarasi `export const CATEGORIES = [...]`), ganti dengan re-export. `helpers.ts` mengimpor ikon `lucide-react` di baris 1, jadi file ini **tidak boleh** dijadikan sumber kebenaran — mengimpornya dari `lib/ai.ts` akan menyeret `lucide-react` ke bundle serverless. Re-export menjaga tiga importer yang sudah ada (`useDashboardData.ts`, `AddTransactionModal.tsx`, `EditModal.tsx`) tetap jalan tanpa diubah import-nya.

```ts
export { CATEGORIES, isCategory } from "@/lib/categories";
export type { Category } from "@/lib/categories";
```

Letakkan tepat di posisi bekas array lama, di bawah blok `COLORS`.

- [ ] **Step 3: Hapus array duplikat di `ManualEntryDialog.tsx`**

Hapus baris 6–17 (`const CATEGORIES = [...]`), lalu tambahkan import di bawah baris 4:

```ts
import { CATEGORIES } from "@/lib/categories";
```

Pemakaiannya di baris 183 (`CATEGORIES.map(...)`) tidak berubah.

- [ ] **Step 4: Pakai `isCategory` di `useDashboardData.ts`**

Baris 7 — tambahkan `isCategory` ke import yang sudah ada:

```ts
import { CATEGORIES, COLORS, isCategory, toYYYYMM, monthLabel, shiftMonth } from "../lib/helpers";
```

Baris 91 — ganti:

```ts
      if (t.category && !CATEGORIES.includes(t.category)) extra.add(t.category);
```

jadi:

```ts
      if (t.category && !isCategory(t.category)) extra.add(t.category);
```

Baris 93 (`return [...CATEGORIES, ...Array.from(extra).sort()];`) tidak berubah — spread dari readonly tuple menghasilkan `string[]`, cocok dengan tipe `budgetCategories: string[]`.

- [ ] **Step 5: Pakai `isCategory` di `EditModal.tsx`**

Baris 5 — tambahkan `isCategory`:

```ts
import { CATEGORIES, isCategory, SOURCES } from "../../lib/helpers";
```

Baris 17–19 — ganti:

```ts
  const categoryOptions = CATEGORIES.includes(initialCategory)
    ? CATEGORIES
    : [initialCategory, ...CATEGORIES];
```

jadi:

```ts
  const categoryOptions: readonly string[] = isCategory(initialCategory)
    ? CATEGORIES
    : [initialCategory, ...CATEGORIES];
```

Anotasi `readonly string[]` diperlukan karena kedua cabang ternary sekarang bertipe beda (`readonly Category[]` vs `string[]`).

- [ ] **Step 6: Verifikasi tidak ada duplikat yang tersisa**

Run: `git grep -n --untracked '"Food & Beverage"' -- '*.ts' '*.tsx'`

(`ripgrep` tidak terpasang di mesin ini — pakai `git grep`. Flag `--untracked` wajib, karena `lib/categories.ts` masih untracked sampai Step 8.)

Expected: **tepat satu** hasil, yaitu `lib/categories.ts`. Kalau masih ada di `helpers.ts` atau `ManualEntryDialog.tsx`, berarti Step 2 atau 3 belum tuntas.

- [ ] **Step 7: Verifikasi typecheck dan build**

Run: `npx tsc --noEmit`
Expected: keluar tanpa error. Ini yang membuktikan `as const` tidak memecahkan pemanggilan `.includes()` di Step 4 dan 5.

Run: `npm run lint`

Expected: **tepat 2 error + 3 warning yang sudah ada sejak sebelum plan ini**, dan tidak ada tambahan. Sudah diverifikasi pada commit `9b56ad5`:

- `app/dashboard/components/charts/TrendLineChart.tsx:47` — `'chartW' is assigned a value but never used`
- `app/dashboard/views/AnalyticsView.tsx:35` — `'selectedMonth' is defined but never used`
- `app/dashboard/hooks/useDashboardData.ts:108,120,158` — warning `react-hooks/exhaustive-deps` soal `today`

Jangan perbaiki temuan-temuan itu; semuanya di luar ruang lingkup plan ini. Yang penting: tidak ada temuan **baru** di file yang kamu sentuh. Kalau ragu, bandingkan dengan `git stash push -u && npm run lint && git stash pop`.

- [ ] **Step 8: Commit**

```bash
git add lib/categories.ts app/dashboard/lib/helpers.ts app/dashboard/components/ManualEntryDialog.tsx app/dashboard/hooks/useDashboardData.ts app/dashboard/components/modals/EditModal.tsx
git commit -m "refactor: single source of truth for transaction categories"
```

---

### Task 2: Schema Zod dan normalisasi amount

Task ini murni fungsi pure — tanpa jaringan, tanpa LLM. Deliverable-nya adalah `lib/ai.ts` yang berisi schema dan normalizer, plus harness verifikasi yang membuktikan schema-nya benar. Pemanggilan LLM menyusul di Task 3.

Alasan schema ini ada: kode sekarang melakukan `JSON.parse(raw) as ParsedTransaction` tanpa pemeriksaan apa pun (`lib/deepseek.ts:56`). DeepSeek cukup patuh, tapi `llama3.2:3b` tidak akan sepatuh itu.

**Files:**
- Create: `lib/ai.ts`
- Create: `scripts/verify-parser.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `CATEGORIES` dari `lib/categories.ts` (Task 1)
- Produces:
  - `normalizeAmount(input: unknown): number`
  - `ParsedTransactionSchema` — Zod object schema
  - `type ParsedTransaction = z.infer<typeof ParsedTransactionSchema>` dengan field `date: string`, `amount: number`, `type: "DEBIT" | "KREDIT"`, `merchant: string`, `category: Category`

- [ ] **Step 0: Pasang runner TypeScript**

Proyek ini belum punya cara menjalankan `.ts` di luar Next.js.

Run: `npm install --legacy-peer-deps -D tsx@4`

Lalu tambahkan ke `"scripts"` di `package.json`, setelah baris `"lint"`:

```json
    "verify:parser": "tsx --env-file=.env.local scripts/verify-parser.ts"
```

- [ ] **Step 1: Tulis harness verifikasi yang gagal**

Buat `scripts/verify-parser.ts`:

```ts
/**
 * Harness verifikasi untuk parser AI.
 * Jalankan: npm run verify:parser
 *
 * Proyek ini tidak punya test framework; file ini adalah pengganti yang
 * disengaja. Ia juga berguna untuk membandingkan model: ubah AI_MODEL di
 * .env.local lalu jalankan ulang.
 */
import assert from "node:assert/strict";
import { normalizeAmount, ParsedTransactionSchema } from "@/lib/ai";

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
check("string polos", () => assert.equal(normalizeAmount("50000"), 50000));
check("titik ribuan", () => assert.equal(normalizeAmount("50.000"), 50000));
check("format rupiah penuh", () => assert.equal(normalizeAmount("Rp50.000,00"), 50000));
check("spasi dan prefix", () => assert.equal(normalizeAmount("Rp 1.250.000,50"), 1250000.5));
check("sampah jadi NaN", () => assert.ok(Number.isNaN(normalizeAmount("abc"))));

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

check("merchant kosong ditolak", () => {
  assert.equal(ParsedTransactionSchema.safeParse({ ...base, merchant: "   " }).success, false);
});

check("type ngawur ditolak", () => {
  assert.equal(ParsedTransactionSchema.safeParse({ ...base, type: "REFUND" }).success, false);
});

console.log(`\n${passed} pemeriksaan lolos, exit code ${process.exitCode ?? 0}\n`);
```

- [ ] **Step 2: Jalankan harness untuk memastikan GAGAL**

Run: `npm run verify:parser`
Expected: FAIL — `Cannot find module '@/lib/ai'`. Ini konfirmasi harness benar-benar mengeksekusi kode yang belum ada.

- [ ] **Step 3: Buat `lib/ai.ts` dengan normalizer dan schema**

Belum ada pemanggilan LLM di step ini — itu Task 3.

```ts
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
```

- [ ] **Step 4: Jalankan harness untuk memastikan LOLOS**

Run: `npm run verify:parser`
Expected: 18 pemeriksaan lolos, exit code 0, tidak ada baris `FAIL`.

- [ ] **Step 5: Verifikasi typecheck**

Run: `npx tsc --noEmit`
Expected: keluar tanpa error.

- [ ] **Step 6: Commit**

```bash
git add lib/ai.ts scripts/verify-parser.ts package.json package-lock.json
git commit -m "feat: add Zod validation schema for parsed transactions"
```

Run: `git status --short`
Expected: bersih di luar file untracked yang memang sudah ada sebelumnya (`.claude/`, `CLAUDE.md`). **`.env.local` tidak boleh muncul** — kalau muncul, hentikan dan periksa `.gitignore`.

---

### Task 3: Klien LLM yang bisa dikonfigurasi

**Files:**
- Modify: `lib/ai.ts` (tambahkan klien, prompt, retry)
- Delete: `lib/deepseek.ts`
- Modify: `app/api/cron/sync-emails/route.ts:4,81`
- Modify: `scripts/verify-parser.ts`
- Modify: `.env.local`

**Interfaces:**
- Consumes: `ParsedTransactionSchema`, `ParsedTransaction` (Task 2); `CATEGORIES` (Task 1)
- Produces: `parseEmailWithAI(emailBody: string): Promise<ParsedTransaction>` — nama dan signature sengaja sama persis dengan yang lama supaya route handler nyaris tidak berubah

- [ ] **Step 1: Konfigurasi Ollama di `.env.local`**

Tambahkan di akhir file (file ini sudah masuk `.gitignore` lewat pola `.env*.local`):

```
# ── AI provider (kosongkan semua untuk memakai DeepSeek) ──
AI_BASE_URL=http://localhost:11434/v1
AI_API_KEY=ollama
AI_MODEL=llama3.2:3b
```

`AI_API_KEY` wajib diisi walau Ollama tidak memeriksanya — SDK `openai` menolak API key kosong.

- [ ] **Step 2: Tambahkan pemeriksaan live ke harness**

Tambahkan di `scripts/verify-parser.ts`, sebelum baris ringkasan `console.log` di paling bawah:

```ts
console.log("\n== live call ke provider aktif ==");
const { parseEmailWithAI } = await import("@/lib/ai");

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
```

Karena memakai top-level `await`, pastikan tidak ada yang mengubah file jadi CommonJS.

- [ ] **Step 3: Jalankan harness untuk memastikan bagian live GAGAL**

Run: `npm run verify:parser`
Expected: pemeriksaan schema tetap lolos, bagian live FAIL dengan `parseEmailWithAI is not a function` atau error export. Konfirmasi bahwa fungsinya memang belum ada.

- [ ] **Step 4: Tambahkan klien, prompt, dan retry ke `lib/ai.ts`**

Sisipkan `import OpenAI from "openai";` di baris paling atas, lalu tambahkan blok berikut di bawah kode Task 2:

```ts
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

/** Env var yang di-set tapi kosong dianggap tidak di-set. */
function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function getClient() {
  return new OpenAI({
    apiKey: env("AI_API_KEY") ?? env("DEEPSEEK_API_KEY") ?? "",
    baseURL: env("AI_BASE_URL") ?? DEFAULT_BASE_URL,
  });
}

/**
 * Kata "JSON" di bawah wajib ada: mode response_format json_object milik
 * DeepSeek menolak request yang prompt-nya tidak menyebut json.
 */
const SYSTEM_PROMPT = `You are a financial data extraction engine.
The user will give you the raw body text of a bank notification email from Blu BCA (Indonesian).
Extract the transaction details and return ONLY a valid JSON object — no explanation, no markdown fences.

The JSON must have exactly these fields:
{
  "date": "<ISO8601 datetime string, use Asia/Jakarta timezone +07:00 — guess from context if not explicit>",
  "amount": <number, always positive, no dots/commas — e.g. 50000 not "50.000,00">,
  "type": "<DEBIT or KREDIT — DEBIT means money went out, KREDIT means money came in>",
  "merchant": "<merchant or recipient name, as specific as possible>",
  "category": "<one of: ${CATEGORIES.join(", ")}>"
}

Rules:
- amount must be a plain number (integer or decimal), never a string.
- type is KREDIT if the email says "transaksi masuk" or "pengembalian dana", otherwise DEBIT.
- For Top-up (e.g. GOPAY TOP UP, GoPay), category = "Top-up", type = DEBIT.
- Do NOT include any text outside the JSON object.
- Do NOT wrap the JSON in markdown code fences.`;

/** Model kecil sering membungkus output dengan ```json walau dilarang. */
function stripFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

/**
 * Parse body email bank mentah jadi objek transaksi terstruktur.
 *
 * Coba maksimal dua kali. Pada temperature 0, retry polos menghasilkan output
 * identik, jadi percobaan kedua melampirkan output yang gagal beserta alasannya
 * supaya inputnya benar-benar berubah.
 */
export async function parseEmailWithAI(
  emailBody: string
): Promise<ParsedTransaction> {
  const client = getClient();
  const model = env("AI_MODEL") ?? DEFAULT_MODEL;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: emailBody },
  ];

  const MAX_ATTEMPTS = 2;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";

    let reason: string;
    let json: unknown;
    try {
      json = JSON.parse(stripFences(raw));
      const result = ParsedTransactionSchema.safeParse(json);
      if (result.success) return result.data;
      reason = describeIssues(result.error);
    } catch {
      reason = "output is not valid JSON";
    }

    if (attempt === MAX_ATTEMPTS) {
      throw new Error(
        `${model} returned unusable output after ${MAX_ATTEMPTS} attempts (${reason}):\n${raw}`
      );
    }

    messages.push(
      { role: "assistant", content: raw },
      {
        role: "user",
        content: `That output was rejected — ${reason}. Return ONLY the corrected JSON object, nothing else.`,
      }
    );
  }

  // Tidak terjangkau: loop selalu return atau throw.
  throw new Error("parseEmailWithAI: unreachable");
}
```

- [ ] **Step 5: Jalankan harness untuk memastikan LOLOS lewat Ollama**

Run: `npm run verify:parser`
Expected: seluruh pemeriksaan lolos. Bagian live mencetak `provider: http://localhost:11434/v1` dan `model: llama3.2:3b`, dan hasilnya `amount: 50000` dengan `type: "DEBIT"`.

Kalau gagal karena connection refused, jalankan `ollama serve` dulu di terminal lain, atau cek `curl -s http://localhost:11434/api/version`.

- [ ] **Step 6: Verifikasi default DeepSeek belum rusak**

Ini yang membuktikan deployment Vercel aman.

Run: `npx tsx@4 scripts/verify-parser.ts`

(Perhatikan: memanggil `tsx` langsung, **bukan** lewat `npm run verify:parser`, supaya `--env-file` tidak ikut — jadi tidak ada satu pun `AI_*` yang termuat.)

Expected: bagian schema lolos semua; bagian live mencetak `provider: (default DeepSeek)` lalu gagal dengan error autentikasi — karena `DEEPSEEK_API_KEY` juga ikut tidak termuat. Yang dibuktikan di sini adalah **base URL dan model jatuh ke default DeepSeek**, bukan ke Ollama. Kalau baris provider malah menampilkan URL Ollama, berarti ada default yang salah.

- [ ] **Step 7: Ganti import di route handler**

`app/api/cron/sync-emails/route.ts` baris 4:

```ts
import { parseEmailWithAI } from "@/lib/ai";
```

Baris 81, ganti komentar `// Parse with DeepSeek` jadi:

```ts
        // Parse with the configured AI provider
```

Tidak ada perubahan lain di file ini. Pemanggilan parser sudah berada di dalam `try/catch` per-email (baris 102), jadi satu email yang gagal validasi hanya menambah `failed` dan mencatat pesannya di `errors`, sementara sisa batch tetap diproses.

- [ ] **Step 8: Hapus `lib/deepseek.ts`**

```bash
git rm lib/deepseek.ts
```

Run: `git grep -n --untracked "lib/deepseek" -- '*.ts' '*.tsx'`
Expected: tidak ada hasil (exit code 1). Kalau ada, berarti ada importer yang terlewat.

- [ ] **Step 9: Verifikasi typecheck, lint, dan build**

Run: `npx tsc --noEmit`
Expected: keluar tanpa error.

Run: `npm run lint`

Expected: **tepat 2 error + 3 warning yang sudah ada sejak sebelum plan ini**, dan tidak ada tambahan. Sudah diverifikasi pada commit `9b56ad5`:

- `app/dashboard/components/charts/TrendLineChart.tsx:47` — `'chartW' is assigned a value but never used`
- `app/dashboard/views/AnalyticsView.tsx:35` — `'selectedMonth' is defined but never used`
- `app/dashboard/hooks/useDashboardData.ts:108,120,158` — warning `react-hooks/exhaustive-deps` soal `today`

Jangan perbaiki temuan-temuan itu; semuanya di luar ruang lingkup plan ini. Yang penting: tidak ada temuan **baru** di file yang kamu sentuh. Kalau ragu, bandingkan dengan `git stash push -u && npm run lint && git stash pop`.

Run: `npm run build`
Expected: build sukses, route `/api/cron/sync-emails` muncul di ringkasan output.

- [ ] **Step 10: Commit**

```bash
git add lib/ai.ts app/api/cron/sync-emails/route.ts scripts/verify-parser.ts
git commit -m "feat: make AI parser provider configurable via env vars"
```

`lib/deepseek.ts` sudah di-stage oleh `git rm` di Step 8.

Run: `git status --short`
Expected: **`.env.local` tidak muncul.** Kalau muncul, hentikan dan periksa `.gitignore` sebelum lanjut.

---

### Task 4: Verifikasi kualitas dengan email asli

Task 2 dan 3 membuktikan kodenya benar. Task ini menjawab pertanyaan yang berbeda dan tidak bisa dijawab oleh kode: **apakah `llama3.2:3b` cukup pintar untuk pekerjaan ini.**

**Task ini dijalankan bersama pemilik repo, bukan oleh subagent.** Ia butuh email asli dari Gmail-nya dan akses ke Supabase-nya.

**Files:**
- Modify: `scripts/verify-parser.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `parseEmailWithAI` (Task 3)
- Produces: tidak ada artefak kode — outputnya adalah keputusan apakah model perlu diganti

- [ ] **Step 1: Siapkan tempat sampel yang tidak ter-commit**

Body email bank memuat nominal, merchant, dan kadang nomor rekening. Harness sekarang di-commit, jadi sampelnya **tidak boleh** ditempel ke dalamnya — simpan di file terpisah yang di-gitignore.

Tambahkan ke `.gitignore`, di bawah blok env files:

```
# sampel email asli untuk verify:parser — jangan pernah di-commit
scripts/real-emails.json
```

- [ ] **Step 2: Kumpulkan 3–5 body email asli**

Jalankan `npm run dev`, buka `http://localhost:3000/dashboard`, tekan tombol sync. Baca log terminal — `route.ts:73` mencetak `[Sync] Processing ID: ... | Snippet: ...` untuk tiap email.

Kalau semua email sudah ter-dedupe dan tidak ada yang diproses, ambil sampel dari kolom `raw_snippet` di tabel `transactions` Supabase.

Simpan sebagai `scripts/real-emails.json` — array of string, satu string per body email:

```json
[
  "Halo Nasabah, ...",
  "Halo Nasabah, ..."
]
```

- [ ] **Step 3: Tambahkan perbandingan berdampingan ke harness**

Muat sampelnya dari file, dan lewati bagian ini kalau filenya tidak ada — supaya `npm run verify:parser` tetap jalan di mesin mana pun:

```ts
import { readFileSync, existsSync } from "node:fs";

const SAMPLE_PATH = new URL("./real-emails.json", import.meta.url);
const REAL_EMAILS: string[] = existsSync(SAMPLE_PATH)
  ? (JSON.parse(readFileSync(SAMPLE_PATH, "utf8")) as string[])
  : [];

if (REAL_EMAILS.length === 0) {
  console.log("\n(lewati perbandingan provider — scripts/real-emails.json tidak ada)");
} else {
  console.log("\n== perbandingan Ollama vs DeepSeek pada email asli ==");
  const local = { base: process.env.AI_BASE_URL, key: process.env.AI_API_KEY, model: process.env.AI_MODEL };

  for (const [i, body] of REAL_EMAILS.entries()) {
    console.log(`\n--- email ${i + 1} ---`);

    for (const provider of ["ollama", "deepseek"] as const) {
      if (provider === "ollama") {
        process.env.AI_BASE_URL = local.base;
        process.env.AI_API_KEY = local.key;
        process.env.AI_MODEL = local.model;
      } else {
        delete process.env.AI_BASE_URL;
        delete process.env.AI_MODEL;
        process.env.AI_API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
      }

      try {
        const started = Date.now();
        const r = await parseEmailWithAI(body);
        const secs = ((Date.now() - started) / 1000).toFixed(1);
        console.log(`  ${provider.padEnd(9)} ${secs}s  ${JSON.stringify(r)}`);
      } catch (err) {
        console.log(`  ${provider.padEnd(9)} ERROR  ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}
```

Klien dibuat ulang tiap pemanggilan (`getClient()` dipanggil di dalam `parseEmailWithAI`), jadi menukar `process.env` di antara pemanggilan memang berpengaruh.

- [ ] **Step 4: Jalankan perbandingan**

Run: `npm run verify:parser`

Bandingkan tiap baris berpasangan. Yang diperiksa, berurutan menurut tingkat kepentingan:

1. **`amount` identik** — ini yang paling penting. Beda di sini artinya angka di dashboard salah.
2. **`type` identik** — DEBIT vs KREDIT terbalik akan membalik arah total pemasukan/pengeluaran.
3. **`merchant` mirip** — tidak harus sama persis; "KOPI KENANGAN GI" vs "Kopi Kenangan Grand Indonesia" sama-sama diterima.
4. **`category` masuk akal** — penilaian subjektif, dan tetap bisa diperbaiki manual lewat EditModal.

- [ ] **Step 5: Putuskan berdasarkan hasilnya**

- **Semua `amount` dan `type` cocok** → `llama3.2:3b` memadai, lanjut ke Step 6.
- **Ada yang meleset** → coba model lebih besar sebelum mengubah arsitektur apa pun:

```bash
ollama pull qwen2.5:7b
```

lalu ubah `AI_MODEL=qwen2.5:7b` di `.env.local` dan ulangi Step 4. `qwen2.5:7b` dipilih karena kuat pada extraction terstruktur dan muat nyaman di RAM 30GB. Catat model mana yang akhirnya dipakai.

- [ ] **Step 6: Uji jalur penuh lewat aplikasi sungguhan**

Harness memanggil parser secara langsung; step ini membuktikan jalur lengkapnya — Gmail, parser, Supabase.

1. Hapus satu baris transaksi hasil sync otomatis dari tabel `transactions` di Supabase, catat `message_id`-nya.
2. `npm run dev`, tekan tombol sync di dashboard.
3. Expected: respons JSON menunjukkan `processed: 1`.
4. Periksa baris yang baru masuk di Supabase — `amount`, `type`, `merchant_name`, `category` terisi wajar, dan `entry_method` bernilai `AUTO_EMAIL`.

- [ ] **Step 7: Commit**

```bash
git add .gitignore scripts/verify-parser.ts
git commit -m "test: compare AI providers on real email samples"
```

Run: `git status --short`
Expected: **`scripts/real-emails.json` tidak muncul** — kalau muncul, Step 1 belum tuntas dan data bank asli terancam ter-commit. Hentikan dan perbaiki `.gitignore` dulu.

---

### Task 5: Dokumentasi

DeepSeek disebut di empat file. Semuanya harus menjelaskan provider yang bisa diganti, dengan DeepSeek sebagai default.

**Files:**
- Modify: `.env.local.example:18-20`
- Modify: `CLAUDE.md:22,52,61,63,85`
- Modify: `README.md:17,70,82,83,152`
- Modify: `DEPLOYMENT.md:10,70`

**Interfaces:**
- Consumes: perilaku akhir dari Task 3 (nama env var dan defaultnya)
- Produces: tidak ada

- [ ] **Step 1: `.env.local.example`**

Ganti blok baris 18–20:

```
# ── AI provider ───────────────────────────────────────────────────────────────
# Default memakai DeepSeek. Kosongkan ketiga AI_* di bawah untuk memakai default.
# Get from: https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=sk-xxxx

# Override opsional — arahkan ke endpoint OpenAI-compatible mana pun.
# Contoh Ollama lokal:
#   AI_BASE_URL=http://localhost:11434/v1
#   AI_API_KEY=ollama
#   AI_MODEL=llama3.2:3b
# AI_BASE_URL=
# AI_API_KEY=
# AI_MODEL=
```

- [ ] **Step 2: `CLAUDE.md`**

Baris 22 — ganti `DeepSeek V3 parses raw email text` jadi `the configured AI provider (DeepSeek by default) parses raw email text`.

Baris 52 — ganti entri direktori:

```
  ai.ts                # Configurable LLM client (OpenAI-compatible), Zod validation
  categories.ts        # Single source of truth for transaction categories
```

Baris 61–63 — ganti judul `### DeepSeek integration` dan isinya:

```markdown
### AI provider integration

`lib/ai.ts` uses the `openai` npm package against any OpenAI-compatible endpoint.
Configured via `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY`; the defaults
(`https://api.deepseek.com`, `deepseek-chat`, falling back to `DEEPSEEK_API_KEY`)
preserve the original DeepSeek behaviour, so production keeps working if the
`AI_*` vars are never set.

Requests use `temperature: 0` and `response_format: { type: "json_object" }`.
Note that DeepSeek's json_object mode rejects prompts that don't contain the
word "json" — do not remove it from the system prompt. `json_schema` is
deliberately not used: Ollama supports it but DeepSeek does not, and using it
would fork the code path per provider.

The response is validated with `ParsedTransactionSchema` (Zod) rather than cast.
On validation failure the model is retried once with the rejected output and the
reason appended, since a plain retry at temperature 0 would return the same text.

To run a self-hosted model locally, point it at Ollama:
`AI_BASE_URL=http://localhost:11434/v1`, `AI_API_KEY=ollama`, `AI_MODEL=llama3.2:3b`.
Vercel cannot reach localhost, so production stays on DeepSeek unless the local
endpoint is exposed via a tunnel.
```

Baris 71 (bagian Transaction categories) — ganti paragraf penutup yang menyuruh menjaga konsistensi manual di tiga tempat:

```markdown
These live in `lib/categories.ts` as the single source of truth, consumed by the
AI parser prompt, the manual entry form, and the category filter UI. Add or
rename categories there only. `isCategory()` is exported for widening checks —
`CATEGORIES` is a `readonly` tuple so `.includes()` won't take a plain string.
```

Baris 85 — tambahkan tiga baris ke tabel env, tepat di bawah `DEEPSEEK_API_KEY`:

```markdown
| `AI_BASE_URL` | Optional. OpenAI-compatible base URL (default `https://api.deepseek.com`) |
| `AI_MODEL` | Optional. Model name (default `deepseek-chat`) |
| `AI_API_KEY` | Optional. Falls back to `DEEPSEEK_API_KEY` |
```

- [ ] **Step 3: `README.md`**

Baris 17 — ganti `sent to DeepSeek V3` jadi `sent to an LLM (DeepSeek V3 by default)`.

Baris 70 (tabel tech stack) — ganti nilainya jadi `Any OpenAI-compatible endpoint (DeepSeek V3 by default, Ollama supported)`.

Baris 82–83 — ganti `sent to DeepSeek with a structured system prompt` jadi `sent to the configured AI provider with a structured system prompt`, dan `DeepSeek returns a clean JSON object` jadi `The provider returns a JSON object, which is validated with Zod before insert`.

Baris 152 — tambahkan tiga baris `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` ke tabel env, memakai deskripsi yang sama seperti di CLAUDE.md.

Baris 135–136 (daftar kategori) — tidak berubah isinya, tapi tambahkan satu kalimat di bawah daftar: `Defined in lib/categories.ts.`

- [ ] **Step 4: `DEPLOYMENT.md`**

Baris 10 — tambahkan catatan setelah item checklist DeepSeek:

```markdown
- [ ] DeepSeek API key dari https://platform.deepseek.com/api_keys
      (atau endpoint OpenAI-compatible lain — lihat AI_BASE_URL di bawah)
```

Baris 70 — tambahkan tiga baris ke tabel env var Vercel, dengan catatan bahwa ketiganya opsional:

```markdown
| `AI_BASE_URL` | _(kosongkan)_ — default ke DeepSeek |
| `AI_MODEL` | _(kosongkan)_ — default ke `deepseek-chat` |
| `AI_API_KEY` | _(kosongkan)_ — default ke `DEEPSEEK_API_KEY` |
```

Tambahkan satu kalimat di bawah tabel: Ollama di localhost tidak bisa dijangkau dari Vercel; produksi tetap memakai DeepSeek kecuali endpoint lokalnya diekspos lewat tunnel.

- [ ] **Step 5: Verifikasi tidak ada rujukan basi**

Run: `git grep -n --untracked -e "lib/deepseek" -e "DeepSeek V3 parses" -- . ':!docs'`
Expected: tidak ada hasil (exit code 1).

Run: `git grep -ic --untracked "deepseek" -- . ':!docs'`
Expected: masih ada hasil di keempat file dokumentasi plus `lib/ai.ts` — DeepSeek memang tetap jadi default, jadi penyebutannya wajar. Yang dipastikan di sini adalah tidak ada lagi yang menggambarkannya sebagai satu-satunya pilihan.

- [ ] **Step 6: Verifikasi build masih sehat**

Run: `npm run lint`

Expected: **tepat 2 error + 3 warning yang sudah ada sejak sebelum plan ini**, dan tidak ada tambahan. Sudah diverifikasi pada commit `9b56ad5`:

- `app/dashboard/components/charts/TrendLineChart.tsx:47` — `'chartW' is assigned a value but never used`
- `app/dashboard/views/AnalyticsView.tsx:35` — `'selectedMonth' is defined but never used`
- `app/dashboard/hooks/useDashboardData.ts:108,120,158` — warning `react-hooks/exhaustive-deps` soal `today`

Jangan perbaiki temuan-temuan itu; semuanya di luar ruang lingkup plan ini. Yang penting: tidak ada temuan **baru** di file yang kamu sentuh. Kalau ragu, bandingkan dengan `git stash push -u && npm run lint && git stash pop`.

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 7: Commit**

```bash
git add .env.local.example CLAUDE.md README.md DEPLOYMENT.md
git commit -m "docs: document configurable AI provider"
```

- [ ] **Step 8: Dokumentasikan harness-nya**

Harness ini permanen, jadi harus disebut di dokumentasi. Tambahkan ke blok perintah di `CLAUDE.md` (bagian `## Commands`, setelah baris `npm run lint`):

```bash
npm run verify:parser            # Verify the AI parser (schema checks + live provider call)
```

Ganti juga kalimat "There are no tests in this project." tepat di bawah blok itu:

```markdown
There is no test framework. `npm run verify:parser` is the closest thing: it
asserts the Zod schema's behaviour and makes one live call to the configured
provider. Drop an array of raw email bodies at `scripts/real-emails.json`
(git-ignored) to also get a side-by-side comparison between providers.
```

Ini menyentuh `CLAUDE.md` lagi setelah commit di Step 7, jadi butuh commit sendiri:

```bash
git add CLAUDE.md
git commit -m "docs: document the parser verification harness"
```

Run: `git status --short`
Expected: bersih selain file untracked yang memang sudah ada sebelumnya.

---

## Catatan penyelesaian

Setelah Task 5 selesai, branch `feat/pluggable-ai-parser` berisi lima commit dan siap di-merge. Environment Vercel tidak perlu diubah sama sekali — produksi terus memakai DeepSeek lewat jalur default.

Kalau nanti mau produksi ikut memakai Ollama, yang dibutuhkan hanyalah mengekspos Ollama lewat Cloudflare Tunnel dan mengisi `AI_BASE_URL` di environment Vercel. Tidak ada perubahan kode lagi. Ingat bahwa cron berjalan jam 00:00 setiap hari, jadi mesinnya harus menyala saat itu; kalau tidak, sync gagal tapi tidak ada data yang hilang — dedupe memakai `message_id`, jadi run berikutnya menyusul sendiri.
