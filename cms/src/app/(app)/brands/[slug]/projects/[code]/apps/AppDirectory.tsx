"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { InfoDot } from "@/app/components/InfoDot";
import { activateAction, deactivateAction } from "./actions";

type Manifest = {
  name: string;
  type: "inbound" | "outbound" | "unknown";
  version: string;
  description: string;
  comingSoon: boolean;
};

type Filter = "all" | "outbound" | "inbound" | "unknown";

export function AppDirectory({
  manifests,
  active,
  brandSlug,
  projectCode,
}: {
  manifests: Manifest[];
  active: string[];
  brandSlug: string;
  projectCode: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const activeSet = useMemo(() => new Set(active), [active]);

  const counts = useMemo(() => {
    const c = { outbound: 0, inbound: 0, unknown: 0 };
    for (const m of manifests) c[m.type] += 1;
    return c;
  }, [manifests]);

  const visible = useMemo(() => {
    const sorted = [...manifests].sort((a, b) => {
      const aOn = activeSet.has(a.name);
      const bOn = activeSet.has(b.name);
      if (aOn !== bOn) return aOn ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    if (filter === "all") return sorted;
    return sorted.filter((m) => m.type === filter);
  }, [manifests, activeSet, filter]);

  const chip = (id: Filter, label: string, count: number) => {
    const on = filter === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setFilter(id)}
        className={
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition " +
          (on
            ? "border-zinc-900 bg-zinc-900 text-white"
            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50")
        }
        aria-pressed={on}
      >
        <span>{label}</span>
        <span
          className={
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums " +
            (on ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600")
          }
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {chip("all", "All", manifests.length)}
        {chip("outbound", "Outbound", counts.outbound)}
        {chip("inbound", "Inbound", counts.inbound)}
        {counts.unknown > 0 ? chip("unknown", "Other", counts.unknown) : null}
      </div>

      {filter === "all" ? (
        <GroupedView
          manifests={visible}
          activeSet={activeSet}
          brandSlug={brandSlug}
          projectCode={projectCode}
          counts={counts}
        />
      ) : (
        <FlatList
          manifests={visible}
          activeSet={activeSet}
          brandSlug={brandSlug}
          projectCode={projectCode}
        />
      )}
    </div>
  );
}

function GroupedView({
  manifests,
  activeSet,
  brandSlug,
  projectCode,
  counts,
}: {
  manifests: Manifest[];
  activeSet: Set<string>;
  brandSlug: string;
  projectCode: string;
  counts: { outbound: number; inbound: number; unknown: number };
}) {
  const outbound = manifests.filter((m) => m.type === "outbound");
  const inbound = manifests.filter((m) => m.type === "inbound");
  const other = manifests.filter((m) => m.type === "unknown");

  return (
    <div className="space-y-8">
      {outbound.length > 0 ? (
        <Group
          title="Outbound apps"
          helper="Apps that publish or present data — content-insights, future WordPress / Storyblok / ecom storefronts."
          count={counts.outbound}
          manifests={outbound}
          activeSet={activeSet}
          brandSlug={brandSlug}
          projectCode={projectCode}
        />
      ) : null}
      {inbound.length > 0 ? (
        <Group
          title="Inbound apps"
          helper="Apps that pull data into Pectus — Search Console, GA4, ad platforms, manual keyword lists."
          count={counts.inbound}
          manifests={inbound}
          activeSet={activeSet}
          brandSlug={brandSlug}
          projectCode={projectCode}
        />
      ) : null}
      {other.length > 0 ? (
        <Group
          title="Other"
          helper="Apps without a declared type in their APP.md frontmatter."
          count={counts.unknown}
          manifests={other}
          activeSet={activeSet}
          brandSlug={brandSlug}
          projectCode={projectCode}
        />
      ) : null}
    </div>
  );
}

function Group({
  title,
  helper,
  count,
  manifests,
  activeSet,
  brandSlug,
  projectCode,
}: {
  title: string;
  helper: string;
  count: number;
  manifests: Manifest[];
  activeSet: Set<string>;
  brandSlug: string;
  projectCode: string;
}) {
  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-700">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">{helper}</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600 tabular-nums">
          {count}
        </span>
      </header>
      <FlatList
        manifests={manifests}
        activeSet={activeSet}
        brandSlug={brandSlug}
        projectCode={projectCode}
      />
    </section>
  );
}

function FlatList({
  manifests,
  activeSet,
  brandSlug,
  projectCode,
}: {
  manifests: Manifest[];
  activeSet: Set<string>;
  brandSlug: string;
  projectCode: string;
}) {
  if (manifests.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
        No apps in this group.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {manifests.map((m) => (
        <AppCard
          key={m.name}
          manifest={m}
          on={activeSet.has(m.name)}
          brandSlug={brandSlug}
          projectCode={projectCode}
        />
      ))}
    </ul>
  );
}

function AppCard({
  manifest,
  on,
  brandSlug,
  projectCode,
}: {
  manifest: Manifest;
  on: boolean;
  brandSlug: string;
  projectCode: string;
}) {
  const soon = manifest.comingSoon;
  return (
    <li
      className={
        "flex flex-col rounded-lg border bg-white p-4 " +
        (soon ? "border-dashed border-zinc-300" : "border-zinc-200")
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-mono text-sm font-semibold text-zinc-900">
          {manifest.name}
        </h3>
        <span
          className={
            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest " +
            (soon
              ? "bg-amber-50 text-amber-800"
              : on
                ? "bg-emerald-50 text-emerald-700"
                : "bg-zinc-100 text-zinc-600")
          }
          title={
            soon
              ? "This app is announced but not yet built. You'll be able to activate it once the fetch pipeline ships."
              : on
                ? "This app is active for this project. Its surfaces appear in the sidebar."
                : "Available but not yet active for this project."
          }
        >
          {soon ? "Coming soon" : on ? "Active" : "Available"}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-widest text-zinc-500">
          {manifest.type}
        </span>
        <InfoDot
          text={
            manifest.type === "inbound"
              ? "Inbound apps pull data into Pectus (analytics, search console, ad spend)."
              : manifest.type === "outbound"
                ? "Outbound apps publish content somewhere (e.g. content-insights renders to a static site)."
                : "Unknown type. APP.md frontmatter is missing a type field."
          }
        />
        <span className="text-[11px] text-zinc-400">v{manifest.version}</span>
      </div>
      <p className="mt-2 flex-1 text-sm text-zinc-600">
        {manifest.description || "No description in APP.md frontmatter."}
      </p>
      {soon ? (
        <button
          type="button"
          disabled
          className="mt-4 cursor-not-allowed rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-400"
          title="Coming soon. Activation opens once the fetch pipeline ships."
        >
          Coming soon
        </button>
      ) : (
        <form
          action={on ? deactivateAction : activateAction}
          className="mt-4"
        >
          <input type="hidden" name="app_name" value={manifest.name} />
          <input type="hidden" name="project_code" value={projectCode} />
          <input type="hidden" name="brand_slug" value={brandSlug} />
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
      )}
    </li>
  );
}
