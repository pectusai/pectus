"use client";

import { useEffect, useState } from "react";

type SectionDef = {
  id: string;
  label: string;
  count?: string;
};

export function SectionNav({ sections }: { sections: SectionDef[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    setActive(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="sticky top-0 z-30 -mx-4 mt-6 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur">
      <nav
        className="flex items-center gap-1 overflow-x-auto py-2"
        aria-label="Insights sections"
      >
        {sections.map((s) => {
          const isActive = s.id === active;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => onClick(e, s.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-tight transition no-underline ${
                isActive
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {s.label}
              {s.count ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {s.count}
                </span>
              ) : null}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
