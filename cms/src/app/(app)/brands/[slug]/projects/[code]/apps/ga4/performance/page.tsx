import { getBrandBySlug } from "@/lib/active-brand";
import { getProjectByCode } from "@/lib/project";
import { checkPrereqs } from "@/lib/prereqs";
import { NeedsCard } from "@/app/components/NeedsCard";

export default async function PerformancePage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const brand = await getBrandBySlug(slug);
  const project = await getProjectByCode(code);

  const prereq = await checkPrereqs("ga4-performance", {
    brandId: brand.id,
    brandSlug: slug,
    projectId: project.id,
    projectCode: code,
  });
  if (!prereq.ok) {
    return (
      <NeedsCard
        title="Performance needs the GA4 integration"
        appContext="Pectus reads sessions, conversions, and traffic sources from GA4. Connect the service account and pick a property to see metrics here."
        missing={prereq.missing}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
        <p className="mt-1 text-sm text-zinc-600">
          GA4 + Search Console metrics for this project.
        </p>
      </header>
      <p className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
        Live performance dashboard ships in v0.4.3. Prerequisites verified —
        this surface lights up once the dashboard component lands.
      </p>
    </div>
  );
}
