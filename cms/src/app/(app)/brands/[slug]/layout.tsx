import { getBrandBySlug, writeLastBrandSlug } from "@/lib/active-brand";

export default async function BrandLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  await getBrandBySlug(slug);
  await writeLastBrandSlug(slug);
  return <>{children}</>;
}
