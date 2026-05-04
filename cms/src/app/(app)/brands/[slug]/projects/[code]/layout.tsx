import { getProjectByCode } from "@/lib/project";
import { ProjectShell } from "./ProjectShell";

export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string; code: string }>;
  children: React.ReactNode;
}) {
  const { slug, code } = await params;
  const project = await getProjectByCode(code);

  return (
    <ProjectShell project={project} brandSlug={slug}>
      {children}
    </ProjectShell>
  );
}
