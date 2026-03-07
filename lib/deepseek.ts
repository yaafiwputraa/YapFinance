import OpenAI from "openai";

function getClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: "https://api.deepseek.com",
  });
}

export interface ParsedTransaction {
  date: string;         // ISO 8601 e.g. "2026-03-05T14:30:00+07:00"
  amount: number;       // always positive
  type: "DEBIT" | "KREDIT";
  merchant: string;
  category: string;
}

const SYSTEM_PROMPT = `You are a financial data extraction engine.
The user will give you the raw body text of a bank notification email from Blu BCA (Indonesian).
Extract the transaction details and return ONLY a valid JSON object — no explanation, no markdown fences.

The JSON must have exactly these fields:
{
  "date": "<ISO8601 datetime string, use Asia/Jakarta timezone +07:00 — guess from context if not explicit>",
  "amount": <number, always positive, no dots/commas — e.g. 50000 not "50.000,00">,
  "type": "<DEBIT or KREDIT — DEBIT means money went out, KREDIT means money came in>",
  "merchant": "<merchant or recipient name, as specific as possible>",
  "category": "<one of: Food & Beverage, Transportation, Shopping, Bills & Utilities, Transfer, Top-up, ATM Withdrawal, Other>"
}

Rules:
- amount must be a plain number (integer or decimal), never a string.
- type is KREDIT if the email says "transaksi masuk" or "pengembalian dana", otherwise DEBIT.
- For Top-up (e.g. GOPAY TOP UP, GoPay), category = "Top-up", type = DEBIT.
- Do NOT include any text outside the JSON object.`;

/**
 * Parse a raw bank email body into a structured transaction object.
 */
export async function parseEmailWithAI(
  emailBody: string
): Promise<ParsedTransaction> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: emailBody },
    ],
    temperature: 0,
  });

  const raw = response.choices[0].message.content?.trim() ?? "{}";

  try {
    return JSON.parse(raw) as ParsedTransaction;
  } catch {
    throw new Error(`DeepSeek returned invalid JSON:\n${raw}`);
  }
}
