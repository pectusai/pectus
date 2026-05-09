"use client";

import Link from "next/link";

const TABS: Array<{ key: "blank" | "ai" | "suggest"; label: string }> = [
  { key: "ai", label: "AI Write" },
  { key: "blank", label: "Blank" },
  { key: "suggest", label: "Suggest from gaps" },
];

export function ModeTabs({
  brandSlug,
  code,
  active,
}: {
  brandSlug: string;
  code: string;
  active: "blank" | "ai" | "suggest";
}) {
  return (
    <nav
      className="mt-5 flex items-center gap-1 border-b border-zinc-200"
      aria-label="New article mode"
    >
      {TABS.map((t) => {
        const params = new URLSearchParams({ mode: t.key });
        const href = `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles/new?${params.toString()}`;
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={href}
            className={`-mb-px rounded-t-md border-b-2 px-3.5 py-2 text-sm font-medium no-underline transition ${
              isActive
                ? "border-pink-700 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
