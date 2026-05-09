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
    <nav className="pectus-mode-tabs" aria-label="New article mode">
      {TABS.map((t) => {
        const params = new URLSearchParams({ mode: t.key });
        const href = `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles/new?${params.toString()}`;
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={href}
            className={`pectus-mode-tab ${isActive ? "is-active" : ""}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
