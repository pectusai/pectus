import { createServerClient } from "@pectus/supabase";
import { listMigrations } from "@/lib/migrations-list";
import { MigrationOverlayClient } from "./MigrationOverlayClient";

export async function MigrationBanner() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return null;

  const { data: appliedRows, error } = await supabase
    .from("_pectus_migrations")
    .select("filename");

  const bookkeepingMissing =
    !!error && (error as { code?: string }).code === "42P01";

  const applied = new Set<string>(
    bookkeepingMissing
      ? []
      : (appliedRows ?? []).map((r) => r.filename as string),
  );

  const all = listMigrations();
  const pending = all
    .filter((m) => !applied.has(m.filename))
    .map((m) => m.filename);

  if (pending.length === 0) return null;

  return (
    <MigrationOverlayClient
      pending={pending}
      bookkeepingMissing={bookkeepingMissing}
    />
  );
}
