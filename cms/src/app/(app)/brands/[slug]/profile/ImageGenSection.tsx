"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
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
import { BrandPhotosManager } from "./BrandPhotosManager";

type StoredPhoto = {
  id: string;
  url: string;
  storage_path: string;
  description: string;
};
type StoredCategory = { id: string; label: string; photos: StoredPhoto[] };

type Props = {
  brandSlug: string;
  apiKeyMasked: string | null;
  falKeyMasked: string | null;
  replicateKeyMasked: string | null;
  referenceUrls: string[];
  photoCategories: StoredCategory[];
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
  photoCategories,
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

      <BrandPhotosManager
        brandSlug={brandSlug}
        initialCategories={photoCategories}
        legacyReferenceUrls={referenceUrls}
        apiKeyMasked={apiKeyMasked}
        falKeyMasked={falKeyMasked}
        replicateKeyMasked={replicateKeyMasked}
      />
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

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const RESIZE_TYPE = "image/jpeg";
const RESIZE_QUALITY = 0.9;
const ACCEPTED_TYPES = /^image\/(jpeg|png|webp|heic|heif|avif)$/i;

async function ensureWebSafeImage(
  f: File,
): Promise<{ ok: true; file: File } | { ok: false; error: string }> {
  if (!ACCEPTED_TYPES.test(f.type)) {
    return {
      ok: false,
      error: `${f.name}: ${f.type || "unknown type"} isn't supported. Use JPEG, PNG, WebP, HEIC, or AVIF.`,
    };
  }
  if (f.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `${f.name}: ${(f.size / 1024 / 1024).toFixed(1)} MB. Must be under 20 MB.`,
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(f);
  } catch (e) {
    return {
      ok: false,
      error: `${f.name}: couldn't decode the image. ${e instanceof Error ? e.message : "Unsupported format?"}`,
    };
  }

  const longestSide = Math.max(bitmap.width, bitmap.height);
  if (longestSide <= MAX_DIMENSION && /^image\/(jpeg|png|webp)$/i.test(f.type)) {
    bitmap.close();
    return { ok: true, file: f };
  }

  const scale = Math.min(1, MAX_DIMENSION / longestSide);
  const targetW = Math.round(bitmap.width * scale);
  const targetH = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { ok: false, error: `${f.name}: browser doesn't support 2D canvas.` };
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, RESIZE_TYPE, RESIZE_QUALITY),
  );
  if (!blob) {
    return { ok: false, error: `${f.name}: couldn't re-encode after resize.` };
  }
  const newName = f.name.replace(/\.[^.]+$/, "") + ".jpg";
  const resized = new File([blob], newName, { type: RESIZE_TYPE });
  if (resized.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `${f.name}: still over 20 MB after resize.`,
    };
  }
  return { ok: true, file: resized };
}

type UploadStage =
  | "queued"
  | "preparing"
  | "uploading"
  | "uploaded"
  | "error";

type Upload = {
  id: string;
  name: string;
  previewUrl: string;
  stage: UploadStage;
  progress: number;
  error: string | null;
  finalUrl: string | null;
};

const CONCURRENCY = 5;

async function putToSignedUrl(
  uploadEndpoint: string,
  token: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${uploadEndpoint}?token=${encodeURIComponent(token)}`);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve({ ok: true });
      } else {
        resolve({
          ok: false,
          error: `Upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200) || xhr.statusText}`,
        });
      }
    };
    xhr.onerror = () =>
      resolve({ ok: false, error: "Network error during upload." });
    xhr.send(file);
  });
}

function ReferencePhotos({
  brandSlug,
  initialUrls,
}: {
  brandSlug: string;
  initialUrls: string[];
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  // Revoke object URLs when the component unmounts so we don't leak memory.
  useEffect(() => {
    return () => {
      uploads.forEach((u) => URL.revokeObjectURL(u.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUpload = (id: string, patch: Partial<Upload>) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    );
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((u) => u.id !== id);
    });
  };

  async function processOne(upload: Upload, original: File): Promise<void> {
    updateUpload(upload.id, { stage: "preparing" });
    const prepared = await ensureWebSafeImage(original);
    if (!prepared.ok) {
      updateUpload(upload.id, { stage: "error", error: prepared.error });
      return;
    }

    const signed = await createReferenceImageUploadUrl(
      brandSlug,
      prepared.file.name,
    );
    if (!signed.ok) {
      updateUpload(upload.id, { stage: "error", error: signed.error });
      return;
    }

    if (!supabaseUrl) {
      updateUpload(upload.id, {
        stage: "error",
        error:
          "NEXT_PUBLIC_SUPABASE_URL is missing. Set it and restart the server.",
      });
      return;
    }

    const uploadEndpoint = `${supabaseUrl}/storage/v1/object/upload/sign/article-images/${signed.path}`;

    updateUpload(upload.id, { stage: "uploading", progress: 0 });
    const result = await putToSignedUrl(
      uploadEndpoint,
      signed.token,
      prepared.file,
      (pct) => updateUpload(upload.id, { progress: pct }),
    );
    if (!result.ok) {
      updateUpload(upload.id, { stage: "error", error: result.error });
      return;
    }

    updateUpload(upload.id, {
      stage: "uploaded",
      progress: 100,
      finalUrl: signed.publicUrl,
    });
  }

  async function runQueue(items: Array<{ upload: Upload; file: File }>) {
    const queue = [...items];
    const workers: Promise<void>[] = [];
    const next = async (): Promise<void> => {
      const item = queue.shift();
      if (!item) return;
      await processOne(item.upload, item.file);
      return next();
    };
    for (let i = 0; i < Math.min(CONCURRENCY, items.length); i++) {
      workers.push(next());
    }
    await Promise.all(workers);

    setUploads((prev) => {
      const successful = prev
        .filter((u) => items.some((it) => it.upload.id === u.id))
        .filter((u) => u.stage === "uploaded" && u.finalUrl);
      if (successful.length === 0) return prev;
      const newUrls = successful.map((u) => u.finalUrl!) as string[];
      appendReferenceImageUrls(brandSlug, newUrls).then((ok) => {
        if (ok.ok) {
          setUrls((p) => Array.from(new Set([...p, ...newUrls])));
          setTimeout(() => {
            successful.forEach((u) => URL.revokeObjectURL(u.previewUrl));
            setUploads((p) => p.filter((u) => u.stage !== "uploaded"));
          }, 600);
        }
      });
      return prev;
    });
  }

  const onPickFiles = (files: FileList) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    const newItems = list.map((f) => {
      const id = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const previewUrl = URL.createObjectURL(f);
      const upload: Upload = {
        id,
        name: f.name,
        previewUrl,
        stage: "queued",
        progress: 0,
        error: null,
        finalUrl: null,
      };
      return { upload, file: f };
    });
    setUploads((prev) => [...prev, ...newItems.map((i) => i.upload)]);
    runQueue(newItems);
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

      {uploads.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {uploads.map((u) => (
            <li
              key={u.id}
              className={`relative overflow-hidden rounded border ${
                u.stage === "error"
                  ? "border-red-300"
                  : u.stage === "uploaded"
                    ? "border-emerald-300"
                    : "border-zinc-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u.previewUrl}
                alt={u.name}
                className={`h-24 w-full object-cover transition ${
                  u.stage !== "uploaded" && u.stage !== "error"
                    ? "opacity-60"
                    : ""
                }`}
              />
              {u.stage !== "error" ? (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-100">
                  <div
                    className={`h-full transition-[width] duration-200 ${
                      u.stage === "uploaded" ? "bg-emerald-500" : "bg-pink-600"
                    }`}
                    style={{
                      width: `${
                        u.stage === "uploaded"
                          ? 100
                          : u.stage === "uploading"
                            ? Math.max(2, u.progress)
                            : u.stage === "preparing"
                              ? 5
                              : 0
                      }%`,
                    }}
                  />
                </div>
              ) : null}
              <span
                className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  u.stage === "error"
                    ? "bg-red-100 text-red-800"
                    : u.stage === "uploaded"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-900/80 text-white"
                }`}
              >
                {u.stage === "queued"
                  ? "Queued"
                  : u.stage === "preparing"
                    ? "Preparing"
                    : u.stage === "uploading"
                      ? `${Math.round(u.progress)}%`
                      : u.stage === "uploaded"
                        ? "Done"
                        : "Failed"}
              </span>
              <button
                type="button"
                onClick={() => removeUpload(u.id)}
                aria-label="Dismiss"
                className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-800 hover:bg-white"
              >
                ✕
              </button>
              {u.stage === "error" && u.error ? (
                <p
                  className="absolute inset-x-0 bottom-0 bg-red-50/95 px-1 py-0.5 text-[9px] text-red-800"
                  title={u.error}
                >
                  {u.error.slice(0, 60)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Add photos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) onPickFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <span className="text-[11px] text-zinc-500">
            JPEG / PNG / WebP / HEIC / AVIF. Up to 5 in parallel. Anything over
            2048px is auto-resized in your browser before upload. 20 MB max per
            file.
          </span>
        </div>
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
