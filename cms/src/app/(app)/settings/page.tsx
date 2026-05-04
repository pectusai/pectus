import Link from "next/link";
import { readLastBrandSlug } from "@/lib/active-brand";

export default async function SettingsHubPage() {
  const activeBrand = await readLastBrandSlug();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Install-level and brand-level configuration. Pick a section below.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        <Card
          href="/settings/account"
          title="Account"
          description="Your signed-in profile and admin flag."
        />
        {activeBrand ? (
          <Card
            href={`/brands/${activeBrand}/settings`}
            title="Brand"
            description={`Profile, rename, and delete for the active brand.`}
          />
        ) : null}
        {activeBrand ? (
          <Card
            href={`/brands/${activeBrand}/settings/integrations/google`}
            title="Google integration"
            description="Service account, GA4 property, Search Console site."
          />
        ) : null}
        <Card
          href="/settings/updates"
          title="Updates"
          description="Apply schema migrations to your Supabase project."
        />
        <Card
          href="/settings/users"
          title="Users"
          description="Admin-only. Set role and admin flag for signed-in users."
        />
      </ul>
    </div>
  );
}

function Card({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-300"
      >
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="mt-2 text-sm text-zinc-600">{description}</p>
      </Link>
    </li>
  );
}
