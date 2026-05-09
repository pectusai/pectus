import Link from "next/link";
import {
  listActivatedAppsWithTypeForProject,
  APP_SIDEBAR_MANIFESTS,
} from "@/lib/apps";
import type { Project } from "@/lib/project";
import { listProjectsForBrand } from "@/lib/project";
import { createServerClient } from "@pectus/supabase";
import { SidebarFrame } from "./SidebarFrame";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarLink } from "./SidebarLink";
import { SidebarSection } from "./SidebarSection";
import { ProjectHeaderSwitcher } from "./ProjectHeaderSwitcher";

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
  const activatedApps = await listActivatedAppsWithTypeForProject(project.id);

  const supabase = await createServerClient();
  const { data: brandRow } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", brandSlug)
    .single();
  const sisterProjects = brandRow?.id
    ? await listProjectsForBrand(brandRow.id as string)
    : [];

  const inboundApps = activatedApps.filter((a) => a.type === "inbound");
  const outboundApps = activatedApps.filter((a) => a.type !== "inbound");

  const renderAppGroup = (appName: string) => {
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
  };

  const header = (
    <ProjectHeaderSwitcher
      brandSlug={brandSlug}
      current={{
        id: project.id,
        name: project.name,
        code: project.code,
        locale: project.locale ?? null,
      }}
      projects={sisterProjects.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        locale: p.locale ?? null,
      }))}
    />
  );

  const nav = (
    <>
      <SidebarSection
        id="outbound"
        label="Apps"
        tooltip="Consumer apps with their own user surfaces. Content Hub etc."
        defaultOpen={true}
      >
        {outboundApps.length === 0 ? (
          <p className="pectus-sidebar-empty">
            No apps activated yet.{" "}
            <a className="pectus-sidebar-empty-link" href={`${base}/apps`}>
              Browse apps →
            </a>
          </p>
        ) : (
          outboundApps.map((a) => renderAppGroup(a.name))
        )}
      </SidebarSection>

      <SidebarSection
        id="inbound"
        label="Inbound apps"
        tooltip="Where data comes into the project. Configuration only — these don't have user-facing surfaces of their own."
        defaultOpen={false}
      >
        {inboundApps.length === 0 ? (
          <p className="pectus-sidebar-empty">
            No inbound apps activated.{" "}
            <a className="pectus-sidebar-empty-link" href={`${base}/apps`}>
              Browse apps →
            </a>
          </p>
        ) : (
          inboundApps.map((a) => renderAppGroup(a.name))
        )}
      </SidebarSection>
    </>
  );

  const footer = (
    <div className="pectus-sidebar-footer-nav">
      <Link
        href={`${base}/settings`}
        className="pectus-sidebar-footer-heading"
      >
        <span aria-hidden className="pectus-sidebar-footer-icon">⚙</span>
        Project settings
      </Link>
      <div className="pectus-sidebar-footer-items">
        <SidebarLink href={`${base}/icp`}>ICP</SidebarLink>
        <SidebarLink href={`${base}/keywords`}>Keywords</SidebarLink>
      </div>
    </div>
  );

  return (
    <SidebarFrame header={header} nav={nav} footer={footer}>
      {children}
    </SidebarFrame>
  );
}
