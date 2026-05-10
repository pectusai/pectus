import Link from "next/link";

export default async function ContentHubSettingsOverviewPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const base = `/brands/${slug}/projects/${code}/apps/content-hub/settings`;

  const cards = [
    {
      label: "Site URL",
      href: `${base}/site-url`,
      blurb:
        "Where the published site lives on your domain, which locales it ships in, and which GitHub repo + branch Publish writes to.",
    },
    {
      label: "Redirects",
      href: `${base}/redirects`,
      blurb:
        "Old-URL to new-URL rules baked into the next Publish. Auto-generated when an article slug or page mount path changes.",
    },
    {
      label: "Review policy",
      href: `${base}/review-policy`,
      blurb:
        "Which roles have to sign off on a draft before it can be published. Drafts route to the Reviews inbox until the policy clears them.",
    },
  ];

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {cards.map((c) => (
        <li key={c.href}>
          <Link
            href={c.href}
            className="block rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
          >
            <h2 className="text-sm font-semibold text-zinc-900">{c.label}</h2>
            <p className="mt-1 text-sm text-zinc-600">{c.blurb}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
