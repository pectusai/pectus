import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-4 text-sm text-zinc-600">
        <Link href="/admin" className="hover:text-zinc-900">
          Overview
        </Link>
        <Link href="/admin/workspaces" className="hover:text-zinc-900">
          Workspaces
        </Link>
        <Link href="/admin/users" className="hover:text-zinc-900">
          Users
        </Link>
      </div>
      {children}
    </div>
  );
}
