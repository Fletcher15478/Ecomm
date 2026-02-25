import { createClient } from "@supabase/supabase-js";

/**
 * Server-only. Use for admin operations and when RLS is bypassed (service role).
 * Never expose service role key to the client.
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
