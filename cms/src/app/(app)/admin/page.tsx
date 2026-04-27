import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminIndex() {
  const { supabase } = await requireAdmin();

  const [{ count: workspaceCount }, { count: userCount }] = await Promise.all([
    supabase.from("workspaces").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage workspaces and users.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/workspaces"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-300"
        >
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Workspaces
          </p>
          <p className="mt-1 text-3xl font-semibold">{workspaceCount ?? 0}</p>
          <p className="mt-3 text-sm text-zinc-600">
            One per market. Create from the CLI; rename and archive here.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-300"
        >
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Users
          </p>
          <p className="mt-1 text-3xl font-semibold">{userCount ?? 0}</p>
          <p className="mt-3 text-sm text-zinc-600">
            Set role and admin flag for anyone who has signed in.
          </p>
        </Link>
      </div>
    </div>
  );
}
