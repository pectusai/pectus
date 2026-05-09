"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { createClient as createBrowserClient } from "@pectus/supabase/browser";
import {
  saveImageGenApiKey,
  saveProviderApiKey,
  type SaveApiKeyResult,
  createReferenceImageUploadUrl,
  appendReferenceImageUrls,
  removeReferenceImage,
  saveCameras,
} from "./image-gen-actions";
import type { Camera } from "@/lib/brand-types";

type Props = {
  brandSlug: string;
  apiKeyMasked: string | null;
  falKeyMasked: string | null;
  replicateKeyMasked: string | null;
  referenceUrls: string[];
  cameras: Camera[];
};

function maskKey(value: string): string {
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function ImageGenSection({
  brandSlug,
  apiKeyMasked,
  falKeyMasked,
  replicateKeyMasked,
  referenceUrls,
  cameras: initialCameras,
}: Props) {
  return (
    <section className="mt-10 space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Image generation</h2>
        <p className="mt-1 text-sm text-zinc-600">
          API keys, reference photos, and camera presets that drive every
          hero and inline image generated in Content Hub. The hero section in
          the article editor reads from these.
        </p>
      </div>

      <ApiKeyForm
        brandSlug={brandSlug}
        apiKeyMasked={apiKeyMasked}
        provider="google"
        title="Google AI"
        keyPrefixHint="AIza…"
        helpHref="https://aistudio.google.com/apikey"
        helpLabel="aistudio.google.com/apikey"
        helpAfter="Powers Imagen 4 and Gemini 3 Pro Image."
        primaryAction={saveImageGenApiKey}
      />
      <ApiKeyForm
        brandSlug={brandSlug}
        apiKeyMasked={falKeyMasked}
        provider="fal"
        title="fal.ai"
        keyPrefixHint="fal-…"
        helpHref="https://fal.ai/dashboard/keys"
        helpLabel="fal.ai/dashboard/keys"
        helpAfter="Powers Flux Pro 1.1 Ultra — best for detailed camera-direction prompts."
      />
      <ApiKeyForm
        brandSlug={brandSlug}
        apiKeyMasked={replicateKeyMasked}
        provider="replicate"
        title="Replicate"
        keyPrefixHint="r8_…"
        helpHref="https://replicate.com/account/api-tokens"
        helpLabel="replicate.com/account/api-tokens"
        helpAfter="Powers Flux Dev (cheap iteration) and Recraft v3 (illustration)."
      />

      <ReferencePhotos brandSlug={brandSlug} initialUrls={referenceUrls} />
      <CamerasSection brandSlug={brandSlug} initialCameras={initialCameras} />
    </section>
  );
}

function ApiKeyForm({
  brandSlug,
  apiKeyMasked,
  provider,
  title,
  keyPrefixHint,
  helpHref,
  helpLabel,
  helpAfter,
  primaryAction,
}: {
  brandSlug: string;
  apiKeyMasked: string | null;
  provider: "google" | "fal" | "replicate";
  title: string;
  keyPrefixHint: string;
  helpHref: string;
  helpLabel: string;
  helpAfter: string;
  primaryAction?: typeof saveImageGenApiKey;
}) {
  const action = primaryAction ?? saveProviderApiKey;
  const [state, formAction] = useActionState<SaveApiKeyResult | null, FormData>(
    action,
    null,
  );
  const [showKey, setShowKey] = useState(false);

  return (
    <form
      action={formAction}
      className="rounded-xl border border-zinc-200 bg-white p-5"
    >
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <input type="hidden" name="provider" value={provider} />
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{title} API key</h3>
        {state?.ok ? (
          <span className="text-xs text-emerald-700">Saved.</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Get one at{" "}
        <a
          href={helpHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {helpLabel}
        </a>
        . {helpAfter} Stored in this Pectus install&apos;s database, not in env.
      </p>

      <div className="mt-4 space-y-3">
        {apiKeyMasked ? (
          <p className="text-xs text-zinc-600">
            Saved key:{" "}
            <code className="rounded bg-zinc-100 px-1">{apiKeyMasked}</code>
          </p>
        ) : (
          <p className="text-xs text-amber-700">
            No key saved. Models from this provider will return an error until
            one is added.
          </p>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600">
            {apiKeyMasked ? "Replace key" : "API key"}
          </span>
          <div className="flex gap-2">
            <input
              name="api_key"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              placeholder={apiKeyMasked ? "Paste a new key to replace" : keyPrefixHint}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs hover:bg-zinc-50"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton
            pendingLabel="Saving…"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Save key
          </SubmitButton>
          {apiKeyMasked ? (
            <button
              type="submit"
              name="api_key"
              value=""
              className="text-xs text-red-600 hover:underline"
            >
              Remove saved key
            </button>
          ) : null}
          {state && !state.ok ? (
            <span className="text-sm text-red-600">{state.error}</span>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function ReferencePhotos({
  brandSlug,
  initialUrls,
}: {
  brandSlug: string;
  initialUrls: string[];
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onPickFiles = (files: FileList) => {
    setUploadError(null);
    const list = Array.from(files);
    if (list.length === 0) return;
    startUpload(async () => {
      const newPublic: string[] = [];
      for (const f of list) {
        if (f.size > 20 * 1024 * 1024) {
          setUploadError(`${f.name}: must be under 20 MB.`);
          continue;
        }
        const signed = await createReferenceImageUploadUrl(brandSlug, f.name);
        if (!signed.ok) {
          setUploadError(signed.error);
          continue;
        }
        const supabase = createBrowserClient();
        const { error: upErr } = await supabase.storage
          .from("article-images")
          .uploadToSignedUrl(signed.path, signed.token, f, {
            contentType: f.type || "image/jpeg",
            upsert: false,
          });
        if (upErr) {
          setUploadError(`${f.name}: ${upErr.message}`);
          continue;
        }
        newPublic.push(signed.publicUrl);
      }
      if (newPublic.length > 0) {
        const ok = await appendReferenceImageUrls(brandSlug, newPublic);
        if (ok.ok) {
          setUrls((prev) => Array.from(new Set([...prev, ...newPublic])));
        } else {
          setUploadError(ok.error);
        }
      }
    });
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h3 className="text-sm font-semibold">Brand reference photos</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Real photos of your brand in action. Gemini 3 Pro Image uses these so
        generated hero images look like you, not stock. Up to 20 MB per file.
      </p>

      {urls.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {urls.map((u) => (
            <li key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt=""
                className="h-24 w-full rounded object-cover"
              />
              <form action={removeReferenceImage} className="absolute right-1 top-1">
                <input type="hidden" name="brand_slug" value={brandSlug} />
                <input type="hidden" name="url" value={u} />
                <button
                  type="submit"
                  aria-label="Remove"
                  className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-800 hover:bg-white"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">No reference photos yet.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Add photos"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onPickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {uploadError ? (
          <span className="text-xs text-red-600">{uploadError}</span>
        ) : null}
      </div>
    </div>
  );
}

function CamerasSection({
  brandSlug,
  initialCameras,
}: {
  brandSlug: string;
  initialCameras: Camera[];
}) {
  const [cameras, setCameras] = useState<Camera[]>(
    initialCameras.length > 0 ? initialCameras : [],
  );
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const update = (idx: number, patch: Partial<Camera>) => {
    setCameras((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    );
  };

  const addCamera = () => {
    setCameras((prev) => [
      ...prev,
      {
        id: `cam-${Date.now()}-${prev.length}`,
        title: "",
        description: "",
        is_default: prev.length === 0,
      },
    ]);
  };

  const removeCamera = (idx: number) => {
    setCameras((prev) => prev.filter((_, i) => i !== idx));
  };

  const setDefault = (idx: number) => {
    setCameras((prev) => prev.map((c, i) => ({ ...c, is_default: i === idx })));
  };

  const onSave = () => {
    setError(null);
    startSave(async () => {
      const result = await saveCameras(brandSlug, cameras);
      if (result.ok) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Camera presets</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Named photography directions you can pick at image-gen time.
            Examples: &ldquo;Documentary natural light, 35mm, slight grain&rdquo;
            or &ldquo;Studio editorial, soft fill, brand colors in
            wardrobe&rdquo;. The default preset is also written to the brand&apos;s
            image guidelines.
          </p>
        </div>
        {savedFlash ? (
          <span className="text-xs text-emerald-600">Saved.</span>
        ) : null}
      </div>

      <ul className="mt-4 space-y-3">
        {cameras.map((c, idx) => (
          <li
            key={c.id}
            className="rounded-md border border-zinc-200 p-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={c.title}
                onChange={(e) => update(idx, { title: e.target.value })}
                placeholder="Title (e.g. Documentary natural)"
                className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  name="camera-default"
                  checked={c.is_default}
                  onChange={() => setDefault(idx)}
                />
                Default
              </label>
              <button
                type="button"
                onClick={() => removeCamera(idx)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <textarea
              value={c.description}
              onChange={(e) => update(idx, { description: e.target.value })}
              rows={3}
              placeholder="What the photo should look like — light, lens, mood, what's in frame, what's not."
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addCamera}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          + Add preset
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save presets"}
        </button>
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </div>
  );
}
