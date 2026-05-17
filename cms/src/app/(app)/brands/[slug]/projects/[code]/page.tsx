import Link from "next/link";
import { getProjectByCode } from "@/lib/project";
import { listAppManifests, listActivatedAppsForProject } from "@/lib/apps";
import { WelcomeBanner } from "./WelcomeBanner";

export default async function ProjectHomePage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const project = await getProjectByCode(code);
  const [manifests, activated] = await Promise.all([
    listAppManifests(),
    listActivatedAppsForProject(project.id),
  ]);
  const activeSet = new Set(activated);
  const activeApps = manifests.filter((m) => activeSet.has(m.name));

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {project.name}
        </h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">
          {project.code} · {project.locale}
        </p>
      </header>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Activated apps</h2>
          <Link
            href={`/brands/${slug}/projects/${code}/apps`}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Browse apps →
          </Link>
        </div>

        {activeApps.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No apps active yet. Open the{" "}
            <Link
              href={`/brands/${slug}/projects/${code}/apps`}
              className="underline"
            >
              Apps page
            </Link>{" "}
            to activate one.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {activeApps.map((m) => (
              <li
                key={m.name}
                className="flex items-baseline justify-between rounded-md border border-zinc-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-zinc-900">
                    {m.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {m.description || "No description in APP.md frontmatter."}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
                  Active
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
