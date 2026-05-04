import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { readLastBrandSlug } from "@/lib/active-brand";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const activeBrand = await readLastBrandSlug();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-4 text-sm text-zinc-600">
        <Link href="/settings" className="hover:text-zinc-900">
          Overview
        </Link>
        <Link href="/settings/account" className="hover:text-zinc-900">
          Account
        </Link>
        {activeBrand ? (
          <>
            <Link
              href={`/brands/${activeBrand}/settings`}
              className="hover:text-zinc-900"
            >
              Brand
            </Link>
            <Link
              href={`/brands/${activeBrand}/settings/integrations/google`}
              className="hover:text-zinc-900"
            >
              Google
            </Link>
          </>
        ) : null}
        <Link href="/settings/updates" className="hover:text-zinc-900">
          Updates
        </Link>
        <Link href="/settings/users" className="hover:text-zinc-900">
          Users
        </Link>
      </nav>
      {children}
    </div>
  );
}
