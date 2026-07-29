import OpenAI from "openai";
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
