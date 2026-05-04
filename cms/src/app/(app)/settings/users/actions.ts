"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

const ALLOWED_ROLES = [
  "drafter",
  "brand_reviewer",
  "market_lead",
] as const;
type Role = (typeof ALLOWED_ROLES)[number];

function isRole(value: string): value is Role {
  return (ALLOWED_ROLES as readonly string[]).includes(value);
}

export async function updateUser(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const isAdminFlag = formData.get("is_admin") === "on";

  if (!id || !isRole(role)) return;

  const { supabase, user } = await requireAdmin();

  const patch: { role: Role; is_admin?: boolean } = { role };
  /* You can't strip your own admin flag — guards against the last admin
   * locking themselves out. */
  if (id !== user.id) patch.is_admin = isAdminFlag;

  await supabase.from("profiles").update(patch).eq("id", id);
  revalidatePath("/settings/users");
  revalidatePath("/settings");
}
