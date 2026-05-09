"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ProjectOption = {
  id: string;
  name: string;
  code: string;
  locale: string | null;
};

export function ProjectHeaderSwitcher({
  brandSlug,
  current,
  projects,
}: {
  brandSlug: string;
  current: ProjectOption;
  projects: ProjectOption[];
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="pectus-project-header">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`pectus-project-header-trigger ${open ? "is-open" : ""}`}
      >
        <span className="pectus-project-header-name">{current.name}</span>
        <span aria-hidden className="pectus-project-header-chevron">
          {open ? "▴" : "▾"}
        </span>
        <span className="pectus-project-header-code">
          {current.code}
          {current.locale ? ` · ${current.locale}` : ""}
        </span>
      </button>

      {open ? (
        <div ref={popoverRef} className="pectus-project-popover" role="menu">
          <div className="pectus-project-popover-section">
            <div className="pectus-project-popover-label">Switch project</div>
            <ul className="pectus-project-popover-list">
              {projects.length === 0 ? (
                <li className="pectus-project-popover-empty">
                  No other projects yet.
                </li>
              ) : (
                projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/brands/${brandSlug}/projects/${p.code}`}
                      className={`pectus-project-popover-item ${
                        p.id === current.id ? "is-current" : ""
                      }`}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                    >
                      <span className="pectus-project-popover-item-name">
                        {p.name}
                      </span>
                      <span className="pectus-project-popover-item-meta">
                        {p.code}
                        {p.locale ? ` · ${p.locale}` : ""}
                      </span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="pectus-project-popover-section pectus-project-popover-section-quiet">
            <Link
              href={`/brands/${brandSlug}/projects/${current.code}/apps`}
              className="pectus-project-popover-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="pectus-project-popover-item-name">
                Manage apps
              </span>
              <span className="pectus-project-popover-item-meta">
                Activate or pause
              </span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
