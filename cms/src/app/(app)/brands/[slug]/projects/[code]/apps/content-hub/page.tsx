import { redirect } from "next/navigation";

export default async function ContentHubIndex({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  redirect(`/brands/${slug}/projects/${code}/apps/content-hub/insights`);
}
