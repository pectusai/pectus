"use server";

import { createServerClient } from "@pectus/supabase";
import { listBrands } from "@/lib/active-brand";

const STABLE_TOPS = new Set(["profile", "apps", "reviews", "performance", "settings"]);

export async function switchBrand(
  currentPath: string,
  targetSlug: string,
): Promise<string> {
  const brands = await listBrands();
  const target = brands.find((b) => b.slug === targetSlug);
  if (!target) return "/brands";

  const segments = currentPath.split("/").filter(Boolean);
  if (segments[0] !== "brands" || !segments[1]) {
    return `/brands/${targetSlug}`;
  }

  const tail = segments.slice(2);
  if (tail.length === 0) return `/brands/${targetSlug}`;

  const head = tail[0];

  if (head === "workspaces" && tail[1]) {
    const code = tail[1];
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("workspaces")
      .select("id")
      .eq("brand_id", target.id)
      .eq("code", code)
      .maybeSingle();
    if (data) {
      return "/" + ["brands", targetSlug, ...tail].join("/");
    }
    return `/brands/${targetSlug}`;
  }

  if (STABLE_TOPS.has(head)) {
    return "/" + ["brands", targetSlug, ...tail].join("/");
  }

  return `/brands/${targetSlug}`;
}
