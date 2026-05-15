import { createServerClient } from "@pectus/supabase";
import { getProjectByCode } from "@/lib/project";
import { SubmitButton } from "@/app/components/SubmitButton";
import { saveReviewPolicy } from "./actions";
import { RolesField } from "./RolesField";

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
  const initialRoles: string[] = Array.isArray(policy?.required_roles)
    ? (policy!.required_roles as string[])
    : [];
  const initialMin = policy?.min_approvals ?? 1;
  const initialEscalate = policy?.escalate_after_days ?? 7;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review policy</h2>
        <p className="mt-1 text-sm text-zinc-600">
          When someone clicks Publish on a draft, this policy decides whether
          it goes live straight away or has to wait for sign-off. Drafts that
          need sign-off show up in the global Reviews inbox until they pass.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        <p className="font-medium">How this works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px]">
          <li>
            <strong>Required roles</strong> are the roles that have to approve
            a draft before it can ship. Match the value to the{" "}
            <code className="rounded bg-white px-1 text-[12px]">role</code>{" "}
            column on the user&apos;s profile.
          </li>
          <li>
            <strong>Minimum approvals</strong> is the count of distinct
            approvals needed. Set above the number of required roles to require
            extra eyes; set below if any one of the required roles can sign
            off.
          </li>
          <li>
            <strong>Escalate after</strong> tags items as &quot;stuck&quot;
            after the given number of days. Today this is informational; the
            inbox sorts oldest-first either way.
          </li>
          <li>
            With <strong>no required roles</strong>, anyone with project
            access can approve. The draft still has to be approved at least{" "}
            <strong>minimum approvals</strong> times.
          </li>
        </ul>
      </div>

      <form
        action={saveReviewPolicy}
        className="space-y-6 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <input type="hidden" name="code" value={code} />

        <fieldset>
          <legend
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
            title="The roles whose sign-off is required. Each user's role lives on their profile (Settings → Users)."
          >
            Required roles
          </legend>
          <RolesField initial={initialRoles} />
        </fieldset>

        <div className="grid gap-5 border-t border-zinc-100 pt-5 md:grid-cols-2">
          <label className="block text-sm">
            <span
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
              title="How many distinct approvals are needed before a draft can be published. Distinct = different roles or different users, not the same person voting twice."
            >
              Minimum approvals
            </span>
            <input
              name="min_approvals"
              type="number"
              min={1}
              defaultValue={initialMin}
              className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[11px] text-zinc-500">
              1 = first approval ships it. 2+ = needs more eyes.
            </span>
          </label>

          <label className="block text-sm">
            <span
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
              title="An item that has been waiting longer than this is flagged as stuck. Currently informational; the inbox sorts oldest-first regardless."
            >
              Escalate after (days)
            </span>
            <input
              name="escalate_after_days"
              type="number"
              min={0}
              defaultValue={initialEscalate}
              className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[11px] text-zinc-500">
              0 disables the flag. Default is 7.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-5">
          <SubmitButton
            pendingLabel="Saving…"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Save policy
          </SubmitButton>
          <span className="text-xs text-zinc-500">
            Saving applies to the next draft submitted. Items already in the
            inbox keep the policy that was active when they were submitted.
          </span>
        </div>
      </form>
    </div>
  );
}
