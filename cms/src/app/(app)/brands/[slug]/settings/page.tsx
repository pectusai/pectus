import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { SettingsForms } from "./SettingsForms";

export default async function BrandSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireUser();
  const brand = await getBrandBySlug(slug);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Settings — {brand.name ?? brand.slug}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Brand-level settings. Renaming the slug changes the URL of every page
          inside this brand. Deleting removes every workspace, integration,
          insight, and review item attached to it.
        </p>
      </div>

      <SettingsForms brand={brand} />
    </div>
  );
}
