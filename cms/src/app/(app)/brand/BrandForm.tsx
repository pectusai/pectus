"use client";

import { useState, useTransition } from "react";
import { saveBrand, type BrandColors, type BrandFonts, type FontSlot } from "./actions";

type InitialBrand = {
  name: string;
  tagline: string;
  website_url: string;
  sitemap_url: string;
  voice: string;
  tonality: string;
  guidelines_md: string;
  image_model: string;
  colors: BrandColors;
  fonts: BrandFonts;
};

type Props = {
  initial: InitialBrand;
  canEdit: boolean;
};

export function BrandForm({ initial, canEdit }: Props) {
  const [colors, setColors] = useState<BrandColors>(initial.colors);
  const [headingSource, setHeadingSource] = useState<FontSlot["source"]>(
    initial.fonts.heading.source,
  );
  const [bodySource, setBodySource] = useState<FontSlot["source"]>(
    initial.fonts.body.source,
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <form
        action={(formData: FormData) => {
          setMessage(null);
          startTransition(async () => {
            const result = await saveBrand(formData);
            setMessage(
              result.ok
                ? { ok: true, text: "Saved." }
                : { ok: false, text: result.error },
            );
          });
        }}
      >
        <fieldset
          disabled={!canEdit || pending}
          className="space-y-6 rounded-lg border border-zinc-200 bg-white p-5 disabled:opacity-70"
        >
          <Section title="Identity">
            <Field label="Name">
              <input
                name="name"
                defaultValue={initial.name}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Tagline">
              <input
                name="tagline"
                defaultValue={initial.tagline}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Website URL">
                <input
                  name="website_url"
                  defaultValue={initial.website_url}
                  placeholder="https://yourbrand.com"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Sitemap URL">
                <input
                  name="sitemap_url"
                  defaultValue={initial.sitemap_url}
                  placeholder="https://yourbrand.com/sitemap.xml"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </Section>

          <Section title="Colors">
            <div className="grid gap-3 sm:grid-cols-5">
              {(
                ["accent", "surface", "text", "muted", "border"] as const
              ).map((token) => (
                <Field key={token} label={token}>
                  <input
                    name={`color_${token}`}
                    value={colors[token]}
                    onChange={(e) =>
                      setColors((prev) => ({
                        ...prev,
                        [token]: e.target.value,
                      }))
                    }
                    placeholder="#000000"
                    className="w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-xs"
                  />
                  <span
                    className="mt-1 block h-3 w-full rounded border border-zinc-200"
                    style={{ background: colors[token] }}
                    aria-hidden
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Voice">
            <Field label="Voice">
              <textarea
                name="voice"
                defaultValue={initial.voice}
                rows={3}
                placeholder="How the brand sounds. e.g. direct, warm, never corporate."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Tonality">
              <textarea
                name="tonality"
                defaultValue={initial.tonality}
                rows={3}
                placeholder="Modifiers by context. e.g. playful in blog, sober in legal."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Guidelines (markdown)">
              <textarea
                name="guidelines_md"
                defaultValue={initial.guidelines_md}
                rows={8}
                placeholder="Longer-form brand guidelines."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
          </Section>

          <Section title="Fonts">
            <FontSlotInputs
              prefix="heading"
              label="Heading"
              initial={initial.fonts.heading}
              source={headingSource}
              onSourceChange={setHeadingSource}
            />
            <FontSlotInputs
              prefix="body"
              label="Body"
              initial={initial.fonts.body}
              source={bodySource}
              onSourceChange={setBodySource}
            />
          </Section>

          <Section title="Image model">
            <Field label="Default image model">
              <select
                name="image_model"
                defaultValue={initial.image_model}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="imagen-4">Imagen 4</option>
                <option value="imagen-4-fast">Imagen 4 Fast</option>
                <option value="imagen-4-ultra">Imagen 4 Ultra</option>
                <option value="gemini-3-pro-image-preview">
                  Gemini 3 Pro
                </option>
                <option value="flux-dev">Flux Dev</option>
                <option value="recraft-v3">Recraft v3</option>
              </select>
            </Field>
          </Section>

          <button
            type="submit"
            disabled={!canEdit || pending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save brand"}
          </button>
          {message ? (
            <p
              className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}
            >
              {message.text}
            </p>
          ) : null}
        </fieldset>
      </form>

      <BrandPreview
        name={initial.name}
        tagline={initial.tagline}
        colors={colors}
        fonts={initial.fonts}
      />
    </div>
  );
}

function FontSlotInputs({
  prefix,
  label,
  initial,
  source,
  onSourceChange,
}: {
  prefix: string;
  label: string;
  initial: FontSlot;
  source: FontSlot["source"];
  onSourceChange: (s: FontSlot["source"]) => void;
}) {
  return (
    <div className="rounded-md border border-zinc-200 p-3">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <Field label="Source">
          <select
            name={`${prefix}_source`}
            value={source}
            onChange={(e) =>
              onSourceChange(e.target.value as FontSlot["source"])
            }
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            <option value="system">System</option>
            <option value="google">Google Fonts</option>
            <option value="uploaded">Uploaded</option>
          </select>
        </Field>
        <Field label="Family">
          <input
            name={`${prefix}_family`}
            defaultValue={initial.family}
            placeholder="e.g. Inter"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </Field>
      </div>
      {source === "google" ? (
        <Field label="Google Fonts URL">
          <input
            name={`${prefix}_google_url`}
            defaultValue={initial.google_url ?? ""}
            placeholder="https://fonts.googleapis.com/css2?family=Inter…"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </Field>
      ) : null}
      {source === "uploaded" ? (
        <Field label="Upload font files">
          <input
            type="file"
            name={`${prefix}_files`}
            accept=".woff,.woff2,.ttf,.otf"
            multiple
            disabled
            className="block w-full text-sm"
          />
          <span className="mt-1 block text-[11px] text-zinc-500">
            Font upload comes in a follow-up PR. For now use Google or system.
          </span>
        </Field>
      ) : null}
    </div>
  );
}

function BrandPreview({
  name,
  tagline,
  colors,
  fonts,
}: {
  name: string;
  tagline: string;
  colors: BrandColors;
  fonts: BrandFonts;
}) {
  return (
    <aside
      className="rounded-lg border p-5"
      style={{
        background: colors.surface,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      <p
        className="text-xs uppercase tracking-widest"
        style={{ color: colors.muted }}
      >
        Preview
      </p>
      <h2
        className="mt-2 text-2xl font-semibold"
        style={{ fontFamily: fonts.heading.family }}
      >
        {name || "Your Brand"}
      </h2>
      {tagline ? (
        <p
          className="mt-1 text-sm"
          style={{ color: colors.muted, fontFamily: fonts.body.family }}
        >
          {tagline}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-4 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white"
        style={{ background: colors.accent }}
      >
        Sample button
      </button>
    </aside>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-b border-zinc-100 pb-5 last:border-b-0 last:pb-0">
      <p className="text-sm font-semibold">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-zinc-600">
        {label}
      </span>
      {children}
    </label>
  );
}
