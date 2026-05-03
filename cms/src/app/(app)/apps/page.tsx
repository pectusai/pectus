import Link from "next/link";
import { listApps, type AppListing } from "@/lib/apps";

const APP_TOOLTIPS: Record<string, string> = {
  inbound:
    "Inbound apps pull data into Pectus (analytics, search console, ad spend). They feed the analysis skill.",
  outbound:
    "Outbound apps publish content somewhere. content-hub renders your articles into a static site you deploy.",
  unknown:
    "Unknown app type. The APP.md frontmatter is missing a `type:` field.",
  activated: "Active right now. Surfaces and skills are wired into the CMS.",
  available:
    "Installed in this Pectus folder. Open the app to configure it; activation happens when configuration is saved.",
};

export default async function AppsPage() {
  const apps = await listApps();
  const sorted = [...apps].sort((a, b) => {
    if (a.activated !== b.activated) return a.activated ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Apps</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Apps add surfaces, skills, and data sources to Pectus. The CMS is
            minimal by default. Open an app to configure it; saving the config
            activates it.
          </p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
          {sorted.filter((a) => a.activated).length} of {sorted.length} active
        </span>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sorted.map((app) => (
          <AppCard key={app.name} app={app} />
        ))}
      </ul>

      <aside className="mt-10 rounded-lg border border-dashed border-zinc-300 bg-white p-5">
        <h2 className="text-sm font-semibold">Build your own app</h2>
        <p className="mt-1 max-w-xl text-sm text-zinc-600">
          Apps are folders under{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">apps/</code>
          . Each one declares what it adds in an{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
            APP.md
          </code>{" "}
          file. The make-it skill scaffolds a new one in seconds. Full guide
          lands on pectus.ai once the custom domain is live.
        </p>
      </aside>
    </div>
  );
}

function AppCard({ app }: { app: AppListing }) {
  return (
    <li>
      <Link
        href={`/apps/${app.name}`}
        className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-mono text-sm font-semibold text-zinc-900">
            {app.name}
          </h3>
          <StatusBadge activated={app.activated} />
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-widest text-zinc-500">
            {app.type}
          </span>
          <InfoDot text={APP_TOOLTIPS[app.type] ?? ""} />
          <span className="text-[11px] text-zinc-400">v{app.version}</span>
        </div>

        <p className="mt-3 flex-1 text-sm text-zinc-600">
          {app.description || "No description in APP.md frontmatter."}
        </p>

        <span className="mt-4 inline-block text-xs font-medium text-blue-600">
          Open app →
        </span>
      </Link>
    </li>
  );
}

function StatusBadge({ activated }: { activated: boolean }) {
  return (
    <span
      title={
        activated
          ? APP_TOOLTIPS.activated
          : APP_TOOLTIPS.available
      }
      className={
        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest " +
        (activated
          ? "bg-emerald-50 text-emerald-700"
          : "bg-zinc-100 text-zinc-600")
      }
    >
      {activated ? "Activated" : "Available"}
    </span>
  );
}

function InfoDot({ text }: { text: string }) {
  if (!text) return null;
  return (
    <span
      title={text}
      aria-label={text}
      className="inline-flex h-3 w-3 cursor-help items-center justify-center rounded-full border border-zinc-300 text-[8px] font-bold text-zinc-500"
    >
      ?
    </span>
  );
}
