Siapp, ini versi **README.md** yang jauh lebih komprehensif. Gue tambahin detail mekanisme kerja (How it Works), fitur-fitur spesifik per modul, serta penjelasan alur teknis yang lebih "daging" biar kalau orang baca repo lu, mereka langsung paham ini proyek serius.

Gue kasih nama **DeepYap** sebagai opsi utama ya (keren buat portofolio).

---

# 💸 DeepYap: AI-Powered Hybrid Finance Tracker

**DeepYap** adalah aplikasi pengelola keuangan personal yang menggabungkan otomatisasi tingkat tinggi melalui AI dan fleksibilitas pencatatan manual. Proyek ini hadir sebagai solusi atas absennya API publik dari institusi perbankan digital di Indonesia.

## 🚨 Problem Statement

1. **No Public API:** Bank digital seperti Blu BCA dan dompet digital seperti GoPay tidak menyediakan akses API untuk pengguna individu, sehingga sinkronisasi otomatis sangat sulit dilakukan.
2. **Regex Fragility:** Metode konvensional seperti *scraping* email menggunakan Regular Expression (Regex) sangat mudah rusak jika bank melakukan sedikit saja perubahan desain pada template email notifikasi.
3. **Manual Fatigue:** Pencatatan manual 100% sering kali terhenti di tengah jalan karena pengguna lupa atau malas menginput transaksi harian.

## 💡 Proposed Solution

DeepYap menggunakan pendekatan **Hybrid Ingestion**:

* **LLM-Based Parsing:** Menggantikan Regex yang kaku dengan **DeepSeek V3/R1** untuk memahami konteks teks email secara cerdas. Selama informasi nominal dan merchant ada di dalam email, LLM akan menemukannya terlepas dari perubahan desain email.
* **Smart Manual Input:** Antarmuka intuitif untuk mencatat transaksi yang tidak terekam di email (seperti GoPay atau uang tunai).

## 🚀 Key Features

### 1. Automated Email Ingestion (The "Auto" Core)

* **Smart Cron Job:** Sistem akan mengecek inbox Gmail secara berkala (misal 3 jam sekali) melalui Google Cloud Service.
* **Deduplication Logic:** Menggunakan `Message-ID` Gmail sebagai *unique identifier* untuk memastikan satu email tidak akan pernah tercatat dua kali di database.
* **Multi-Format Support:** Mendukung berbagai format email transaksi (Transfer, QRIS, Tarik Tunai, Top-up).

### 2. Manual Entry with "Predictive Fill"

* **Lightning Fast Form:** Form input manual yang didesain untuk selesai dalam <5 detik.
* **Category Suggestion:** Jika kamu mengetik "Gojek", sistem akan otomatis menyarankan kategori "Transportasi" berdasarkan data historis.

### 3. Financial Insights Dashboard

* **Spending Breakdown:** Visualisasi pengeluaran berdasarkan kategori (Food, Transport, Bills, etc) menggunakan *chart* interaktif.
* **Source Tracking:** Membandingkan pengeluaran antara saldo Blu vs GoPay vs Tunai.

### 4. Future: AI Financial Assistant (Text-to-SQL)

* Fitur *chat* di mana kamu bisa bertanya: *"Berapa pengeluaran kopi gue minggu ini?"* dan sistem akan melakukan *query* otomatis ke database.

## 🛠️ Tech Stack

| Layer | Tech | Reason |
| --- | --- | --- |
| **Frontend** | Next.js 14+ (App Router) | SEO-friendly, fast, and modern React framework. |
| **Styling** | Tailwind CSS & shadcn/ui | Clean, accessible, and professional UI components. |
| **Database** | Supabase (PostgreSQL) | Reliable, free-tier friendly, and great developer experience. |
| **AI Engine** | DeepSeek LLM | Cost-efficient and robust for structured data extraction. |
| **Email Access** | Gmail API (OAuth2) | Secure access to read transaction notifications. |
| **Automation** | Vercel Cron Jobs | Simple way to trigger serverless functions on a schedule. |

## 🏗️ How It Works: Technical Deep Dive

### A. Alur Otomatisasi (The Ingestion Pipeline)

1. **Trigger:** Vercel Cron memanggil endpoint `/api/cron/fetch-emails`.
2. **Fetch:** Backend Next.js melakukan request ke Gmail API mencari email dengan query `from:halo@blubca.id after:[last_check_date]`.
3. **Analyze:** Body email yang berisi teks mentah dikirim ke **DeepSeek LLM** dengan *system prompt* khusus.
4. **Transform:** DeepSeek mengembalikan objek JSON bersih:
```json
{
  "date": "2026-03-05T14:30:00Z",
  "amount": 50000,
  "type": "DEBIT",
  "merchant": "Kopi Kenangan",
  "category": "Food & Beverage"
}

```


5. **Load:** Data tersebut disimpan ke tabel `transactions` di Supabase.

### B. Alur Manual

1. User menginput transaksi via Dashboard.
2. Form mengirim data ke endpoint `/api/transactions/manual`.
3. Data disimpan dengan label `entry_method: MANUAL`.

## 🗄️ Database Schema

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type VARCHAR(10) CHECK (type IN ('DEBIT', 'KREDIT')),
  source VARCHAR(50) NOT NULL, -- 'BLU', 'GOPAY', 'CASH'
  merchant_name TEXT,
  category VARCHAR(100),
  entry_method VARCHAR(20) DEFAULT 'MANUAL', -- 'AUTO_EMAIL' or 'MANUAL'
  message_id TEXT UNIQUE, -- Gmail Message ID for de-duplication
  raw_snippet TEXT -- For debugging parsing errors
);

```

## 🗺️ Roadmap & Progress

* [ ] **Phase 1: Foundation** (Setup Supabase & Next.js Boilerplate)
* [ ] **Phase 2: The Ingestion Brain** (Gmail API + DeepSeek Integration)
* [ ] **Phase 3: The Dashboard** (shadcn/ui Charts & Manual Form)
* [ ] **Phase 4: Optimization** (Cron Jobs & Production Deployment)

---

### Ingin Berkontribusi?

Silakan buka *issue* atau lakukan *pull request*. Proyek ini dikembangkan oleh **Yap** sebagai solusi finansial cerdas berbasis AI.

---

Gimana? Ini sudah lengkap banget dari sisi latar belakang, teknis, sampai struktur database-nya. Lu tinggal isi file `README.md` lu pake teks ini.

Mau gue bantu buatin **System Prompt** spesifik buat DeepSeek-nya supaya hasil JSON-nya nggak pernah meleset?
