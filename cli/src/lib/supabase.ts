// Lazily-loaded service-role Supabase client for the CLI.
// Dynamic import so commands that don't need it (e.g. brand) can run before
// env vars are configured.

import type { SupabaseClient } from "@supabase/supabase-js";

export async function getServiceClient(): Promise<SupabaseClient> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase env vars missing. Run `pectus connect supabase` first.",
    );
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
