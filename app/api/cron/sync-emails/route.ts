import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailClient, extractTextBody } from "@/lib/gmail";
import { parseEmailWithAI } from "@/lib/deepseek";

// Vercel max function duration (seconds). Pro plan allows up to 300.
// Hobby plan max is 60. Increase if you process many emails at once.
export const maxDuration = 60;

// Only Blu BCA transaction emails for now.
// Add more senders here as needed, e.g. "OR dari:noreply@gopay.co.id"
const GMAIL_QUERY = "from:receipts@blubybcadigital.id";

export async function GET(request: NextRequest) {
  // Protect the endpoint from unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();
  const gmail = getGmailClient();

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // Fetch up to 50 recent matching emails
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: GMAIL_QUERY,
      maxResults: 50,
    });

    const messages = listRes.data.messages ?? [];

    console.log(`[Sync] Found ${messages.length} emails matching query: ${GMAIL_QUERY}`);

    for (const msg of messages) {
      const messageId = msg.id!;

      // Deduplication: skip if already in DB
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("message_id", messageId)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      try {
        // Fetch full message
        const fullMsg = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bodyText = extractTextBody((fullMsg.data.payload ?? {}) as any);
        const snippet = fullMsg.data.snippet ?? "";

        // Use Gmail's internalDate as the authoritative transaction date
        const gmailDate = fullMsg.data.internalDate
          ? new Date(Number(fullMsg.data.internalDate)).toISOString()
          : null;

        console.log(`[Sync] Processing ID: ${messageId} | Date: ${gmailDate} | Snippet: ${snippet}`);

        if (!bodyText) {
          errors.push(`${messageId}: empty body`);
          failed++;
          continue;
        }

        // Parse with DeepSeek
        const parsed = await parseEmailWithAI(bodyText);

        // Insert into Supabase — use Gmail date as authoritative, fall back to AI-parsed date
        const { error: insertError } = await supabase
          .from("transactions")
          .insert({
            transaction_date: gmailDate ?? parsed.date,
            amount: parsed.amount,
            type: parsed.type,
            source: "BLU",
            merchant_name: parsed.merchant,
            category: parsed.category,
            entry_method: "AUTO_EMAIL",
            message_id: messageId,
            raw_snippet: snippet,
          });

        if (insertError) throw new Error(insertError.message);

        processed++;
      } catch (err: unknown) {
        errors.push(`${messageId}: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    }

    return NextResponse.json({ processed, skipped, failed, errors });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
