# YapBalance

A personal finance tracker that automatically reads bank notification emails and turns them into structured transaction data using an LLM. Built as a solution to the lack of public APIs from Indonesian digital banks.

---

## Problem

1. **No public API.** Digital banks like Blu BCA and e-wallets like GoPay do not expose APIs for individual users.
2. **Regex is fragile.** Scraping emails with regex breaks the moment the bank changes their email template.
3. **Manual tracking fails.** Logging every transaction by hand is tedious and gets abandoned quickly.

## Solution

YapBalance uses a hybrid approach:

- **AI-based parsing.** Instead of regex, raw email text is sent to an LLM (DeepSeek V3 by default). As long as the amount and merchant are somewhere in the email, the model will find them regardless of template changes.
- **Manual entry fallback.** A fast input form for transactions that do not generate email notifications, such as GoPay or cash payments.

---

## Features

### Automatic Email Sync

- Reads Gmail inbox for bank notification emails from Blu BCA using Gmail API (OAuth2 with a long-lived refresh token).
- Deduplicates using Gmail `Message-ID` so the same email is never counted twice.
- Runs automatically once per day via Vercel Cron. Can also be triggered manually from the dashboard.

### Manual Entry

- Simple form for logging transactions that do not generate emails.
- Supports source tagging: Blu, GoPay, or Cash.

### Dashboard

![Overview Dashboard](/public/overview.png)

- Monthly spending overview with daily bar chart.
- Category breakdown for the selected month.

### Transactions

![Transactions List](/public/transaksi.png)

- Transactions list with search and category filter chips.

### Analytics

![Analytics View](/public/analytics.png)

- Analytics view: monthly trend, weekly trend, day-of-week pattern, top merchants.

### Budgeting

![Budget Tracking](/public/budget.png)

- Budget tracking per category with progress bars.
- Month/year picker — jump directly to any month without clicking through one by one.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| AI Engine | Any OpenAI-compatible endpoint (DeepSeek V3 by default, Ollama supported) |
| Email Access | Gmail API (OAuth2) |
| Deployment | Vercel (with Cron Jobs) |

Ollama works, but model quality matters: on one synthetic sample `llama3.2:3b` labelled a plainly outgoing merchant payment as `KREDIT` and a coffee shop as `Shopping`. Zod validation cannot catch that — `KREDIT` is a valid enum value, so the transaction is stored with an inverted sign. Sanity-check any small model with `npm run verify:parser` before relying on it.

---

## How It Works

### Automatic Ingestion Pipeline

1. Vercel Cron triggers `GET /api/cron/sync-emails` once per day.
2. The server calls Gmail API and fetches up to 50 emails matching `from:receipts@blubybcadigital.id`.
3. For each unseen email, the raw text body is extracted and sent to the configured AI provider with a structured system prompt.
4. The provider returns a JSON object, which is validated with Zod before insert:

```json
{
  "date": "2026-03-05T14:30:00+07:00",
  "amount": 50000,
  "type": "DEBIT",
  "merchant": "Kopi Kenangan",
  "category": "Food & Beverage"
}
```

5. The result is inserted into the `transactions` table in Supabase with `entry_method: AUTO_EMAIL`.

### Manual Entry Flow

1. User fills the form in the dashboard.
2. Data is posted to `POST /api/transactions/manual`.
3. Saved with `entry_method: MANUAL`.

---

## Database Schema

```sql
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount          DECIMAL(12, 2) NOT NULL,
  type            VARCHAR(10) CHECK (type IN ('DEBIT', 'KREDIT')),
  source          VARCHAR(50) NOT NULL,     -- 'BLU', 'GOPAY', 'CASH'
  merchant_name   TEXT,
  category        VARCHAR(100),
  entry_method    VARCHAR(20) DEFAULT 'MANUAL', -- 'AUTO_EMAIL' or 'MANUAL'
  message_id      TEXT UNIQUE,              -- Gmail Message-ID for deduplication
  raw_snippet     TEXT                      -- Raw email snippet for debugging
);
```

---

## Categories

Transactions are classified into the following categories (used by both the AI parser and the manual entry form):

- Food & Beverage
- Transportation
- Shopping
- Bills & Utilities
- Transfer
- Top-up
- ATM Withdrawal
- Sports
- Game
- Other

Defined in lib/categories.ts.

---

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `GOOGLE_CLIENT_ID` | OAuth2 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth2 Client Secret |
| `GOOGLE_REDIRECT_URI` | Authorized redirect URI (must match Google Cloud Console) |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token obtained via OAuth flow |
| `DEEPSEEK_API_KEY` | API key from platform.deepseek.com |
| `AI_BASE_URL` | Optional. OpenAI-compatible base URL (default `https://api.deepseek.com`) |
| `AI_MODEL` | Optional. Model name (default `deepseek-chat`) |
| `AI_API_KEY` | Optional. Falls back to `DEEPSEEK_API_KEY` |
| `CRON_SECRET` | Random secret to protect the cron endpoint |
| `NEXT_PUBLIC_CRON_SECRET` | Same value as `CRON_SECRET` — exposed to the client for the manual sync button |

See `.env.local.example` for a filled-out template, and `DEPLOYMENT.md` for the full deployment guide.

---

## Local Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Copy environment file and fill in your values
cp .env.local.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To get your `GOOGLE_REFRESH_TOKEN`, visit `http://localhost:3000/api/auth/gmail/start` once after setting up your Google OAuth credentials.

---

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete step-by-step guide to deploying on Vercel.

