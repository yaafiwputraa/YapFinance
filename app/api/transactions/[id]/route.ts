import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  amount: z.number().positive().optional(),
  merchant_name: z.string().min(1).optional(),
  category: z.string().optional(),
  source: z.enum(["BLU", "GOPAY", "CASH"]).optional(),
  type: z.enum(["DEBIT", "KREDIT"]).optional(),
  transaction_date: z.string().datetime({ offset: true }).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: "No valid fields to update",
});

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = createClient();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("transactions").update(parsed.data).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
