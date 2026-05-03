import Link from "next/link";
import { createServerClient } from "@pectus/supabase";
import { signOut } from "../login/actions";

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

  return (
    <header className="pectus-nav">
      <div className="pectus-nav-inner">
        <Link href="/workspaces" className="pectus-nav-brand">
          <span className="pectus-nav-brand-dot" aria-hidden="true" />
          Pectus
        </Link>

        <nav className="pectus-nav-links">
          <Link href="/workspaces">Workspaces</Link>
          <Link href="/brand">Brand</Link>
          <Link href="/apps">Apps</Link>
          <Link href="/reviews">Reviews</Link>
          {isAdmin ? <Link href="/admin">Admin</Link> : null}
        </nav>

        <div className="pectus-nav-actions">
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
