"use client";

import { useState } from "react";

const SUGGESTED = [
  "brand_reviewer",
  "market_lead",
  "copy_editor",
  "legal",
  "owner",
];

export function RolesField({ initial }: { initial: string[] }) {
  const [roles, setRoles] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const r = raw.trim().toLowerCase().replace(/\s+/g, "_");
    if (!r) return;
    if (roles.includes(r)) return;
    setRoles([...roles, r]);
    setDraft("");
  };
  const remove = (r: string) => setRoles(roles.filter((x) => x !== r));

  const remaining = SUGGESTED.filter((s) => !roles.includes(s));

  return (
    <div>
      <input type="hidden" name="required_roles" value={roles.join(",")} />

      <div className="flex flex-wrap items-center gap-1.5">
        {roles.length === 0 ? (
          <span className="text-xs italic text-zinc-500">
            No roles required. Anyone with access can approve.
          </span>
        ) : (
          roles.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-900"
            >
              {r}
              <button
                type="button"
                onClick={() => remove(r)}
                aria-label={`Remove ${r}`}
                className="text-pink-700 hover:text-pink-900"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Add a role (e.g. brand_reviewer)"
          className="h-8 w-64 rounded-md border border-zinc-300 bg-white px-2.5 text-xs"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="h-8 rounded-md border border-zinc-300 bg-white px-3 text-xs hover:bg-zinc-50 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {remaining.length > 0 ? (
        <div className="mt-2.5">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
            Suggested
          </p>
          <div className="flex flex-wrap gap-1.5">
            {remaining.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => add(r)}
                className="rounded-full border border-dashed border-zinc-300 bg-white px-2.5 py-0.5 text-xs text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
              >
                + {r}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
