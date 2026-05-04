import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listAppManifests } from "@/lib/apps";
import { createServiceClient } from "@pectus/supabase";
import { InfoDot } from "@/app/components/InfoDot";

type ActivationCount = { app_name: string; project_count: number };

export default async function GlobalAppsPage() {
  await requireUser();
  const manifests = await listAppManifests();

  // Count active installs per app across every project, so the directory
  // can show "Active in 2 projects" without having to load each one.
  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from("activated_apps")
    .select("app_name, status");
  const counts = new Map<string, number>();
  for (const r of rows ?? []) {
    if (r.status !== "active") continue;
    counts.set(r.app_name as string, (counts.get(r.app_name as string) ?? 0) + 1);
  }

  const inbound = manifests.filter((m) => m.type === "inbound");
  const outbound = manifests.filter((m) => m.type === "outbound");
  const other = manifests.filter(
    (m) => m.type !== "inbound" && m.type !== "outbound",
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Every app installed in this Pectus. Apps are how Pectus connects
          data sources and runs workflows. To activate an app, open a project
          and visit its Apps page.
        </p>
      </header>

      <Section
        title="Outbound apps"
        helper="Apps that publish or present data — articles, dashboards, reports."
        manifests={outbound}
        counts={counts}
      />
      <Section
        title="Inbound apps"
        helper="Apps that pull data into Pectus — analytics, search console, ad platforms, manual lists."
        manifests={inbound}
        counts={counts}
      />
      {other.length > 0 ? (
        <Section
          title="Other"
          helper="Apps without a declared type."
          manifests={other}
          counts={counts}
        />
      ) : null}

      <aside className="mt-10 rounded-lg border border-dashed border-zinc-300 bg-white p-5">
        <h2 className="text-sm font-semibold">Where do I activate an app?</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Activation is per-project. Open a project from the{" "}
          <Link href="/brands" className="underline">
            Brands list
          </Link>
          , then click <strong>Apps</strong> in the project sidebar to switch
          on what you need.
        </p>
      </aside>
    </div>
  );
}

function Section({
  title,
  helper,
  manifests,
  counts,
}: {
  title: string;
  helper: string;
  manifests: Awaited<ReturnType<typeof listAppManifests>>;
  counts: Map<string, number>;
}) {
  if (manifests.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-700">
        {title}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {manifests.map((m) => {
          const projectCount = counts.get(m.name) ?? 0;
          return (
            <li
              key={m.name}
              className="flex flex-col rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-mono text-sm font-semibold text-zinc-900">
                  {m.name}
                </h3>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest " +
                    (projectCount > 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-zinc-100 text-zinc-600")
                  }
                  title={
                    projectCount > 0
                      ? `Active in ${projectCount} project${projectCount === 1 ? "" : "s"}.`
                      : "Installed but not active in any project yet."
                  }
                >
                  {projectCount > 0 ? `Active · ${projectCount}` : "Installed"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-widest text-zinc-500">
                  {m.type}
                </span>
                <InfoDot
                  text={
                    m.type === "inbound"
                      ? "Inbound apps pull data into Pectus."
                      : m.type === "outbound"
                        ? "Outbound apps publish or present data."
                        : "Type not declared in APP.md."
                  }
                />
                <span className="text-[11px] text-zinc-400">v{m.version}</span>
              </div>
              <p className="mt-2 flex-1 text-sm text-zinc-600">
                {m.description || "No description in APP.md frontmatter."}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
