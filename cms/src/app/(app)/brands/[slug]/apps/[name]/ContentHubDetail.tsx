"use client";

import { useState } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { InfoDot } from "@/app/components/InfoDot";
import { saveContentHubConfig } from "./actions";

type Workspace = {
  id: string;
  code: string;
  name: string;
  mount_slug: string | null;
  content_hub_repo: string | null;
};

export function ContentHubDetail({ workspaces }: { workspaces: Workspace[] }) {
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const current = workspaces.find((w) => w.id === workspaceId);
  const initialShape =
    current?.mount_slug && current.mount_slug !== "/" ? "coexist" : "greenfield";
  const [siteShape, setSiteShape] = useState<"greenfield" | "coexist">(
    initialShape,
  );

  if (workspaces.length === 0) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">
          Configure for a workspace
        </h2>
        <p className="mt-2 text-xs text-zinc-600">
          No workspaces yet. Create one from the CLI first:
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
          cd &lt;install path&gt; && npx pectus workspace create
        </pre>
        <p className="mt-2 text-xs text-zinc-500">
          Once a workspace exists, refresh this page.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">
        Configure for a workspace
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Each workspace gets its own site shape, mount slug, and GitHub repo.
        Re-run this form per workspace; existing settings load as defaults.
      </p>

      <form action={saveContentHubConfig} className="mt-4 space-y-5">
        <Field
          label="Workspace"
          hint="Configure Content Hub for one workspace at a time. Switching the dropdown loads that workspace's existing settings, if any."
        >
          <select
            name="workspace_id"
            value={workspaceId}
            onChange={(e) => {
              const id = e.target.value;
              setWorkspaceId(id);
              const w = workspaces.find((x) => x.id === id);
              setSiteShape(
                w?.mount_slug && w.mount_slug !== "/"
                  ? "coexist"
                  : "greenfield",
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
          hint="Brand new sites mean Pectus runs the whole site from /. Existing sites mean Pectus adds a section under your existing site."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ShapeRadio
              value="greenfield"
              checked={siteShape === "greenfield"}
              onChange={() => setSiteShape("greenfield")}
              title="Brand new site"
              blurb="Pectus runs the whole site from /."
              tooltip="Pectus owns the whole domain. Pages publish at /. Choose this if Pectus is replacing your current site or starting fresh."
            />
            <ShapeRadio
              value="coexist"
              checked={siteShape === "coexist"}
              onChange={() => setSiteShape("coexist")}
              title="Existing site"
              blurb="Pectus lives at /insights/ or similar."
              tooltip="Pectus only adds a section under a sub-path like /insights/. Your current site keeps serving the rest of the domain."
            />
          </div>
        </Field>

        {siteShape === "coexist" ? (
          <Field
            label="Mount slug"
            hint="Where Pectus pages live on your domain. Must start and end with /."
            tooltip="Where Pectus pages live in the URL. / for brand-new, /insights/ or /blog/ for existing-site setups."
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
          hint="Create an empty repo on GitHub, paste the URL here. Pectus pushes built pages there on every Publish; your deploy target (Vercel, Netlify, Pages) takes it from there."
          tooltip="owner/name of the repo Pectus commits published pages to. The content-hub site reads from this repo to render."
        >
          <input
            type="text"
            name="content_hub_repo"
            defaultValue={current?.content_hub_repo ?? ""}
            placeholder="github.com/yourname/yourrepo"
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
          />
        </Field>

        <SubmitButton
          pendingLabel="Saving…"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Save and activate Content Hub
        </SubmitButton>
      </form>
    </section>
  );
}

function Field({
  label,
  hint,
  tooltip,
  children,
}: {
  label: string;
  hint: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-700">
        {label}
        {tooltip ? <InfoDot text={tooltip} /> : null}
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
  tooltip,
}: {
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  blurb: string;
  tooltip?: string;
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
        {tooltip ? <InfoDot text={tooltip} /> : null}
      </span>
      <span className="mt-1 pl-5 text-xs text-zinc-600">{blurb}</span>
    </label>
  );
}
