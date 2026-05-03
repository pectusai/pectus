import { redirect } from "next/navigation";

export default async function WorkspaceSettings({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/workspaces/${code}/settings/seed-keywords`);
}
