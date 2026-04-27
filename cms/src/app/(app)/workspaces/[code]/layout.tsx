import Link from "next/link";
import { getWorkspaceByCode } from "@/lib/workspace";
import { WorkspaceNav } from "./WorkspaceNav";

export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ code: string }>;
  children: React.ReactNode;
}) {
  const { code } = await params;
  const workspace = await getWorkspaceByCode(code);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/workspaces/${workspace.code}/dashboard`}
          className="group inline-block"
        >
          <h1 className="text-2xl font-semibold tracking-tight group-hover:underline">
            {workspace.name}
          </h1>
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            {workspace.code} · {workspace.locale}
          </p>
        </Link>
      </div>

      <WorkspaceNav code={workspace.code} />

      {children}
    </div>
  );
}
