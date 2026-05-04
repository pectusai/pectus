import Link from "next/link";
import { listActivatedAppsForProject, APP_SIDEBAR_MANIFESTS } from "@/lib/apps";
import type { Project } from "@/lib/project";
import { InfoDot } from "@/app/components/InfoDot";
import { SidebarFrame } from "./SidebarFrame";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarLink } from "./SidebarLink";

export async function ProjectShell({
  project,
  brandSlug,
  children,
}: {
  project: Project;
  brandSlug: string;
  children: React.ReactNode;
}) {
  const code = project.code;
  const base = `/brands/${brandSlug}/projects/${code}`;
  const activatedApps = await listActivatedAppsForProject(project.id);

  const header = (
    <Link href={base} className="group block">
      <h1 className="text-base font-semibold tracking-tight text-zinc-900 group-hover:underline">
        {project.name}
      </h1>
      <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-zinc-500">
        <span>
          {project.code} · {project.locale}
        </span>
        <InfoDot text="Code is the URL identifier for this project. Locale is the BCP-47 language tag (e.g. en-GB, sv-SE) that drives content language and Google data scoping." />
      </p>
    </Link>
  );

  const nav = (
    <>
      <SidebarGroup
        id="project"
        label="Project"
        tooltip="Per-project shell. ICP, keywords aggregator, project settings, and the apps activation page."
      >
        <SidebarLink href={`${base}/icp`}>ICP</SidebarLink>
        <SidebarLink href={`${base}/keywords`}>Keywords</SidebarLink>
        <SidebarLink href={`${base}/apps`}>Apps</SidebarLink>
        <SidebarLink href={`${base}/settings`}>Settings</SidebarLink>
      </SidebarGroup>

      {activatedApps.map((appName) => {
        const manifest = APP_SIDEBAR_MANIFESTS[appName];
        if (!manifest) return null;
        return (
          <SidebarGroup
            key={appName}
            id={appName}
            label={manifest.label}
            tooltip={manifest.tooltip}
          >
            {manifest.items.map((item) => (
              <SidebarLink key={item.label} href={item.href(base)}>
                {item.label}
              </SidebarLink>
            ))}
          </SidebarGroup>
        );
      })}
    </>
  );

  return (
    <SidebarFrame header={header} nav={nav}>
      {children}
    </SidebarFrame>
  );
}
