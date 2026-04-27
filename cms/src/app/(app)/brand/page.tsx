import { createServerClient } from "@pectus/supabase";
import { requireUser } from "@/lib/auth";
import { BrandForm } from "./BrandForm";
import { loadBrand } from "./actions";

export default async function BrandPage() {
  const { user } = await requireUser();
  const supabase = await createServerClient();

  const [{ data: profile }, { data: brandRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single(),
    supabase
      .from("brand_profile")
      .select("*")
      .eq("singleton", true)
      .maybeSingle(),
  ]);

  const canEdit = Boolean(profile?.is_admin);
  const fileBrand = await loadBrand();

  /* DB is the source of truth for fields the CMS edits, but fall back to the
   * brand.json mirror for fields not yet persisted (or before first save). */
  const initial = {
    name: (brandRow?.name as string | null) ?? fileBrand.name,
    tagline: (brandRow?.tagline as string | null) ?? fileBrand.tagline,
    website_url:
      (brandRow?.website_url as string | null) ?? fileBrand.website_url,
    sitemap_url:
      (brandRow?.sitemap_url as string | null) ?? fileBrand.sitemap_url,
    voice: (brandRow?.voice as string | null) ?? fileBrand.voice,
    tonality: (brandRow?.tonality as string | null) ?? fileBrand.tonality,
    guidelines_md: (brandRow?.guidelines_md as string | null) ?? "",
    image_model:
      (brandRow?.image_model as string | null) ?? fileBrand.image_model,
    colors: (brandRow?.colors as typeof fileBrand.colors | null) ?? fileBrand.colors,
    fonts: (brandRow?.fonts as typeof fileBrand.fonts | null) ?? fileBrand.fonts,
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Brand</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Global brand identity. Voice, colors, fonts, and guidelines apply to
          every workspace and to the public hub.
        </p>
        {!canEdit ? (
          <p className="mt-2 text-xs text-zinc-500">
            Read-only. Only admins can edit brand settings.
          </p>
        ) : null}
      </div>

      <BrandForm initial={initial} canEdit={canEdit} />
    </div>
  );
}
