import { getBrandBySlug } from "@/lib/active-brand";

// Next.js 16 forbids cookie writes from Server Components. The
// LAST_BRAND_COOKIE write that used to live here is duplicated by the
// middleware which already sets it on every /brands/<slug>/... request.
// See cms/src/middleware.ts for the cookie-set logic.

export default async function BrandLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  await getBrandBySlug(slug);
  return <>{children}</>;
}
