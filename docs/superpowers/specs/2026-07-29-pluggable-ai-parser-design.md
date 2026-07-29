# Pluggable AI Parser (Ollama / self-hosted)

Tanggal: 2026-07-29
Status: disetujui, siap dibuatkan implementation plan

## Konteks

Parser email bank saat ini terkunci ke DeepSeek V3 lewat `lib/deepseek.ts`. Tujuannya
adalah bisa mencoba model self-hosted (Ollama) untuk keperluan eksperimen/belajar,
tanpa mengganggu deployment produksi yang sudah jalan.

Kendala utama: cron `/api/cron/sync-emails` dieksekusi di serverless Vercel
(`vercel.json`, jadwal `0 0 * * *`). Ollama berjalan di `localhost:11434` di mesin
lokal dan tidak bisa dijangkau dari Vercel tanpa tunnel.

Keputusan: **jangan** memaksa produksi memakai Ollama. Jadikan provider LLM dapat
dikonfigurasi lewat environment variable — lokal memakai Ollama, Vercel tetap
memakai DeepSeek. Ini nol infrastruktur baru dan nol risiko terhadap produksi.

Prasyarat yang sudah diverifikasi di mesin ini:

- Ollama v0.32.1 berjalan, model `llama3.2:3b` tersedia.
- Endpoint `POST /v1/chat/completions` menerima `response_format: {"type":"json_object"}`
  dan mengembalikan JSON valid. Uji coba `Rp50.000,00` di KOPI KENANGAN menghasilkan
  `{"amount":50000,"merchant":"Kopi Kenangan"}`.

## Ruang lingkup

### 1. `lib/deepseek.ts` → `lib/ai.ts`

Nama `deepseek` tidak lagi akurat begitu provider bisa berganti. Hanya ada satu
importer (`app/api/cron/sync-emails/route.ts:4`), jadi rename ini murah.

Konfigurasi klien dibaca dari environment, semuanya dengan default sehingga deployment
Vercel yang ada tetap berjalan walau variabel barunya belum diisi:

| Variabel | Default |
|---|---|
| `AI_BASE_URL` | `https://api.deepseek.com` |
| `AI_MODEL` | `deepseek-chat` |
| `AI_API_KEY` | jatuh ke `DEEPSEEK_API_KEY` |

Nilai untuk `.env.local` di mesin lokal:

```
AI_BASE_URL=http://localhost:11434/v1
AI_API_KEY=ollama
AI_MODEL=llama3.2:3b
```

`AI_API_KEY` wajib diisi walau Ollama tidak memeriksanya — SDK `openai` menolak
API key kosong. Nilai `ollama` dipakai sebagai placeholder.

Environment Vercel tidak diubah sama sekali.

### 2. Output JSON dipaksa di level API

Kirim `response_format: { type: "json_object" }` pada request. Didukung oleh DeepSeek
maupun Ollama.

Sengaja **tidak** memakai `response_format: { type: "json_schema" }` meskipun Ollama
mendukungnya: DeepSeek tidak mendukung mode itu, sehingga memakainya akan memecah code
path menjadi bercabang per provider. Satu jalur lebih mudah dirawat, dan validasi
schema tetap dilakukan di sisi kita lewat Zod (bagian 3).

Sebelum `JSON.parse`, buang markdown fence (` ```json ` … ` ``` `) secara defensif —
model kecil sering menambahkannya walau diinstruksikan tidak.

### 3. Validasi Zod

Saat ini hasil `JSON.parse` langsung di-cast ke `ParsedTransaction` tanpa pemeriksaan
apa pun (`lib/deepseek.ts:56`). DeepSeek cukup patuh sehingga ini aman selama ini;
model 3B lokal tidak akan sepatuh itu. Zod sudah ada di dependencies.

`ParsedTransactionSchema`:

- **`amount`** — menerima `number` atau `string`. Jika string, normalisasi format rupiah
  lebih dulu, lalu parse. Wajib berupa angka berhingga dan lebih besar dari 0.
- **`type`** — di-uppercase, lalu enum `DEBIT | KREDIT`.
- **`category`** — enum dari `CATEGORIES` (bagian 5) dengan `.catch("Other")`. Jika model
  mengarang kategori di luar daftar, transaksinya jangan digagalkan — jatuhkan ke `Other`.
- **`merchant`** — string, di-trim, wajib tidak kosong.
- **`date`** — string bebas. Cron sudah memakai `internalDate` dari Gmail sebagai sumber
  otoritatif (`route.ts:88`); `parsed.date` hanya cadangan bila `internalDate` tidak ada.

Aturan normalisasi amount, untuk string:

1. Buang semua karakter selain digit, titik, dan koma (menghapus `Rp`, spasi, `IDR`).
2. Jika mengandung koma → koma adalah pemisah desimal: hapus semua titik, ubah koma
   menjadi titik.
3. Jika tidak mengandung koma → titik adalah pemisah ribuan: hapus semua titik.
4. `parseFloat`, lalu validasi berhingga dan > 0.

Asumsi eksplisit: aturan ini mengikuti konvensi angka Indonesia (`Rp50.000,00` = lima
puluh ribu), bukan konvensi Inggris. Ini disengaja — bila model mengabaikan instruksi
"kembalikan angka polos", ia akan menyalin format dari email Blu BCA, yang selalu format
Indonesia. Konsekuensinya `"50.5"` diartikan sebagai `505`, bukan `50,5`; nominal rupiah
pada email ini tidak pernah ditulis dengan desimal titik, jadi kasus tersebut tidak muncul.

### 4. Retry sekali dengan pesan koreksi

Pada `temperature: 0`, retry polos menghasilkan output yang identik — tidak berguna.
Karena itu retry harus mengubah input: lampirkan output yang gagal beserta alasan
kegagalannya sebagai pesan tambahan, lalu minta model mengembalikan objek JSON-nya saja.

Maksimum satu kali retry. Bila tetap gagal, `throw`.

Tidak ada perubahan pada `route.ts`: pemanggilan parser sudah berada di dalam `try/catch`
per-email (`route.ts:102`), sehingga kegagalan satu email hanya menambah `failed` dan
mencatat pesannya di `errors`, sementara sisa batch tetap diproses.

### 5. `lib/categories.ts` — satu sumber kebenaran untuk kategori

Saat ini daftar kategori punya **tiga salinan terpisah**:

- `app/dashboard/lib/helpers.ts:15` — `CATEGORIES` (10 item)
- `app/dashboard/components/ManualEntryDialog.tsx:6` — `CATEGORIES` sendiri (10 item)
- `lib/deepseek.ts:28` — daftar di dalam system prompt (**8 item**)

Salinan ketiga sudah drift: `Sports` dan `Game` tidak pernah dimasukkan ke prompt. Efeknya
bukan sekadar inkonsistensi dokumentasi — **tidak satu pun transaksi hasil sync otomatis
yang pernah bisa dikategorikan sebagai `Sports` atau `Game`**, karena model tidak pernah
diberi tahu kategori itu ada. Hanya entri manual yang bisa memakainya.

Perbaikan: buat `lib/categories.ts` yang mengekspor satu array `CATEGORIES`, lalu impor
dari ketiga tempat. `lib/ai.ts` memakainya untuk membangun system prompt dan enum Zod.

`helpers.ts` tidak bisa dijadikan sumber kebenaran karena mengimpor ikon `lucide-react`
di baris 1 — mengimpornya dari `lib/ai.ts` akan menyeret `lucide-react` masuk ke bundle
serverless. Karena itu file netral baru, bukan re-export.

Daftar kanoniknya (10 item, sesuai `helpers.ts` yang sekarang):

```
Food & Beverage, Transportation, Shopping, Bills & Utilities,
Transfer, Top-up, ATM Withdrawal, Sports, Game, Other
```

### 6. Dokumentasi

DeepSeek disebut di empat file. Semuanya diperbarui agar menjelaskan provider yang bisa
diganti, dengan DeepSeek sebagai default:

- `.env.local.example` — baris 18–20
- `CLAUDE.md` — baris 22, 52, 61, 63, 85
- `README.md` — baris 17, 70, 82, 83, 152
- `DEPLOYMENT.md` — baris 10, 70

## Verifikasi

Proyek ini tidak punya test framework, jadi verifikasinya manual tapi konkret:

1. **Perbandingan berdampingan.** Script sekali pakai (di scratchpad, tidak di-commit)
   yang mengambil 3–5 body email asli, menjalankannya lewat Ollama dan DeepSeek, lalu
   menampilkan kedua hasil bersebelahan. Ini yang menjawab apakah `llama3.2:3b` sudah
   cukup atau perlu naik ke model 7–8B.
2. **Uji jalur penuh.** `npm run dev`, tekan tombol sync di dashboard, periksa row yang
   masuk ke Supabase — khususnya `amount`, `type`, dan `category`.
3. **Uji regresi default.** Kosongkan variabel `AI_*`, pastikan parser tetap jalan
   memakai DeepSeek. Ini yang membuktikan deployment Vercel tidak akan rusak.
4. `npm run lint` dan `npm run build` lolos.

## Di luar ruang lingkup

- **Cloudflare Tunnel** agar cron Vercel benar-benar memakai Ollama. Setelah perubahan
  ini, itu tinggal soal mengisi `AI_BASE_URL` di environment Vercel — tidak perlu
  perubahan kode lagi. Ditunda sampai kualitas parsing model lokal terbukti memadai.
- **Fallback otomatis ke DeepSeek** bila Ollama gagal. Menambah percabangan untuk
  tujuan yang sifatnya eksperimen.
- **Memindahkan seluruh pipeline sync ke lokal** (Windows Task Scheduler). Akan membuat
  dua jalur ingestion yang harus dirawat bersamaan.

## Risiko

- **Kualitas `llama3.2:3b`.** Model 3B bisa salah menebak merchant atau kategori pada
  email dengan format tidak biasa. Mitigasinya adalah validasi Zod ditambah langkah
  verifikasi nomor 1 — bila hasilnya buruk, naikkan ukuran model, bukan ubah arsitektur.
- **Kecepatan inferensi.** GPU di mesin ini adalah AMD Radeon Vega 10 (iGPU), jadi
  inferensi kemungkinan berjalan di CPU. Ini hanya memengaruhi kenyamanan saat
  eksperimen lokal, tidak memengaruhi produksi.
