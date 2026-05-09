"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import {
  generateHeroImage,
  createHeroUploadUrl,
  setHeroImageUrl,
  type GenerateHeroResult,
} from "../actions";
import { createClient as createBrowserClient } from "@pectus/supabase/browser";
import type { Camera, ExamplePhotoCategory } from "@/lib/brand-types";
import { ExamplePhotoPicker } from "./ExamplePhotoPicker";
import Link from "next/link";

const STAGES = [
  "Reading the article for the real subject",
  "Pulling your brand reference photos",
  "Framing a 16:9 with headroom for a title",
  "Dialling in natural light and grain",
  "Keeping humans looking like actual humans",
  "Avoiding stock-photo handshakes",
  "Final render",
];

type Props = {
  brandSlug: string;
  code: string;
  articleId: string;
  title: string;
  initialHero: string | null;
  canEdit: boolean;
  defaultModel: string;
  cameras?: Camera[];
  examplePhotoCategories?: ExamplePhotoCategory[];
};

export function HeroImageSection({
  brandSlug,
  code,
  articleId,
  title,
  initialHero,
  canEdit,
  defaultModel,
  cameras = [],
  examplePhotoCategories = [],
}: Props) {
  const defaultCameraId =
    cameras.find((c) => c.is_default)?.id ?? cameras[0]?.id ?? "";
  const [hero, setHero] = useState<string | null>(initialHero);
  const [userPrompt, setUserPrompt] = useState("");
  const [heroState, heroAction, heroPending] = useActionState<
    GenerateHeroResult | null,
    FormData
  >(generateHeroImage, null);
  const [stageIdx, setStageIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!heroPending) return;
    setStageIdx(0);
    const i = setInterval(() => {
      setStageIdx((v) => (v + 1) % STAGES.length);
    }, 2200);
    return () => clearInterval(i);
  }, [heroPending]);

  useEffect(() => {
    if (heroState?.ok && heroState.heroUrl) {
      setHero(heroState.heroUrl);
    }
  }, [heroState]);

  const onPickFile = (f: File) => {
    setUploadError(null);
    if (f.size > 20 * 1024 * 1024) {
      setUploadError("Image must be under 20 MB.");
      return;
    }
    startUpload(async () => {
      const signed = await createHeroUploadUrl(brandSlug, code, articleId, f.name);
      if (!signed.ok) {
        setUploadError(signed.error);
        return;
      }
      const supabase = createBrowserClient();
      const { error: upErr } = await supabase.storage
        .from("article-images")
        .uploadToSignedUrl(signed.path, signed.token, f, {
          contentType: f.type || "image/jpeg",
          upsert: false,
        });
      if (upErr) {
        setUploadError(`Upload failed: ${upErr.message}`);
        return;
      }
      const saved = await setHeroImageUrl(
        brandSlug,
        code,
        articleId,
        signed.publicUrl,
      );
      if (!saved.ok) {
        setUploadError(saved.error);
        return;
      }
      setHero(signed.publicUrl);
    });
  };

  const noCameras = cameras.length === 0;
  const noPhotos = examplePhotoCategories.length === 0;
  const showSetupCallout = noCameras || noPhotos;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-zinc-900">
          Hero image
        </h3>
      </div>

      {showSetupCallout ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
          <strong className="font-semibold">Brand setup makes this much better.</strong>{" "}
          {noCameras ? (
            <>You haven&apos;t added any <strong>cameras</strong> yet (Leica/Portra preset, etc.) which carries the photography direction. </>
          ) : null}
          {noPhotos ? (
            <>You haven&apos;t added <strong>reference photos</strong> for Gemini to anchor on. </>
          ) : null}
          Add cameras, reference photos, and image generation API keys (Google AI, fal.ai, Replicate) on the{" "}
          <Link
            href={`/brands/${brandSlug}/profile`}
            className="font-semibold text-amber-900 underline underline-offset-2"
          >
            brand profile
          </Link>
          .
        </div>
      ) : null}

      <div className="relative mt-3 overflow-hidden rounded-md">
        {hero ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={hero}
            alt={title}
            className={`max-h-80 w-full object-cover transition ${
              heroPending ? "opacity-30 blur-[1px]" : ""
            }`}
          />
        ) : (
          <div
            className={`flex h-64 w-full items-center justify-center rounded-md border border-dashed border-zinc-300 text-xs text-zinc-500 ${
              heroPending ? "opacity-40" : ""
            }`}
          >
            No hero image yet.
          </div>
        )}

        {heroPending ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 px-6 text-center backdrop-blur-sm">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-zinc-900 border-r-zinc-400" />
            </div>
            <div className="text-sm font-semibold text-zinc-900">
              {STAGES[stageIdx]}…
            </div>
            <div className="max-w-md text-xs text-zinc-600">
              Takes around 20 seconds. Feel free to keep editing the text below
              — the image will slot in when it&rsquo;s ready.
            </div>
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <form action={heroAction} className="mt-4 space-y-3">
          <input type="hidden" name="brand_slug" value={brandSlug} />
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="id" value={articleId} />
          {examplePhotoCategories.length > 0 ? (
            <ExamplePhotoPicker
              categories={examplePhotoCategories}
              onUseAsPrompt={(text) => setUserPrompt(text)}
            />
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">
              Describe the cover photo
            </span>
            <textarea
              name="user_prompt"
              rows={3}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Write what the image should show. Or pick a brand photo above and tweak the generated description."
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {cameras.length > 0 ? (
              <select
                name="camera_id"
                defaultValue={defaultCameraId}
                aria-label="Camera"
                className="h-[38px] rounded-md border border-zinc-300 bg-white px-3 text-sm"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.is_default ? " (default)" : ""}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              name="model"
              defaultValue={defaultModel}
              aria-label="Image model"
              className="h-[38px] rounded-md border border-zinc-300 bg-white px-3 text-sm"
            >
              <optgroup label="Google">
                <option value="imagen-4">Imagen 4</option>
                <option value="imagen-4-fast">Imagen 4 Fast</option>
                <option value="imagen-4-ultra">Imagen 4 Ultra</option>
                <option value="gemini-3-pro-image-preview">
                  Gemini 3 Pro (uses reference photos)
                </option>
              </optgroup>
              <optgroup label="fal.ai">
                <option value="flux-pro-1.1-ultra">Flux Pro 1.1 Ultra</option>
              </optgroup>
              <optgroup label="Replicate">
                <option value="flux-dev">Flux Dev</option>
                <option value="recraft-v3">Recraft v3</option>
              </optgroup>
            </select>
            <SubmitButton
              pendingLabel="Generating (~20s)…"
              disabled={!userPrompt.trim()}
              className="h-[38px] rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
            >
              {hero ? "Regenerate hero image" : "Generate hero image"}
            </SubmitButton>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-[38px] rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload your own"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
                e.target.value = "";
              }}
            />
            {heroState && !heroPending ? (
              <span
                className={`text-xs ${
                  heroState.ok ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {heroState.ok ? "New hero saved." : heroState.error}
              </span>
            ) : null}
            {uploadError ? (
              <span className="text-xs text-red-600">{uploadError}</span>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
