import Link from "next/link";
import { getProjectByCode } from "@/lib/project";

export default async function ProjectSettingsIndex({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const project = await getProjectByCode(code);
  const base = `/brands/${slug}/projects/${code}`;

  const cards = [
    {
      title: "ICP",
      description:
        "Personas, painpoints, and notes that AI surfaces lean on when drafting.",
      href: `${base}/icp`,
    },
    {
      title: "Keywords",
      description:
        "Project-wide keyword list. Seeds analysis, content gaps, and idea generation. Required before site builds.",
      href: `${base}/keywords`,
    },
    {
      title: "Apps",
      description:
        "Activate or pause inbound and outbound apps for this project.",
      href: `${base}/apps`,
    },
  ];

  return (
    <div className="pectus-settings-index">
      <header className="pectus-settings-index-header">
        <h1>Project settings</h1>
        <p className="pectus-settings-index-lede">
          Configure {project.name}. ICP and keywords feed every AI surface in
          the project, so they&apos;re effectively settings even though they
          contain real data.
        </p>
      </header>

      <ul className="pectus-settings-index-list">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="pectus-settings-index-card">
              <div className="pectus-settings-index-card-title">{c.title}</div>
              <p className="pectus-settings-index-card-desc">{c.description}</p>
              <span className="pectus-settings-index-card-arrow" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
