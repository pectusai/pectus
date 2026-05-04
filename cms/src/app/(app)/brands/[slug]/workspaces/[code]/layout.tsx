import { getWorkspaceByCode } from "@/lib/workspace";
import { WorkspaceShell } from "./WorkspaceShell";

export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string; code: string }>;
  children: React.ReactNode;
}) {
  const { slug, code } = await params;
  const workspace = await getWorkspaceByCode(code);

  return (
    <WorkspaceShell workspace={workspace} brandSlug={slug}>
      {children}
    </WorkspaceShell>
  );
}
