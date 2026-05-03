import { getWorkspaceByCode } from "@/lib/workspace";
import { WorkspaceShell } from "./WorkspaceShell";

export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ code: string }>;
  children: React.ReactNode;
}) {
  const { code } = await params;
  const workspace = await getWorkspaceByCode(code);

  return <WorkspaceShell workspace={workspace}>{children}</WorkspaceShell>;
}
