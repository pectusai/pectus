"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  createExamplePhotoUploadUrl,
  saveExamplePhotoCategories,
  describeImageByUrl,
  addPhotoToCategory,
  persistPhotoDescription,
  type ExampleSaveCategory,
  type StoredExampleCategory,
  type StoredExamplePhoto,
} from "./image-gen-actions";
import { ApiKeysPanel } from "./ApiKeysPanel";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const RESIZE_TYPE = "image/jpeg";
const RESIZE_QUALITY = 0.9;
const ACCEPTED_TYPES = /^image\/(jpeg|png|webp)$/i;

type LocalPhoto = StoredExamplePhoto & {
  describing?: boolean;
  describeError?: string | null;
};
type LocalCategory = {
  id: string;
  label: string;
  photos: LocalPhoto[];
};

let idSeq = 0;
const newLocalId = (prefix: string) =>
  `${prefix}-${Date.now()}-${(idSeq++).toString(36)}`;

function clone(cats: LocalCategory[]): LocalCategory[] {
  return cats.map((c) => ({ ...c, photos: c.photos.map((p) => ({ ...p })) }));
}

async function ensureWebSafeImage(
  f: File,
): Promise<{ ok: true; file: File } | { ok: false; error: string }> {
  if (!ACCEPTED_TYPES.test(f.type)) {
    return {
      ok: false,
      error: `${f.name}: ${f.type || "unknown type"} isn't supported. Use JPEG, PNG, or WebP.`,
    };
  }
  if (f.size === 0) return { ok: false, error: `${f.name}: file is empty.` };
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
      error: `${f.name}: couldn't decode. ${e instanceof Error ? e.message : "Unsupported format?"}`,
    };
  }
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= MAX_DIMENSION) {
    bitmap.close();
    return { ok: true, file: f };
  }
  const scale = MAX_DIMENSION / longest;
  const targetW = Math.round(bitmap.width * scale);
  const targetH = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { ok: false, error: `${f.name}: 2D canvas unsupported.` };
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, RESIZE_TYPE, RESIZE_QUALITY),
  );
  if (!blob) {
    return { ok: false, error: `${f.name}: couldn't re-encode after resize.` };
  }
  const renamed =
    f.name.replace(/\.[^.]+$/, "") + ".jpg";
  return { ok: true, file: new File([blob], renamed, { type: RESIZE_TYPE }) };
}

async function putWithProgress(
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

export function BrandPhotosManager({
  brandSlug,
  initialCategories,
  legacyReferenceUrls,
  apiKeyMasked,
  falKeyMasked,
  replicateKeyMasked,
}: {
  brandSlug: string;
  initialCategories: StoredExampleCategory[];
  legacyReferenceUrls: string[];
  apiKeyMasked: string | null;
  falKeyMasked: string | null;
  replicateKeyMasked: string | null;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const [categories, setCategories] = useState<LocalCategory[]>(() => {
    const seeded = initialCategories.map(
      (c): LocalCategory => ({
        id: c.id,
        label: c.label,
        photos: c.photos.map((p) => ({ ...p })),
      }),
    );
    if (legacyReferenceUrls.length > 0) {
      seeded.push({
        id: "_legacy_refs",
        label: "Uncategorized",
        photos: legacyReferenceUrls.map((url) => ({
          id: newLocalId("ph"),
          url,
          storage_path: "",
          description: "",
        })),
      });
    }
    return seeded;
  });

  const [progress, setProgress] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<
    | { categoryId: string; photoId: string; text: string; describing: boolean }
    | null
  >(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const dirtyRef = useRef(false);

  // Warn before unloading if there are unsaved local changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const markDirty = () => {
    dirtyRef.current = true;
  };

  const updateCategories = (
    fn: (cats: LocalCategory[]) => LocalCategory[],
  ) => {
    setCategories((prev) => {
      markDirty();
      return fn(clone(prev));
    });
  };

  // ── Category-level operations ───────────────────────────────────────────

  const addCategory = () => {
    updateCategories((prev) => [
      ...prev,
      { id: newLocalId("cat"), label: "", photos: [] },
    ]);
  };

  const renameCategory = (id: string, label: string) => {
    updateCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, label } : c)),
    );
  };

  const removeCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    if (
      !window.confirm(
        `Delete category "${cat.label || "(unnamed)"}" and its ${cat.photos.length} photos?`,
      )
    )
      return;
    updateCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const moveCategory = (id: string, direction: -1 | 1) => {
    updateCategories((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      if (i < 0) return prev;
      const next = [...prev];
      const j = i + direction;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const removePhoto = (categoryId: string, photoId: string) => {
    updateCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, photos: c.photos.filter((p) => p.id !== photoId) }
          : c,
      ),
    );
  };

  // ── Upload pipeline ─────────────────────────────────────────────────────

  const uploadOne = async (
    categoryId: string,
    original: File,
    label: string,
  ): Promise<void> => {
    const prepared = await ensureWebSafeImage(original);
    if (!prepared.ok) {
      setSaveError((prev) =>
        prev ? `${prev}\n${prepared.error}` : prepared.error,
      );
      return;
    }
    const f = prepared.file;
    setProgress(`Preparing ${original.name} → ${label || "category"}…`);

    const signed = await createExamplePhotoUploadUrl(brandSlug, f.name);
    if (!signed.ok) {
      setSaveError(signed.error);
      return;
    }
    if (!supabaseUrl) {
      setSaveError(
        "NEXT_PUBLIC_SUPABASE_URL is missing. Set it and restart the server.",
      );
      return;
    }
    const endpoint = `${supabaseUrl}/storage/v1/object/upload/sign/article-images/${signed.path}`;
    setProgress(`Uploading ${original.name}…`);
    const result = await putWithProgress(
      endpoint,
      signed.token,
      f,
      (pct) =>
        setProgress(
          `Uploading ${original.name} → ${label || "category"} (${Math.round(pct)}%)…`,
        ),
    );
    if (!result.ok) {
      setSaveError(`${original.name}: ${result.error}`);
      return;
    }

    const localId = newLocalId("ph");
    const newPhoto: LocalPhoto = {
      id: localId,
      url: signed.publicUrl,
      storage_path: signed.path,
      description: "",
      describing: false,
    };
    updateCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, photos: [...c.photos, newPhoto] } : c,
      ),
    );

    // Persist immediately — no need to click Save for the photo to remain.
    const cat = categories.find((c) => c.id === categoryId);
    const labelToSend =
      cat?.label?.trim() || (categoryId === "_legacy_refs" ? "Uncategorized" : "");
    if (labelToSend) {
      const persisted = await addPhotoToCategory(
        brandSlug,
        categoryId === "_legacy_refs" ? "" : categoryId,
        labelToSend,
        {
          url: signed.publicUrl,
          storage_path: signed.path,
          description: "",
        },
      );
      if (persisted.ok) {
        // Sync the server-issued ids onto the local entry so future actions
        // (describe persist, remove) match the right row.
        const serverCategoryId = persisted.categoryId;
        const serverPhotoId = persisted.photoId;
        updateCategories((prev) =>
          prev.map((c) => {
            if (c.id === categoryId) {
              return {
                ...c,
                id: serverCategoryId,
                photos: c.photos.map((p) =>
                  p.id === localId ? { ...p, id: serverPhotoId } : p,
                ),
              };
            }
            return c;
          }),
        );
        dirtyRef.current = false; // freshly persisted
      } else {
        setSaveError(
          `Photo uploaded but couldn't auto-save: ${persisted.error}\nClick "Save example photos" to retry.`,
        );
      }
    } else {
      setSaveError(
        `${original.name}: photo uploaded but couldn't auto-save — give the category a name first.`,
      );
    }
  };

  const onPickFiles = async (categoryId: string, files: FileList) => {
    setSaveError(null);
    const list = Array.from(files);
    if (list.length === 0) return;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    if (!cat.label.trim() && cat.id !== "_legacy_refs") {
      setSaveError(
        "Give this category a name before adding photos to it.",
      );
      return;
    }
    for (let i = 0; i < list.length; i++) {
      setProgress(`Uploading ${i + 1} of ${list.length}…`);
      await uploadOne(categoryId, list[i], cat.label);
    }
    setProgress(null);
  };

  // ── Drawer (description editor + Gemini describe) ──────────────────────

  const openDrawer = (categoryId: string, photoId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    const photo = cat?.photos.find((p) => p.id === photoId);
    if (!photo) return;
    setDrawer({
      categoryId,
      photoId,
      text: photo.description ?? "",
      describing: false,
    });
    setDrawerError(null);
  };

  const closeDrawer = () => {
    setDrawer(null);
    setDrawerError(null);
  };

  const applyDrawerDescription = async () => {
    if (!drawer) return;
    const cat = categories.find((c) => c.id === drawer.categoryId);
    const photo = cat?.photos.find((p) => p.id === drawer.photoId);
    const text = drawer.text.trim();
    updateCategories((prev) =>
      prev.map((c) =>
        c.id === drawer.categoryId
          ? {
              ...c,
              photos: c.photos.map((p) =>
                p.id === drawer.photoId ? { ...p, description: text } : p,
              ),
            }
          : c,
      ),
    );
    closeDrawer();
    if (photo?.url) {
      const res = await persistPhotoDescription(brandSlug, photo.url, text);
      if (!res.ok) {
        setSaveError(
          `Couldn't auto-save the description: ${res.error}\nClick "Save example photos" to commit.`,
        );
      }
    }
  };

  const generateDescriptionForDrawer = async () => {
    if (!drawer) return;
    const cat = categories.find((c) => c.id === drawer.categoryId);
    const photo = cat?.photos.find((p) => p.id === drawer.photoId);
    if (!photo) return;
    setDrawer({ ...drawer, describing: true });
    setDrawerError(null);
    const res = await describeImageByUrl(brandSlug, photo.url);
    if (!res.ok) {
      setDrawer({ ...drawer, describing: false });
      setDrawerError(res.error);
      return;
    }
    // Reflect in local state. Persistence happens on Save.
    updateCategories((prev) =>
      prev.map((c) =>
        c.id === drawer.categoryId
          ? {
              ...c,
              photos: c.photos.map((p) =>
                p.id === drawer.photoId
                  ? { ...p, description: res.description }
                  : p,
              ),
            }
          : c,
      ),
    );
    setDrawer({
      categoryId: drawer.categoryId,
      photoId: drawer.photoId,
      text: res.description,
      describing: false,
    });
  };

  // ── Save (the only operation that persists structural changes) ─────────

  const onSave = () => {
    setSaveError(null);
    setSavedFlash(false);

    // Strip the synthetic legacy bucket; users should rename/move it.
    const payload: ExampleSaveCategory[] = categories
      .filter((c) => c.id !== "_legacy_refs" || c.photos.length > 0)
      .map((c) => ({
        id: c.id === "_legacy_refs" ? undefined : c.id,
        label: c.label.trim() || (c.id === "_legacy_refs" ? "Uncategorized" : ""),
        photos: c.photos.map((p) => ({
          id: p.id,
          url: p.url,
          storage_path: p.storage_path,
          description: p.description,
        })),
      }));

    startSave(async () => {
      const res = await saveExamplePhotoCategories(brandSlug, payload);
      if (!res.ok) {
        setSaveError(res.error);
        return;
      }
      // Replace local state with the server's normalised return.
      const next: LocalCategory[] = res.categories.map((c) => ({
        id: c.id,
        label: c.label,
        photos: c.photos.map((p) => ({ ...p })),
      }));
      setCategories(next);
      dirtyRef.current = false;
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Example photos</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Group photos by what they show. Pick one when generating an image
            and we&apos;ll turn it into a base prompt you can tweak. Click any
            thumbnail to edit its description.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedFlash ? (
            <span className="text-xs text-emerald-700">Saved.</span>
          ) : null}
          {progress ? (
            <span className="text-xs text-zinc-600">{progress}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <ApiKeysPanel
          brandSlug={brandSlug}
          apiKeyMasked={apiKeyMasked}
          falKeyMasked={falKeyMasked}
          replicateKeyMasked={replicateKeyMasked}
        />
      </div>

      <div className="mt-4 space-y-3">
        {categories.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
            No categories yet. Click <strong>Add category</strong> below to
            start.
          </p>
        ) : (
          categories.map((cat, idx) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              isFirst={idx === 0}
              isLast={idx === categories.length - 1}
              onRenameCategory={renameCategory}
              onMoveCategory={moveCategory}
              onRemoveCategory={removeCategory}
              onPickFiles={onPickFiles}
              onClickPhoto={openDrawer}
              onRemovePhoto={removePhoto}
            />
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addCategory}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:border-zinc-400"
        >
          + Add category
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save example photos"}
        </button>
        {saveError ? (
          <pre className="whitespace-pre-wrap text-xs text-red-700">
            {saveError}
          </pre>
        ) : null}
      </div>

      {drawer ? (
        <DescriptionDrawer
          drawer={drawer}
          photo={
            categories
              .find((c) => c.id === drawer.categoryId)
              ?.photos.find((p) => p.id === drawer.photoId) ?? null
          }
          error={drawerError}
          onClose={closeDrawer}
          onChangeText={(text) => setDrawer({ ...drawer, text })}
          onApply={applyDrawerDescription}
          onGenerate={generateDescriptionForDrawer}
        />
      ) : null}
    </div>
  );
}

function CategoryCard({
  cat,
  isFirst,
  isLast,
  onRenameCategory,
  onMoveCategory,
  onRemoveCategory,
  onPickFiles,
  onClickPhoto,
  onRemovePhoto,
}: {
  cat: LocalCategory;
  isFirst: boolean;
  isLast: boolean;
  onRenameCategory: (id: string, label: string) => void;
  onMoveCategory: (id: string, direction: -1 | 1) => void;
  onRemoveCategory: (id: string) => void;
  onPickFiles: (categoryId: string, files: FileList) => void;
  onClickPhoto: (categoryId: string, photoId: string) => void;
  onRemovePhoto: (categoryId: string, photoId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={cat.label}
          onChange={(e) => onRenameCategory(cat.id, e.target.value)}
          placeholder="Category name (e.g. Workplace candids)"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:border-zinc-400"
        >
          Add photos
        </button>
        <button
          type="button"
          onClick={() => onMoveCategory(cat.id, -1)}
          disabled={isFirst}
          aria-label="Move category up"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium hover:border-zinc-400 disabled:opacity-40"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMoveCategory(cat.id, 1)}
          disabled={isLast}
          aria-label="Move category down"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium hover:border-zinc-400 disabled:opacity-40"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => onRemoveCategory(cat.id)}
          aria-label="Delete category"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:border-red-300 hover:text-red-700"
        >
          ✕
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onPickFiles(cat.id, e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {cat.photos.length === 0 ? (
        <p className="mt-2 text-[11px] text-zinc-500">
          No photos in this category yet.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {cat.photos.map((p) => {
            const hasDesc = !!p.description?.trim();
            return (
              <li key={p.id} className="relative group">
                <button
                  type="button"
                  onClick={() => onClickPhoto(cat.id, p.id)}
                  className="block aspect-square w-full overflow-hidden rounded border border-zinc-200 bg-white"
                  aria-label={
                    hasDesc
                      ? "Edit description"
                      : "Add description (no description yet)"
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
                {!hasDesc ? (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-amber-100/95 px-1 py-0.5 text-center text-[9px] font-bold text-amber-900">
                    No description
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemovePhoto(cat.id, p.id)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-zinc-800 opacity-0 transition group-hover:opacity-100 hover:bg-white"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DescriptionDrawer({
  drawer,
  photo,
  error,
  onClose,
  onChangeText,
  onApply,
  onGenerate,
}: {
  drawer: {
    categoryId: string;
    photoId: string;
    text: string;
    describing: boolean;
  };
  photo: LocalPhoto | null;
  error: string | null;
  onClose: () => void;
  onChangeText: (text: string) => void;
  onApply: () => void;
  onGenerate: () => void;
}) {
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-stretch justify-end bg-zinc-900/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-full w-full max-w-md flex-col gap-3 overflow-y-auto bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">
            Photo description
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-900"
          >
            Close
          </button>
        </div>

        <div className="overflow-hidden rounded-md border border-zinc-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt=""
            className="aspect-video w-full object-cover"
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-700">
            Base prompt description
          </span>
          <textarea
            value={drawer.text}
            onChange={(e) => onChangeText(e.target.value)}
            rows={8}
            placeholder="Subject, setting, light, mood. Avoid camera/film talk; that lives in the camera preset."
            className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </label>
        <p className="text-[11px] text-zinc-500">
          This becomes the starting prompt when someone picks this photo. Edits
          here apply for everyone next time.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={drawer.describing}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-zinc-400 disabled:opacity-60"
          >
            {drawer.describing
              ? "Asking Gemini…"
              : photo.description
                ? "Re-describe with Gemini"
                : "Generate description"}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={drawer.describing}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-60"
          >
            Apply
          </button>
          <span className="text-[11px] text-zinc-500">
            Apply updates this photo locally; click <em>Save example photos</em>{" "}
            to persist.
          </span>
        </div>

        {error ? (
          <p className="whitespace-pre-wrap text-[11px] text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
