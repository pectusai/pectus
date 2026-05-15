"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { InfoDot } from "@/app/components/InfoDot";

type Manifest = {
  name: string;
  type: "inbound" | "outbound" | "unknown";
  version: string;
  description: string;
};

type ActivationCount = { name: string; count: number };

type Filter = "all" | "outbound" | "inbound" | "unknown";

export function AppCatalog({
  manifests,
  activations,
}: {
  manifests: Manifest[];
  activations: ActivationCount[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c = { outbound: 0, inbound: 0, unknown: 0 };
    for (const m of manifests) c[m.type] += 1;
    return c;
  }, [manifests]);

  const activationMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of activations) m.set(a.name, a.count);
    return m;
  }, [activations]);

  const visible = useMemo(() => {
    if (filter === "all") return manifests;
    return manifests.filter((m) => m.type === filter);
  }, [manifests, filter]);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {chip("all", "All", manifests.length)}
        {chip("outbound", "Outbound", counts.outbound)}
        {chip("inbound", "Inbound", counts.inbound)}
        {counts.unknown > 0 ? chip("unknown", "Other", counts.unknown) : null}
      </div>

      {filter === "all" ? (
        <Grouped manifests={manifests} activations={activationMap} counts={counts} />
      ) : (
        <FlatList manifests={visible} activations={activationMap} />
      )}
    </div>
  );
}

function Grouped({
  manifests,
  activations,
  counts,
}: {
  manifests: Manifest[];
  activations: Map<string, number>;
  counts: { outbound: number; inbound: number; unknown: number };
}) {
  const outbound = manifests.filter((m) => m.type === "outbound");
  const inbound = manifests.filter((m) => m.type === "inbound");
  const other = manifests.filter((m) => m.type === "unknown");

  return (
    <div className="space-y-8">
      {outbound.length > 0 ? (
        <Section
          title="Outbound apps"
          helper="Apps that publish or present data — content-insights today, future WordPress / Storyblok / ecom storefronts."
          count={counts.outbound}
          manifests={outbound}
          activations={activations}
        />
      ) : null}
      {inbound.length > 0 ? (
        <Section
          title="Inbound apps"
          helper="Apps that pull data into Pectus — Search Console, GA4, ad platforms, manual keyword lists."
          count={counts.inbound}
          manifests={inbound}
          activations={activations}
        />
      ) : null}
      {other.length > 0 ? (
        <Section
          title="Other"
          helper="Apps without a declared type in their APP.md frontmatter."
          count={counts.unknown}
          manifests={other}
          activations={activations}
        />
      ) : null}
    </div>
  );
}

function Section({
  title,
  helper,
  count,
  manifests,
  activations,
}: {
  title: string;
  helper: string;
  count: number;
  manifests: Manifest[];
  activations: Map<string, number>;
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
      <FlatList manifests={manifests} activations={activations} />
    </section>
  );
}

function FlatList({
  manifests,
  activations,
}: {
  manifests: Manifest[];
  activations: Map<string, number>;
}) {
  if (manifests.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
        No apps in this group.
      </p>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {manifests.map((m) => {
        const projectCount = activations.get(m.name) ?? 0;
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
  );
}
