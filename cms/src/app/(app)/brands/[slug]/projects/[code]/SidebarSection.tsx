"use client";

import { useEffect, useState } from "react";
import { InfoDot } from "@/app/components/InfoDot";

export function SidebarSection({
  id,
  label,
  tooltip,
  defaultOpen = true,
  children,
}: {
  id: string;
  label: string;
  tooltip?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const storageKey = `pectus.sidebar-section.${id}.open`;
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null) setOpen(stored === "1");
    setHydrated(true);
  }, [storageKey]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(storageKey, next ? "1" : "0");
      return next;
    });
  }

  return (
    <section
      className="pectus-sidebar-section"
      style={{ visibility: hydrated ? "visible" : "hidden" }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="pectus-sidebar-section-heading"
      >
        <span className="pectus-sidebar-section-label">
          {label}
          {tooltip ? <InfoDot text={tooltip} /> : null}
        </span>
        <span
          aria-hidden
          className={`pectus-sidebar-section-chevron ${open ? "is-open" : ""}`}
        >
          ›
        </span>
      </button>
      {open ? (
        <div className="pectus-sidebar-section-body">{children}</div>
      ) : null}
    </section>
  );
}
