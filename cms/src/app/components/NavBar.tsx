import Link from "next/link";
import { createServerClient } from "@pectus/supabase";
import { signOut } from "../login/actions";
import { listBrands, readLastBrandSlug } from "@/lib/active-brand";
import { BrandSwitcher } from "./BrandSwitcher";

export async function NavBar() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, role, email, full_name")
    .eq("id", user.id)
    .single();

  const isAdmin = Boolean(profile?.is_admin);

  const brands = await listBrands();
  const cookieSlug = await readLastBrandSlug();
  const activeSlug =
    cookieSlug && brands.some((b) => b.slug === cookieSlug)
      ? cookieSlug
      : (brands[0]?.slug ?? null);
  const base = activeSlug ? `/brands/${activeSlug}` : "/brands";

  return (
    <header className="pectus-nav">
      <div className="pectus-nav-inner">
        <Link href={base} className="pectus-nav-brand">
          <span className="pectus-nav-brand-dot" aria-hidden="true" />
          Pectus
        </Link>

        <nav className="pectus-nav-links">
          {activeSlug ? (
            <>
              <Link href={base}>Workspaces</Link>
              <Link href={`${base}/profile`}>Brand</Link>
              <Link href={`${base}/apps`}>Apps</Link>
              <Link href={`${base}/reviews`}>Reviews</Link>
            </>
          ) : (
            <Link href="/brands">Brands</Link>
          )}
          {isAdmin ? <Link href="/admin">Admin</Link> : null}
        </nav>

        <div className="pectus-nav-actions">
          <BrandSwitcher brands={brands} activeSlug={activeSlug} />
          <span className="pectus-nav-email">{profile?.email ?? user.email}</span>
          <form action={signOut}>
            <button type="submit" className="pectus-nav-signout">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
