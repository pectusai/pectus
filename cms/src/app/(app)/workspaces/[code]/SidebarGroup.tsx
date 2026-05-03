"use client";

import { useEffect, useState } from "react";
import { InfoDot } from "@/app/components/InfoDot";

export function SidebarGroup({
  id,
  label,
  tooltip,
  children,
}: {
  id: string;
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  const storageKey = `pectus.sidebar.${id}.open`;
  const [open, setOpen] = useState(true);
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
    <div style={{ visibility: hydrated ? "visible" : "hidden" }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-800"
      >
        <span className="inline-flex items-center gap-1.5">
          {label}
          {tooltip ? <InfoDot text={tooltip} /> : null}
        </span>
        <span
          aria-hidden
          className={`text-xs leading-none transition-transform ${
            open ? "rotate-90" : ""
          }`}
        >
          ›
        </span>
      </button>
      {open ? <div className="mt-1 space-y-0.5">{children}</div> : null}
    </div>
  );
}
