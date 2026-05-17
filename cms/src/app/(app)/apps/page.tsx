import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listAppManifests } from "@/lib/apps";
import { AppCatalog } from "./AppCatalog";

export default async function GlobalAppsPage() {
  await requireUser();
  const manifests = await listAppManifests();

  const plain = manifests.map((m) => ({
    name: m.name,
    type: m.type,
    version: m.version,
    description: m.description,
    comingSoon: m.comingSoon,
  }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Every app that ships with this Pectus install. Activation is
          per-project — open a project and use its Apps page to switch on
          what you need.
        </p>
      </header>

      <AppCatalog manifests={plain} />

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
