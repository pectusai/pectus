import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listAppManifests } from "@/lib/apps";
import { createServiceClient } from "@pectus/supabase";
import { AppCatalog } from "./AppCatalog";

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

  const plain = manifests.map((m) => ({
    name: m.name,
    type: m.type,
    version: m.version,
    description: m.description,
  }));

  const activations = Array.from(counts.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Every app installed in this Pectus. Filter by type to see how many
          inbound (data providers) and outbound (consumer apps with their own
          surfaces) you have. To activate an app for a project, open the
          project and visit its Apps page.
        </p>
      </header>

      <AppCatalog manifests={plain} activations={activations} />

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
