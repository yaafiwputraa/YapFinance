import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-only Supabase client using the service role key.
 * Bypasses RLS — NEVER import this in Client Components.
 */
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceKey);
}
