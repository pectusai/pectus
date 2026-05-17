import Link from "next/link";
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Brand — {brand.name ?? brand.slug}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Brand-level settings. Renaming the slug changes the URL of every page
          inside this brand. Deleting removes every project, integration,
          insight, and review item attached to it.
        </p>
      </div>

      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-700">
          Integrations
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          External credentials shared across this brand&apos;s projects.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link
              href={`/brands/${slug}/settings/integrations/google`}
              className="text-blue-600 hover:text-blue-800"
            >
              Google (GA4 + Search Console + Ads) →
            </Link>
          </li>
        </ul>
      </div>

      <SettingsForms brand={brand} />
    </div>
  );
}
