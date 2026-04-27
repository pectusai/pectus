import { redirect } from "next/navigation";

export default async function WorkspaceIndex({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/workspaces/${code}/dashboard`);
}
