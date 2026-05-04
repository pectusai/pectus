"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

export type ReviewActionResult =
  | { ok: true; state: string }
  | { ok: false; error: string };

async function recordDecision(
  itemId: string,
  decision: "approved" | "rejected",
): Promise<ReviewActionResult> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();

  const { data: item } = await supabase
    .from("review_queue_items")
    .select("id, project_id, state")
    .eq("id", itemId)
    .single();

  if (!item) return { ok: false, error: "Review item not found." };

  /* Insert the approval. The unique constraint prevents double-voting from
   * the same role; the route swallows that as a no-op. */
  const { error: approvalError } = await supabase
    .from("review_approvals")
    .insert({
      item_id: itemId,
      user_id: user.id,
      role: profile?.role ?? null,
      decision,
    });

  if (approvalError && !/duplicate/i.test(approvalError.message)) {
    return { ok: false, error: approvalError.message };
  }

  if (decision === "rejected") {
    await supabase
      .from("review_queue_items")
      .update({ state: "rejected" })
      .eq("id", itemId);
    revalidatePath("/apps/content-hub/reviews");
    return { ok: true, state: "rejected" };
  }

  /* For approvals, check whether we hit threshold. */
  const { data: policy } = await supabase
    .from("review_policy")
    .select("required_roles, min_approvals")
    .eq("project_id", item.project_id)
    .maybeSingle();

  const minApprovals = policy?.min_approvals ?? 1;
  const requiredRoles: string[] = Array.isArray(policy?.required_roles)
    ? (policy!.required_roles as string[])
    : [];

  const { data: approvals } = await supabase
    .from("review_approvals")
    .select("role, decision")
    .eq("item_id", itemId)
    .eq("decision", "approved");

  const approvedRoles = new Set((approvals ?? []).map((a) => a.role));
  const rolesSatisfied =
    requiredRoles.length === 0 ||
    requiredRoles.every((r) => approvedRoles.has(r));
  const countSatisfied = (approvals ?? []).length >= minApprovals;

  if (rolesSatisfied && countSatisfied) {
    await supabase
      .from("review_queue_items")
      .update({ state: "approved" })
      .eq("id", itemId);
    revalidatePath("/apps/content-hub/reviews");
    return { ok: true, state: "approved" };
  }

  revalidatePath("/reviews");
  return { ok: true, state: "in_review" };
}

export async function approveItem(formData: FormData) {
  const id = String(formData.get("item_id") ?? "");
  if (!id) return;
  await recordDecision(id, "approved");
}

export async function rejectItem(formData: FormData) {
  const id = String(formData.get("item_id") ?? "");
  if (!id) return;
  await recordDecision(id, "rejected");
}
