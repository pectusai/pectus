"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getWorkspaceByCode } from "@/lib/workspace";

export async function saveReviewPolicy(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const requiredRolesRaw = String(formData.get("required_roles") ?? "");
  const minApprovals = Number(formData.get("min_approvals") ?? 1);
  const escalateAfterDays = Number(formData.get("escalate_after_days") ?? 7);

  if (!code) return;

  const required_roles = requiredRolesRaw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const { supabase } = await requireAdmin();
  const workspace = await getWorkspaceByCode(code);

  await supabase.from("review_policy").upsert(
    {
      workspace_id: workspace.id,
      required_roles,
      min_approvals: Number.isFinite(minApprovals)
        ? Math.max(1, Math.floor(minApprovals))
        : 1,
      escalate_after_days: Number.isFinite(escalateAfterDays)
        ? Math.max(0, Math.floor(escalateAfterDays))
        : 7,
    },
    { onConflict: "workspace_id" },
  );

  revalidatePath(`/workspaces/${code}/settings/review-policy`);
  revalidatePath(`/workspaces/${code}/settings`);
}
