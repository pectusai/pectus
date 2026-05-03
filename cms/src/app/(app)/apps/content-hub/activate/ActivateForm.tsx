"use client";

import { useState } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { activateContentHubAction } from "./actions";

type Workspace = {
  id: string;
  code: string;
  name: string;
  mount_slug: string | null;
  content_hub_repo: string | null;
};

export function ActivateForm({ workspaces }: { workspaces: Workspace[] }) {
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const current = workspaces.find((w) => w.id === workspaceId);
  const initialShape =
    current?.mount_slug && current.mount_slug !== "/" ? "coexist" : "greenfield";
  const [siteShape, setSiteShape] = useState<"greenfield" | "coexist">(
    initialShape,
  );

  return (
    <form action={activateContentHubAction} className="space-y-6">
      <Field
        label="Workspace"
        hint="Content Hub configures one workspace at a time. Repeat the wizard for additional workspaces."
      >
        <select
          name="workspace_id"
          value={workspaceId}
          onChange={(e) => {
            const id = e.target.value;
            setWorkspaceId(id);
            const w = workspaces.find((x) => x.id === id);
            setSiteShape(
              w?.mount_slug && w.mount_slug !== "/" ? "coexist" : "greenfield",
            );
          }}
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          required
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.code})
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Site shape"
        hint="Brand new sites mean Pectus runs the whole site from the root. Existing sites mean Pectus only adds a section to the site you already have."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ShapeRadio
            value="greenfield"
            checked={siteShape === "greenfield"}
            onChange={() => setSiteShape("greenfield")}
            title="Brand new site"
            blurb="Pectus runs the whole site from the root. Pages live at /."
          />
          <ShapeRadio
            value="coexist"
            checked={siteShape === "coexist"}
            onChange={() => setSiteShape("coexist")}
            title="Existing site"
            blurb="Pectus adds a section under your existing site. Pages live at /insights/ or similar."
          />
        </div>
      </Field>

      {siteShape === "coexist" ? (
        <Field
          label="Mount slug"
          hint="Where Pectus pages live on your domain. Must start and end with /."
        >
          <input
            type="text"
            name="mount_slug"
            defaultValue={current?.mount_slug ?? "/insights/"}
            placeholder="/insights/"
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
            required
          />
        </Field>
      ) : (
        <input type="hidden" name="mount_slug" value="/" />
      )}

      <Field
        label="GitHub repo"
        hint="Create an empty repo on GitHub, then paste the URL here. Pectus pushes built pages there on every Publish; your deploy target (Vercel, Netlify, Pages) takes it from there. Leave blank to set later in Workspace Settings."
      >
        <input
          type="text"
          name="content_hub_repo"
          defaultValue={current?.content_hub_repo ?? ""}
          placeholder="github.com/yourname/yourrepo"
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton
          pendingLabel="Activating…"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Activate Content Hub
        </SubmitButton>
        <p className="text-xs text-zinc-500">
          You can re-run this wizard any time to update the configuration.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-700">
        {label}
        <span
          title={hint}
          aria-label={hint}
          className="inline-flex h-3 w-3 cursor-help items-center justify-center rounded-full border border-zinc-300 text-[8px] font-bold text-zinc-500"
        >
          ?
        </span>
      </span>
      <p className="mb-2 text-xs text-zinc-500">{hint}</p>
      {children}
    </label>
  );
}

function ShapeRadio({
  value,
  checked,
  onChange,
  title,
  blurb,
}: {
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  blurb: string;
}) {
  return (
    <label
      className={
        "flex cursor-pointer flex-col rounded-lg border p-3 text-sm transition " +
        (checked
          ? "border-zinc-900 bg-zinc-50"
          : "border-zinc-200 bg-white hover:border-zinc-300")
      }
    >
      <span className="flex items-center gap-2">
        <input
          type="radio"
          name="site_shape"
          value={value}
          checked={checked}
          onChange={onChange}
        />
        <span className="font-medium text-zinc-900">{title}</span>
      </span>
      <span className="mt-1 pl-5 text-xs text-zinc-600">{blurb}</span>
    </label>
  );
}
