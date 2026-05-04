import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@pectus/supabase";

export type Brand = {
  id: string;
  slug: string;
  name: string | null;
  tagline: string | null;
  voice: string | null;
  tonality: string | null;
  guidelines_md: string | null;
  primary_color: string | null;
  website_url: string | null;
  sitemap_url: string | null;
  colors: Record<string, string>;
  fonts: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const LAST_BRAND_COOKIE = "pectus.lastBrand";

export async function getBrandBySlug(slug: string): Promise<Brand> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) notFound();
  return data as Brand;
}

export async function listBrands(): Promise<Brand[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as Brand[];
}

export async function readLastBrandSlug(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(LAST_BRAND_COOKIE)?.value ?? null;
}

export async function writeLastBrandSlug(slug: string): Promise<void> {
  const jar = await cookies();
  jar.set(LAST_BRAND_COOKIE, slug, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
  });
}
