import { requireUser } from "@/lib/auth";
import { SettingsNav } from "@/app/components/SettingsNav";

export default async function BrandSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <SettingsNav activeBrandSlug={slug} />
      {children}
    </div>
  );
}
