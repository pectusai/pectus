import Link from "next/link";

type Workspace = { id: string; code: string; name: string };

export function SeedKeywordsDetail({
  workspaces,
}: {
  workspaces: Workspace[];
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">
        Per-workspace seed keywords
      </h2>
      <p className="mt-1 text-xs text-zinc-600">
        Seed keywords live with the workspace they belong to. Pick a workspace
        to add or edit its seed keywords. The list bootstraps the analysis
        skill when there&apos;s no live traffic data yet.
      </p>

      {workspaces.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500">
          No workspaces yet. Create one from the CLI first.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {workspaces.map((w) => (
            <li key={w.id}>
              <Link
                href={`/workspaces/${w.code}/settings/seed-keywords`}
                className="block rounded-md border border-zinc-200 bg-white p-3 text-sm transition hover:border-zinc-300"
              >
                <p className="font-medium text-zinc-900">{w.name}</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">
                  {w.code}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
