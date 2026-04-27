import { redirect } from "next/navigation";
import { createServerClient } from "@pectus/supabase";

/* Pectus v1 auth: email/password Supabase Auth. No domain restriction.
 * No sales role — that lives in a separate plugin/fork. */

export async function requireUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin, email, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");
  return { supabase, user, profile };
}
