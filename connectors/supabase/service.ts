import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/* Service-role client. Bypasses RLS — use only in CLI scripts and server
 * routes that must read or write without an authenticated user. Never expose
 * to the browser. */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
