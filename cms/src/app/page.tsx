import { redirect } from "next/navigation";
import { listBrands, readLastBrandSlug } from "@/lib/active-brand";

export default async function RootPage() {
  const last = await readLastBrandSlug();
  if (last) {
    const brands = await listBrands();
    if (brands.some((b) => b.slug === last)) redirect(`/brands/${last}`);
  }

  const brands = await listBrands();
  if (brands.length === 1) redirect(`/brands/${brands[0].slug}`);
  redirect("/brands");
}
