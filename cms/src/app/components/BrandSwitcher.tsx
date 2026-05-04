"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { switchBrand } from "@/lib/brand-switch";
import type { Brand } from "@/lib/active-brand";

export function BrandSwitcher({
  brands,
  activeSlug,
}: {
  brands: Brand[];
  activeSlug: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (brands.length === 0) return null;

  return (
    <select
      className="pectus-nav-brand-switch"
      value={activeSlug ?? ""}
      disabled={pending}
      onChange={(e) => {
        const targetSlug = e.target.value;
        if (!targetSlug || targetSlug === activeSlug) return;
        startTransition(async () => {
          const target = await switchBrand(pathname, targetSlug);
          router.push(target);
        });
      }}
    >
      {activeSlug ? null : (
        <option value="" disabled>
          Pick a brand…
        </option>
      )}
      {brands.map((b) => (
        <option key={b.id} value={b.slug}>
          {b.name ?? b.slug}
        </option>
      ))}
    </select>
  );
}
