import { requireUser } from "@/lib/auth";
import { createServerClient } from "@pectus/supabase";

export default async function AccountSettingsPage() {
  const { user } = await requireUser();
  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role, is_admin, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Your signed-in profile. Edit role and admin flag from the Users page
          (admin only).
        </p>
      </header>

      <dl className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 sm:grid-cols-2">
        <Field label="Email" value={profile?.email ?? user.email ?? ""} />
        <Field label="Full name" value={profile?.full_name ?? ""} />
        <Field label="Role" value={profile?.role ?? "—"} />
        <Field
          label="Admin"
          value={profile?.is_admin ? "Yes" : "No"}
        />
        <Field
          label="Joined"
          value={
            profile?.created_at
              ? new Date(profile.created_at as string).toLocaleDateString()
              : "—"
          }
        />
      </dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-900">
        {value || "—"}
      </dd>
    </div>
  );
}
