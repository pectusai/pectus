import Link from "next/link";

export default async function ContentHubSettingsLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string; code: string }>;
  children: React.ReactNode;
}) {
  const { slug, code } = await params;
  const base = `/brands/${slug}/projects/${code}/apps/content-hub/settings`;

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">
          Content Hub settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Where the public site lives, how URLs are redirected when slugs
          change, and who has to sign off before content goes live.
        </p>
      </div>

      <nav className="flex flex-wrap items-center gap-4 border-b border-zinc-100 pb-3 text-sm text-zinc-600">
        <Link href={`${base}`} className="hover:text-zinc-900">
          Overview
        </Link>
        <Link href={`${base}/site-url`} className="hover:text-zinc-900">
          Site URL
        </Link>
        <Link href={`${base}/redirects`} className="hover:text-zinc-900">
          Redirects
        </Link>
        <Link href={`${base}/review-policy`} className="hover:text-zinc-900">
          Review policy
        </Link>
      </nav>

      <div>{children}</div>
    </div>
  );
}
