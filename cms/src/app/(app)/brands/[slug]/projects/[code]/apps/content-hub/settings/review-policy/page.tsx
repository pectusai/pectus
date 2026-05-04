import { createServerClient } from "@pectus/supabase";
import { getProjectByCode } from "@/lib/project";
import { SubmitButton } from "@/app/components/SubmitButton";
import { saveReviewPolicy } from "./actions";

type Policy = {
  project_id: string;
  required_roles: string[] | null;
  min_approvals: number | null;
  escalate_after_days: number | null;
};

export default async function ReviewPolicyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const project = await getProjectByCode(code);
  const supabase = await createServerClient();

  const { data: policyRow } = await supabase
    .from("review_policy")
    .select("*")
    .eq("project_id", project.id)
    .maybeSingle();

  const policy = (policyRow as Policy | null) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review policy</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Who has to sign off before content ships, how many approvals are
          needed, and how long before stuck items escalate.
        </p>
      </div>

      <form
        action={saveReviewPolicy}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <input type="hidden" name="code" value={code} />

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-600">
            Required roles (comma-separated)
          </span>
          <input
            name="required_roles"
            defaultValue={(policy?.required_roles ?? []).join(", ")}
            placeholder="e.g. brand_reviewer, market_lead"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-600">
            Minimum approvals
          </span>
          <input
            name="min_approvals"
            type="number"
            min={1}
            defaultValue={policy?.min_approvals ?? 1}
            className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-zinc-600">
            Escalate after (days)
          </span>
          <input
            name="escalate_after_days"
            type="number"
            min={0}
            defaultValue={policy?.escalate_after_days ?? 7}
            className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <SubmitButton
          pendingLabel="Saving…"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Save policy
        </SubmitButton>
      </form>
    </div>
  );
}
