import { getBrandBySlug } from "@/lib/active-brand";
import { getProjectByCode } from "@/lib/project";
import { checkPrereqs } from "@/lib/prereqs";
import { NeedsCard } from "@/app/components/NeedsCard";

export default async function GapPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const brand = await getBrandBySlug(slug);
  const project = await getProjectByCode(code);

  const prereq = await checkPrereqs("gap", {
    brandId: brand.id,
    brandSlug: slug,
    projectId: project.id,
    projectCode: code,
  });
  if (!prereq.ok) {
    return (
      <NeedsCard
        title="Gap analysis needs keywords and ICP"
        appContext="Gap analysis compares what your audience searches for against the pages you have. It needs both inputs."
        missing={prereq.missing}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-zinc-200 pb-6">
        <h2 className="text-2xl font-semibold">Gap analysis</h2>
        <p className="mt-2 max-w-prose text-sm text-zinc-600">
          Compare what your audience is searching for against the pages you
          already have. Each gap is a topic you could cover but haven&apos;t.
        </p>
      </header>
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
        Gap analysis runner ships in v0.4.3. For now this surface confirms
        prerequisites are in place.
      </p>
    </div>
  );
}
