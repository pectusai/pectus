"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorkspaceNav({ code }: { code: string }) {
  const pathname = usePathname();

  const inactive = "text-zinc-500 hover:text-zinc-900";
  const active = "font-medium text-zinc-900";

  const linkClass = (href: string, exact = false) => {
    const isActive = exact
      ? pathname === href
      : pathname === href || pathname?.startsWith(href + "/");
    return isActive ? active : inactive;
  };

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-4 border-b border-zinc-200 pb-2 text-sm">
      <Link
        href={`/workspaces/${code}/dashboard`}
        className={linkClass(`/workspaces/${code}/dashboard`)}
      >
        Dashboard
      </Link>
      <Link
        href={`/workspaces/${code}/pages`}
        className={linkClass(`/workspaces/${code}/pages`)}
      >
        Pages
      </Link>
      <Link
        href={`/workspaces/${code}/articles`}
        className={linkClass(`/workspaces/${code}/articles`)}
      >
        Articles
      </Link>
      <Link
        href={`/workspaces/${code}/keywords`}
        className={linkClass(`/workspaces/${code}/keywords`)}
      >
        Keywords
      </Link>
      <Link
        href={`/workspaces/${code}/icp`}
        className={linkClass(`/workspaces/${code}/icp`)}
      >
        ICP
      </Link>
      <Link
        href={`/workspaces/${code}/sources`}
        className={linkClass(`/workspaces/${code}/sources`)}
      >
        Sources
      </Link>
      <Link
        href={`/workspaces/${code}/settings`}
        className={linkClass(`/workspaces/${code}/settings`)}
      >
        Settings
      </Link>
    </nav>
  );
}
