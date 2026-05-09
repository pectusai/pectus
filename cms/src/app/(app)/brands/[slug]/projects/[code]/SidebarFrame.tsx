"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function SidebarFrame({
  header,
  nav,
  footer,
  children,
}: {
  header?: React.ReactNode;
  nav: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="lg:flex lg:items-stretch">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 lg:hidden">
        <span className="text-sm font-medium text-zinc-700">Project</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="project-sidebar"
          className="inline-flex items-center gap-2 rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          <span aria-hidden>≡</span>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <aside
        id="project-sidebar"
        className={`${
          open ? "block" : "hidden"
        } pectus-sidebar w-full shrink-0 border-b border-zinc-200 bg-white lg:block lg:w-64 lg:border-b-0 lg:border-r`}
      >
        <div className="pectus-sidebar-inner">
          {header ? (
            <div className="pectus-sidebar-header">{header}</div>
          ) : null}
          <nav className="pectus-sidebar-nav">{nav}</nav>
          {footer ? (
            <div className="pectus-sidebar-footer">{footer}</div>
          ) : null}
        </div>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
