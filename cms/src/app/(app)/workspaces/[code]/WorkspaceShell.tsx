import Link from "next/link";
import { isAppActive } from "@/lib/apps";
import type { Workspace } from "@/lib/workspace";
import { InfoDot } from "@/app/components/InfoDot";
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
      <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-zinc-500">
        <span>
          {workspace.code} · {workspace.locale}
        </span>
        <InfoDot text="Code is the URL identifier for this workspace. Locale is the BCP-47 language tag (e.g. en-GB, sv-SE) that drives content language and Google data scoping." />
      </p>
    </Link>
  );

  const nav = (
    <>
      <SidebarLink href={`/workspaces/${code}/dashboard`}>
        Dashboard
      </SidebarLink>

      {contentHubActive ? (
        <SidebarGroup
          id="content-hub"
          label="Content Hub"
          tooltip="An app that publishes pages to a public site you control. Pages, Articles, Site URL, and Redirects are all part of it."
        >
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

      <SidebarGroup
        id="settings"
        label="Settings"
        tooltip="Per-workspace configuration. ICP, seed keywords, traffic data, sources Pectus reads from, and the review-policy roles."
      >
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
