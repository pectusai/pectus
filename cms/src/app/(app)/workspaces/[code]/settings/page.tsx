import Link from "next/link";

export default async function WorkspaceSettings({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Workspace settings</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Per-workspace configuration. Brand voice and global config live on{" "}
          <Link href="/brand" className="underline">
            /brand
          </Link>
          .
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href={`/workspaces/${code}/settings/review-policy`}
            className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300"
          >
            <p className="text-sm font-semibold">Review policy</p>
            <p className="mt-1 text-xs text-zinc-600">
              Roles required to approve content, threshold counts, escalation
              SLAs.
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
