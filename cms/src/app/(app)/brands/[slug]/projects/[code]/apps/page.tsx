import { listAppManifests, listActivatedAppsForProject } from "@/lib/apps";
import { getProjectByCode } from "@/lib/project";
import { AppDirectory } from "./AppDirectory";

export default async function ProjectAppsPage({
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

  const plain = manifests
    .filter((m) => !m.comingSoon)
    .map((m) => ({
      name: m.name,
      type: m.type,
      version: m.version,
      description: m.description,
      comingSoon: m.comingSoon,
    }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Activate the apps you want this project to use. Each activated app
          adds its surfaces to the sidebar. Apps work independently — turn one
          on without configuring another. Filter to see only inbound (data
          providers) or outbound (consumer apps with their own surfaces).
          Coming-soon apps are listed in the{" "}
          <a className="underline" href="/apps">
            global apps directory
          </a>{" "}
          instead.
        </p>
      </header>

      <AppDirectory
        manifests={plain}
        active={activated}
        brandSlug={slug}
        projectCode={code}
      />

      <aside className="rounded-lg border border-dashed border-zinc-300 bg-white p-5">
        <h2 className="text-sm font-semibold">Build your own app</h2>
        <p className="mt-1 max-w-xl text-sm text-zinc-600">
          Apps are folders under <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">apps/</code>. Each one declares
          what it adds in an{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">APP.md</code>{" "}
          file. Drop a new folder in, restart, and it shows up in this list.
        </p>
      </aside>
    </div>
  );
}
