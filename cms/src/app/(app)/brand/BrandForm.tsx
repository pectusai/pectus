"use client";

import { useMemo, useState, useTransition } from "react";
import {
  saveBrand,
  type BrandColors,
  type BrandFonts,
  type BrandRadius,
  type FontSlot,
  type ImportDraft,
  type ImportedFrom,
} from "./actions";
import { ImportButton } from "./ImportButton";
import { TOOLTIPS, type TooltipKey } from "./tooltips";
import { InfoDot } from "@/app/components/InfoDot";

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
  radius: BrandRadius;
  imported_from: ImportedFrom | null;
};

type Props = {
  initial: InitialBrand;
  canEdit: boolean;
};

type PendingImport = {
  baseline: InitialBrand;
  importedFrom: ImportedFrom;
  missing: string[];
};

const ADVANCED_COLOR_KEYS: (keyof BrandColors)[] = [
  "accent_alt",
  "accent_alt_ink",
  "surface_alt",
  "surface_inv",
  "ok",
  "warn",
  "err",
];

export function BrandForm({ initial: initialFromServer, canEdit }: Props) {
  const [initial, setInitial] = useState<InitialBrand>(initialFromServer);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function applyImport(
    draft: ImportDraft,
    importedFrom: ImportedFrom,
    missing: string[],
  ) {
    const baseline = pendingImport?.baseline ?? initial;
    const next: InitialBrand = {
      ...initial,
      name: draft.name,
      tagline: draft.tagline,
      voice: draft.voice,
      tonality: draft.tonality,
      guidelines_md: draft.guidelines_md || initial.guidelines_md,
      colors: draft.colors,
      fonts: draft.fonts,
      radius: draft.radius,
      imported_from: importedFrom,
    };
    setInitial(next);
    setPendingImport({ baseline, importedFrom, missing });
    setAdvancedOpen(true);
    setFormKey((k) => k + 1);
  }

  function cancelImport() {
    if (!pendingImport) return;
    setInitial(pendingImport.baseline);
    setPendingImport(null);
    setFormKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <ImportStatus
          importedFrom={initial.imported_from}
          pendingImport={pendingImport}
        />
        <ImportButton
          disabled={!canEdit}
          onImported={(draft, from, missing) =>
            applyImport(draft, from, missing)
          }
        />
      </div>

      <BrandFormBody
        key={formKey}
        initial={initial}
        canEdit={canEdit}
        priorInitial={pendingImport?.baseline ?? null}
        pendingImport={pendingImport}
        advancedOpen={advancedOpen}
        setAdvancedOpen={setAdvancedOpen}
        onCancelImport={cancelImport}
        onSaved={() => setPendingImport(null)}
      />
    </div>
  );
}

function ImportStatus({
  importedFrom,
  pendingImport,
}: {
  importedFrom: ImportedFrom | null;
  pendingImport: PendingImport | null;
}) {
  if (pendingImport) {
    return (
      <div className="flex-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        <p className="font-medium">Imported from Claude Design</p>
        <p className="mt-0.5 text-xs">
          Apply to save · Cancel to discard.{" "}
          {pendingImport.missing.length > 0 ? (
            <span>Still needed: {pendingImport.missing.join(", ")}.</span>
          ) : null}
        </p>
      </div>
    );
  }
  if (importedFrom) {
    const date = importedFrom.imported_at.slice(0, 10);
    return (
      <div className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        Imported {date} from Claude Design.
      </div>
    );
  }
  return <div className="flex-1" />;
}

function BrandFormBody({
  initial,
  canEdit,
  priorInitial,
  pendingImport,
  advancedOpen,
  setAdvancedOpen,
  onCancelImport,
  onSaved,
}: {
  initial: InitialBrand;
  canEdit: boolean;
  priorInitial: InitialBrand | null;
  pendingImport: PendingImport | null;
  advancedOpen: boolean;
  setAdvancedOpen: (v: boolean) => void;
  onCancelImport: () => void;
  onSaved: () => void;
}) {
  const [colors, setColors] = useState<BrandColors>(initial.colors);
  const [headingSource, setHeadingSource] = useState<FontSlot["source"]>(
    initial.fonts.heading.source,
  );
  const [bodySource, setBodySource] = useState<FontSlot["source"]>(
    initial.fonts.body.source,
  );
  const [monoSource, setMonoSource] = useState<FontSlot["source"]>(
    initial.fonts.mono.source,
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const isPreviewing = pendingImport !== null;
  const importedFromJson = useMemo(
    () =>
      pendingImport ? JSON.stringify(pendingImport.importedFrom) : "",
    [pendingImport],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <form
        action={(formData: FormData) => {
          setMessage(null);
          startTransition(async () => {
            const result = await saveBrand(formData);
            if (result.ok) {
              setMessage({
                ok: true,
                text: isPreviewing ? "Imported brand applied." : "Saved.",
              });
              onSaved();
            } else {
              setMessage({ ok: false, text: result.error });
            }
          });
        }}
      >
        {importedFromJson ? (
          <input type="hidden" name="imported_from" value={importedFromJson} />
        ) : null}

        <fieldset
          disabled={!canEdit || pending}
          className="space-y-6 rounded-lg border border-zinc-200 bg-white p-5 disabled:opacity-70"
        >
          <Section title="Identity">
            <Field label="Name" tooltip="name">
              <input
                name="name"
                defaultValue={initial.name}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <Was prior={priorInitial?.name} current={initial.name} />
            </Field>
            <Field label="Tagline" tooltip="tagline">
              <input
                name="tagline"
                defaultValue={initial.tagline}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <Was prior={priorInitial?.tagline} current={initial.tagline} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Website URL" tooltip="website_url">
                <input
                  name="website_url"
                  defaultValue={initial.website_url}
                  placeholder="https://yourbrand.com"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Sitemap URL" tooltip="sitemap_url">
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
              {(["accent", "surface", "text", "muted", "border"] as const).map(
                (token) => (
                  <Field key={token} label={token} tooltip={token}>
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
                    <Was
                      prior={priorInitial?.colors?.[token] ?? undefined}
                      current={colors[token]}
                    />
                  </Field>
                ),
              )}
            </div>
          </Section>

          <CollapsibleSection
            title="Advanced"
            open={advancedOpen}
            onToggle={() => setAdvancedOpen(!advancedOpen)}
          >
            <div className="grid gap-3 sm:grid-cols-4">
              {ADVANCED_COLOR_KEYS.map((token) => {
                const value = (colors[token] ?? "") as string;
                return (
                  <Field
                    key={token}
                    label={token}
                    tooltip={token as TooltipKey}
                  >
                    <input
                      name={`color_${token}`}
                      value={value}
                      onChange={(e) =>
                        setColors((prev) => ({
                          ...prev,
                          [token]: e.target.value || null,
                        }))
                      }
                      placeholder="(skip)"
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-xs"
                    />
                    <span
                      className="mt-1 block h-3 w-full rounded border border-zinc-200"
                      style={{ background: value || "transparent" }}
                      aria-hidden
                    />
                    <Was
                      prior={priorInitial?.colors?.[token] ?? undefined}
                      current={value}
                    />
                  </Field>
                );
              })}
            </div>

            <Field label="Mono font" tooltip="font_mono">
              <FontSlotInputs
                prefix="mono"
                initial={initial.fonts.mono}
                source={monoSource}
                onSourceChange={setMonoSource}
              />
              <Was
                prior={priorInitial?.fonts?.mono?.family}
                current={initial.fonts.mono.family}
              />
            </Field>

            <Field label="Radius" tooltip="radius">
              <select
                name="radius"
                defaultValue={initial.radius}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="sharp">Sharp (0px)</option>
                <option value="default">Default (6px)</option>
                <option value="soft">Soft (12px)</option>
              </select>
              <Was prior={priorInitial?.radius} current={initial.radius} />
            </Field>
          </CollapsibleSection>

          <Section title="Voice">
            <Field label="Voice" tooltip="voice">
              <textarea
                name="voice"
                defaultValue={initial.voice}
                rows={3}
                placeholder="How the brand sounds. e.g. direct, warm, never corporate."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <Was prior={priorInitial?.voice} current={initial.voice} />
            </Field>
            <Field label="Tonality" tooltip="tonality">
              <textarea
                name="tonality"
                defaultValue={initial.tonality}
                rows={3}
                placeholder="Modifiers by context. e.g. playful in blog, sober in legal."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <Was prior={priorInitial?.tonality} current={initial.tonality} />
            </Field>
            <Field label="Guidelines (markdown)" tooltip="guidelines">
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
            <Field label="Heading" tooltip="font_heading">
              <FontSlotInputs
                prefix="heading"
                initial={initial.fonts.heading}
                source={headingSource}
                onSourceChange={setHeadingSource}
              />
              <Was
                prior={priorInitial?.fonts?.heading?.family}
                current={initial.fonts.heading.family}
              />
            </Field>
            <Field label="Body" tooltip="font_body">
              <FontSlotInputs
                prefix="body"
                initial={initial.fonts.body}
                source={bodySource}
                onSourceChange={setBodySource}
              />
              <Was
                prior={priorInitial?.fonts?.body?.family}
                current={initial.fonts.body.family}
              />
            </Field>
          </Section>

          <Section title="Image model">
            <Field label="Default image model" tooltip="image_model">
              <select
                name="image_model"
                defaultValue={initial.image_model}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="imagen-4">Imagen 4</option>
                <option value="imagen-4-fast">Imagen 4 Fast</option>
                <option value="imagen-4-ultra">Imagen 4 Ultra</option>
                <option value="gemini-3-pro-image-preview">Gemini 3 Pro</option>
                <option value="flux-dev">Flux Dev</option>
                <option value="recraft-v3">Recraft v3</option>
              </select>
            </Field>
          </Section>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!canEdit || pending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60"
            >
              {pending
                ? isPreviewing
                  ? "Applying…"
                  : "Saving…"
                : isPreviewing
                  ? "Apply"
                  : "Save brand"}
            </button>
            {isPreviewing ? (
              <button
                type="button"
                onClick={onCancelImport}
                disabled={pending}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel import
              </button>
            ) : null}
            {message ? (
              <p
                className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}
              >
                {message.text}
              </p>
            ) : null}
          </div>
        </fieldset>
      </form>

      <BrandPreview
        name={initial.name}
        tagline={initial.tagline}
        colors={colors}
        fonts={initial.fonts}
        radius={initial.radius}
      />
    </div>
  );
}

function FontSlotInputs({
  prefix,
  initial,
  source,
  onSourceChange,
}: {
  prefix: string;
  initial: FontSlot;
  source: FontSlot["source"];
  onSourceChange: (s: FontSlot["source"]) => void;
}) {
  return (
    <div className="rounded-md border border-zinc-200 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
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
  radius,
}: {
  name: string;
  tagline: string;
  colors: BrandColors;
  fonts: BrandFonts;
  radius: BrandRadius;
}) {
  const radiusPx = radius === "sharp" ? 0 : radius === "soft" ? 12 : 6;
  return (
    <aside
      className="rounded-lg border p-5"
      style={{
        background: colors.surface,
        color: colors.text,
        borderColor: colors.border,
        borderRadius: radiusPx,
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
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white"
          style={{ background: colors.accent, borderRadius: radiusPx }}
        >
          Primary
        </button>
        {colors.accent_alt ? (
          <button
            type="button"
            className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium"
            style={{
              background: colors.accent_alt,
              color: colors.accent_alt_ink ?? "#000",
              borderRadius: radiusPx,
            }}
          >
            Secondary
          </button>
        ) : null}
      </div>
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

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-b border-zinc-100 pb-5 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left text-sm font-semibold"
      >
        <span>{title}</span>
        <span className="text-xs text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <div className="space-y-3">{children}</div> : null}
    </div>
  );
}

function Field({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: TooltipKey;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-600">
        {label}
        {tooltip ? <InfoDot text={TOOLTIPS[tooltip]} /> : null}
      </span>
      {children}
    </label>
  );
}

function Was({
  prior,
  current,
}: {
  prior: string | null | undefined;
  current: string | null | undefined;
}) {
  if (prior === undefined || prior === null) return null;
  if (prior === current) return null;
  if (!prior) return null;
  return (
    <span className="mt-1 block text-[11px] text-zinc-400">
      was: {prior}
    </span>
  );
}
