import { redirect } from "next/navigation";

export default async function ProjectSettings({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/projects/${code}/apps/seed-keywords/settings`);
}
