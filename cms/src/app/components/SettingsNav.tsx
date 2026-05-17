import Link from "next/link";

export function SettingsNav({
  activeBrandSlug,
}: {
  activeBrandSlug: string | null;
}) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-4 text-sm text-zinc-600">
      <Link href="/settings" className="hover:text-zinc-900">
        Overview
      </Link>
      <Link href="/settings/account" className="hover:text-zinc-900">
        Account
      </Link>
      {activeBrandSlug ? (
        <>
          <Link
            href={`/brands/${activeBrandSlug}/settings`}
            className="hover:text-zinc-900"
          >
            Brand
          </Link>
          <Link
            href={`/brands/${activeBrandSlug}/settings/integrations/google`}
            className="hover:text-zinc-900"
          >
            Google
          </Link>
        </>
      ) : null}
      <Link
        href="/settings/environment"
        className="hover:text-zinc-900"
        title="Set Supabase, Anthropic, Google, and other secrets. Single source of truth for every Pectus app on this machine."
      >
        Environment
      </Link>
      <Link href="/settings/updates" className="hover:text-zinc-900">
        Updates
      </Link>
      <Link href="/settings/users" className="hover:text-zinc-900">
        Users
      </Link>
    </nav>
  );
}
