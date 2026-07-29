# Vercel Deployment Checklist

## Prerequisites

Make sure semua ini sudah ada sebelum deploy:

- [ ] Supabase project aktif, tabel `transactions` sudah dibuat (lihat schema di README)
- [ ] Google Cloud project dengan **Gmail API** enabled
- [ ] OAuth2 credentials (Client ID + Client Secret)
- [ ] DeepSeek API key dari https://platform.deepseek.com/api_keys
      (atau endpoint OpenAI-compatible lain — lihat AI_BASE_URL di bawah)
- [ ] `GOOGLE_REFRESH_TOKEN` sudah di-generate (lihat langkah di bawah)

---

## Step 1 — Dapatkan `GOOGLE_REFRESH_TOKEN` (lakukan di lokal dulu)

1. Set `.env.local` dengan nilai lokal (redirect URI = `http://localhost:3000/...`)
2. Jalankan `npm run dev`
3. Buka `http://localhost:3000/api/auth/gmail/start` → redirect ke Google login
4. Setelah authorize, kamu akan diredirect ke `/api/auth/callback/google`
5. Copy nilai `refresh_token` yang muncul di JSON response
6. Simpan ke `.env.local` sebagai `GOOGLE_REFRESH_TOKEN=...`

> **Refresh token tidak expire** selama app tidak di-revoke, jadi cukup lakukan ini sekali.

---

## Step 2 — Generate `CRON_SECRET`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Simpan outputnya, akan dipakai untuk dua env var (`CRON_SECRET` dan `NEXT_PUBLIC_CRON_SECRET`).

---

## Step 3 — Update Google Cloud Console

Di [console.cloud.google.com](https://console.cloud.google.com) → OAuth 2.0 Client → **Authorized redirect URIs**, tambahkan:

```
https://<your-app>.vercel.app/api/auth/callback/google
```

Jika kamu pakai custom domain:
```
https://yourdomain.com/api/auth/callback/google
```

---

## Step 4 — Deploy ke Vercel

### Cara 1: Via Vercel Dashboard (recommended)

1. Push repo ke GitHub
2. Buka [vercel.com/new](https://vercel.com/new) → import repo ini
3. Framework preset akan otomatis terdeteksi sebagai **Next.js**
4. Klik **"Environment Variables"** dan isi semua variabel berikut:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (dari Supabase → Settings → API) |
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxx` |
| `GOOGLE_REDIRECT_URI` | `https://<your-app>.vercel.app/api/auth/callback/google` |
| `GOOGLE_REFRESH_TOKEN` | token dari Step 1 |
| `DEEPSEEK_API_KEY` | `sk-xxxx` |
| `AI_BASE_URL` | _(kosongkan)_ — default ke DeepSeek |
| `AI_MODEL` | _(kosongkan)_ — default ke `deepseek-chat` |
| `AI_API_KEY` | _(kosongkan)_ — default ke `DEEPSEEK_API_KEY` |
| `CRON_SECRET` | output dari Step 2 |
| `NEXT_PUBLIC_CRON_SECRET` | **nilai yang sama** dengan `CRON_SECRET` |

Ollama di localhost tidak bisa dijangkau dari Vercel; produksi tetap memakai DeepSeek kecuali endpoint lokalnya diekspos lewat tunnel.

5. Klik **Deploy**

### Cara 2: Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

Ikuti prompt dan set env vars saat diminta, atau set via dashboard setelah deploy.

---

## Step 5 — Verifikasi Cron Job

Setelah deploy berhasil:

1. Buka Vercel Dashboard → project → **Cron Jobs** tab
2. Pastikan cron `/api/cron/sync-emails` muncul dengan schedule `0 */6 * * *` (setiap 6 jam)
3. Klik **Run** untuk tes manual pertama kali
4. Cek **Function Logs** untuk memastikan tidak ada error

---

## Step 6 — Test Manual Sync dari Dashboard

1. Buka app di URL Vercel
2. Klik tombol **Sync** di dashboard
3. Seharusnya muncul status seperti `3 baru, 10 ada` atau semacamnya

---

## Troubleshooting

| Error | Kemungkinan penyebab |
|---|---|
| `Unauthorized` dari cron endpoint | `CRON_SECRET` dan `NEXT_PUBLIC_CRON_SECRET` tidak sama |
| `invalid_grant` dari Google | Refresh token tidak valid; ulangi Step 1 |
| Transaksi tidak masuk | Cek `GMAIL_QUERY` di `app/api/cron/sync-emails/route.ts` — pastikan cocok dengan sender email bank kamu |
| Timeout saat sync banyak email | Upgrade ke Vercel Pro dan naikkan `maxDuration` di route.ts ke 300 |
| Supabase insert error | Pastikan schema tabel `transactions` sudah dibuat (lihat README) |

---

## Notes

- Route `/api/auth/gmail/start` dan `/api/auth/callback/google` adalah **temporary routes** untuk setup awal. Setelah `GOOGLE_REFRESH_TOKEN` didapat, routes ini tidak perlu dihapus tapi tidak akan dipakai lagi.
- `NEXT_PUBLIC_CRON_SECRET` memang public (visible di browser), ini trade-off yang acceptable untuk personal app. Jika ingin lebih aman, pindahkan sync button ke server action.
