"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { InfoDot } from "@/app/components/InfoDot";

export function SidebarHeadingLink({
  href,
  label,
  tooltip,
}: {
  href: string;
  label: string;
  tooltip?: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (pathname?.startsWith(href + "/") ?? false);
  return (
    <Link
      href={href}
      className="pectus-sidebar-section-heading"
      data-active={isActive ? "true" : undefined}
    >
      <span className="pectus-sidebar-section-label">
        {label}
        {tooltip ? <InfoDot text={tooltip} /> : null}
      </span>
      <span aria-hidden className="pectus-sidebar-section-chevron">
        →
      </span>
    </Link>
  );
}
