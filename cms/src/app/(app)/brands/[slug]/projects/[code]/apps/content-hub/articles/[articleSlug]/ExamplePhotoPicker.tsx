"use client";

import { useState } from "react";
import type { ExamplePhotoCategory } from "@/lib/brand-types";

type Props = {
  categories: ExamplePhotoCategory[];
  onUseAsPrompt: (description: string) => void;
  compact?: boolean;
};

export function ExamplePhotoPicker({
  categories,
  onUseAsPrompt,
  compact = false,
}: Props) {
  const [categoryId, setCategoryId] = useState<string>(
    categories[0]?.id ?? "",
  );
  const [photoId, setPhotoId] = useState<string>("");

  if (categories.length === 0) return null;

  const category = categories.find((c) => c.id === categoryId);
  const photos = category?.photos ?? [];
  const selectedPhoto = photos.find((p) => p.id === photoId) ?? null;

  const apply = () => {
    if (!selectedPhoto?.description) return;
    onUseAsPrompt(selectedPhoto.description);
  };

  const textSize = compact ? "text-xs" : "text-sm";

  return (
    <div
      className={`rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 ${textSize}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-700">
          Start from a brand photo
        </span>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPhotoId("");
          }}
          aria-label="Category"
          className="h-[30px] rounded-md border border-zinc-300 bg-white px-2 text-xs"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {photos.length > 0 ? (
        <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {photos.map((photo) => {
            const isSelected = photo.id === photoId;
            const isDescribed = Boolean(photo.description?.trim());
            return (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => setPhotoId(photo.id)}
                  aria-label={`Select photo${isDescribed ? "" : " (no description yet)"}`}
                  className={`relative block aspect-square w-full overflow-hidden rounded-md border transition ${
                    isSelected
                      ? "border-zinc-900 ring-2 ring-zinc-900"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {!isDescribed ? (
                    <span className="absolute inset-x-0 bottom-0 bg-amber-100/95 px-1 py-0.5 text-[9px] font-medium text-amber-900">
                      No description
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-zinc-500">
          No photos in this category yet.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={!selectedPhoto || !selectedPhoto.description}
          className="h-[30px] rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          Use as prompt
        </button>
        {selectedPhoto && !selectedPhoto.description ? (
          <span className="text-[11px] text-amber-700">
            No description on this photo yet. An admin can describe it on the
            brand page.
          </span>
        ) : null}
      </div>
    </div>
  );
}
