import Link from "next/link";
import { isAppActive } from "@/lib/apps";
import type { Workspace } from "@/lib/workspace";
import { SidebarFrame } from "./SidebarFrame";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarLink } from "./SidebarLink";

export async function WorkspaceShell({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: React.ReactNode;
}) {
  const contentHubActive = await isAppActive("content-hub");
  const code = workspace.code;

  const header = (
    <Link
      href={`/workspaces/${code}/dashboard`}
      className="group block"
    >
      <h1 className="text-base font-semibold tracking-tight text-zinc-900 group-hover:underline">
        {workspace.name}
      </h1>
      <p className="mt-1 text-[11px] uppercase tracking-widest text-zinc-500">
        {workspace.code} · {workspace.locale}
      </p>
    </Link>
  );

  const nav = (
    <>
      <SidebarLink href={`/workspaces/${code}/dashboard`}>
        Dashboard
      </SidebarLink>

      {contentHubActive ? (
        <SidebarGroup id="content-hub" label="Content Hub">
          <SidebarLink href={`/workspaces/${code}/pages`}>Pages</SidebarLink>
          <SidebarLink href={`/workspaces/${code}/articles`}>
            Articles
          </SidebarLink>
          <SidebarLink href={`/workspaces/${code}/settings/site-url`}>
            Site URL
          </SidebarLink>
          <SidebarLink href={`/workspaces/${code}/settings/redirects`}>
            Redirects
          </SidebarLink>
        </SidebarGroup>
      ) : null}

      <SidebarGroup id="settings" label="Settings">
        <SidebarLink href={`/workspaces/${code}/icp`}>ICP</SidebarLink>
        <SidebarLink href={`/workspaces/${code}/settings/seed-keywords`}>
          Seed keywords
        </SidebarLink>
        <SidebarLink href={`/workspaces/${code}/keywords`}>
          Keyword traffic
        </SidebarLink>
        <SidebarLink href={`/workspaces/${code}/sources`}>Sources</SidebarLink>
        <SidebarLink href={`/workspaces/${code}/settings/review-policy`}>
          Review policy
        </SidebarLink>
      </SidebarGroup>
    </>
  );

  return (
    <SidebarFrame header={header} nav={nav}>
      {children}
    </SidebarFrame>
  );
}
