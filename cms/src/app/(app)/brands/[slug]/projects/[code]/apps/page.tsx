import { listAppManifests, listActivatedAppsForProject } from "@/lib/apps";
import { getProjectByCode } from "@/lib/project";
import { activateAction, deactivateAction } from "./actions";
import { SubmitButton } from "@/app/components/SubmitButton";
import { InfoDot } from "@/app/components/InfoDot";

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
  const activeSet = new Set(activated);

  const sorted = [...manifests].sort((a, b) => {
    const aOn = activeSet.has(a.name);
    const bOn = activeSet.has(b.name);
    if (aOn !== bOn) return aOn ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Activate the apps you want this project to use. Each activated app
          adds its surfaces to the sidebar. Apps work independently — turn one
          on without configuring another.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sorted.map((m) => {
          const on = activeSet.has(m.name);
          return (
            <li
              key={m.name}
              className="flex flex-col rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-mono text-sm font-semibold text-zinc-900">
                  {m.name}
                </h2>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest " +
                    (on
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-zinc-100 text-zinc-600")
                  }
                  title={
                    on
                      ? "This app is active for this project. Its surfaces appear in the sidebar."
                      : "Available but not yet active for this project."
                  }
                >
                  {on ? "Active" : "Available"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-widest text-zinc-500">
                  {m.type}
                </span>
                <InfoDot
                  text={
                    m.type === "inbound"
                      ? "Inbound apps pull data into Pectus (analytics, search console, ad spend)."
                      : m.type === "outbound"
                        ? "Outbound apps publish content somewhere (e.g. content-hub renders to a static site)."
                        : "Unknown type. APP.md frontmatter is missing a type field."
                  }
                />
                <span className="text-[11px] text-zinc-400">v{m.version}</span>
              </div>
              <p className="mt-2 flex-1 text-sm text-zinc-600">
                {m.description || "No description in APP.md frontmatter."}
              </p>
              <form
                action={on ? deactivateAction : activateAction}
                className="mt-4"
              >
                <input type="hidden" name="app_name" value={m.name} />
                <input type="hidden" name="project_code" value={code} />
                <input type="hidden" name="brand_slug" value={slug} />
                <SubmitButton
                  pendingLabel={on ? "Deactivating…" : "Activating…"}
                  className={
                    on
                      ? "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      : "rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                  }
                >
                  {on ? "Deactivate" : "Activate"}
                </SubmitButton>
              </form>
            </li>
          );
        })}
      </ul>

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
