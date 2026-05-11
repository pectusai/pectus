import { createServerClient, createServiceClient } from "@pectus/supabase";
import { requireUser } from "@/lib/auth";
import { BrandForm } from "./BrandForm";
import { loadBrand } from "./actions";
import { ImageGenSection } from "./ImageGenSection";
import type { Camera } from "@/lib/brand-types";

function maskKey(value: string): string {
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createServerClient();

  const { data: brandRow } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const service = createServiceClient();
  const { data: integrationRows } = await service
    .from("integrations")
    .select("provider, service_account_json")
    .eq("brand_id", brandRow?.id ?? "")
    .in("provider", ["google_genai", "fal", "replicate"]);

  const keyByProvider: Record<string, string | null> = {
    google_genai: null,
    fal: null,
    replicate: null,
  };
  for (const row of integrationRows ?? []) {
    const k = (row.service_account_json as { api_key?: string } | null)
      ?.api_key ?? null;
    keyByProvider[row.provider as string] = k;
  }
  const apiKeyMasked = keyByProvider.google_genai
    ? maskKey(keyByProvider.google_genai)
    : null;
  const falKeyMasked = keyByProvider.fal ? maskKey(keyByProvider.fal) : null;
  const replicateKeyMasked = keyByProvider.replicate
    ? maskKey(keyByProvider.replicate)
    : null;

  const referenceUrls = (
    Array.isArray(brandRow?.reference_image_urls)
      ? (brandRow!.reference_image_urls as string[])
      : []
  ).filter((u): u is string => typeof u === "string");
  type StoredPhoto = {
    id: string;
    url: string;
    storage_path: string;
    description: string;
  };
  type StoredCategory = { id: string; label: string; photos: StoredPhoto[] };
  const photoCategories: StoredCategory[] = Array.isArray(
    brandRow?.example_photo_categories,
  )
    ? (brandRow!.example_photo_categories as StoredCategory[])
    : [];
  const cameras = (
    Array.isArray(brandRow?.cameras) ? (brandRow!.cameras as Camera[]) : []
  );

  // Pectus is single-user-mode (per feedback_pectus_single_user.md), so any
  // authenticated user can edit the brand. The save action is service-role.
  const canEdit = true;
  const fileBrand = await loadBrand(slug);

  /* DB is the source of truth for fields the CMS edits, but fall back to the
   * brand.json mirror for fields not yet persisted (or before first save). */
  const dbColors = (brandRow?.colors ?? {}) as Partial<typeof fileBrand.colors>;
  const dbFonts = (brandRow?.fonts ?? {}) as Partial<typeof fileBrand.fonts>;
  const dbFontSizes = (brandRow?.font_sizes ?? {}) as Partial<
    typeof fileBrand.font_sizes
  >;

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
    colors: { ...fileBrand.colors, ...dbColors },
    fonts: {
      heading: { ...fileBrand.fonts.heading, ...(dbFonts.heading ?? {}) },
      body: { ...fileBrand.fonts.body, ...(dbFonts.body ?? {}) },
      mono: { ...fileBrand.fonts.mono, ...(dbFonts.mono ?? {}) },
    },
    font_sizes: { ...fileBrand.font_sizes, ...dbFontSizes },
    radius:
      (brandRow?.radius as typeof fileBrand.radius | null) ?? fileBrand.radius,
    imported_from:
      (brandRow?.imported_from as typeof fileBrand.imported_from | null) ??
      fileBrand.imported_from,
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Brand</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Global brand identity. Voice, colors, fonts, and guidelines apply to
          every project and to the public hub.
        </p>
      </div>

      <BrandForm initial={initial} canEdit={canEdit} brandSlug={slug} />

      <ImageGenSection
        brandSlug={slug}
        apiKeyMasked={apiKeyMasked}
        falKeyMasked={falKeyMasked}
        replicateKeyMasked={replicateKeyMasked}
        referenceUrls={referenceUrls}
        photoCategories={photoCategories}
        cameras={cameras}
      />
    </div>
  );
}
