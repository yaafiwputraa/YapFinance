import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  transaction_date: z.string().datetime({ offset: true }),
  amount: z.number().positive(),
  type: z.enum(["DEBIT", "KREDIT"]),
  source: z.enum(["BLU", "GOPAY", "CASH"]),
  merchant_name: z.string().min(1),
  category: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { error } = await supabase.from("transactions").insert({
    ...parsed.data,
    entry_method: "MANUAL",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
