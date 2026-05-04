import { requireAdmin } from "@/lib/auth";
import { SubmitButton } from "@/app/components/SubmitButton";
import { updateUser } from "./actions";

const ROLES = [
  { value: "drafter", label: "Drafter" },
  { value: "brand_reviewer", label: "Brand reviewer" },
  { value: "market_lead", label: "Market lead" },
];

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_admin: boolean;
};

export default async function UsersPage() {
  const { supabase, user: currentUser } = await requireAdmin();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const list = (users as Profile[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Everyone who has signed in. You cannot remove your own admin flag.
        </p>
      </div>

      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {list.map((u) => {
          const isSelf = u.id === currentUser.id;
          return (
            <li key={u.id} className="p-4">
              <form
                action={updateUser}
                className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
              >
                <input type="hidden" name="id" value={u.id} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {u.full_name ?? u.email}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{u.email}</p>
                </div>
                <select
                  name="role"
                  defaultValue={u.role}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="is_admin"
                    defaultChecked={u.is_admin}
                    disabled={isSelf}
                    className="h-4 w-4"
                  />
                  <span className={isSelf ? "text-zinc-400" : ""}>Admin</span>
                </label>
                <SubmitButton
                  pendingLabel="Saving…"
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                >
                  Save
                </SubmitButton>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
