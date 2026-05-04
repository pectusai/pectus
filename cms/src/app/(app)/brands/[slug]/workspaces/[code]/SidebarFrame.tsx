"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function SidebarFrame({
  header,
  nav,
  children,
}: {
  header: React.ReactNode;
  nav: React.ReactNode;
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
        <span className="text-sm font-medium text-zinc-700">Workspace</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="workspace-sidebar"
          className="inline-flex items-center gap-2 rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          <span aria-hidden>≡</span>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <aside
        id="workspace-sidebar"
        className={`${
          open ? "block" : "hidden"
        } w-full shrink-0 border-b border-zinc-200 bg-white lg:block lg:w-60 lg:border-b-0 lg:border-r`}
      >
        <div className="border-b border-zinc-200 px-5 py-5">{header}</div>
        <nav className="space-y-3 p-4">{nav}</nav>
      </aside>
      <main className="mx-auto w-full max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
