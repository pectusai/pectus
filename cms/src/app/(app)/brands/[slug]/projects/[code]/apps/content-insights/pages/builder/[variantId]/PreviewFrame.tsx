"use client";

import { useState } from "react";

export function PreviewFrame({
  src,
  iframeId,
}: {
  src: string;
  iframeId: string;
}) {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="relative">
      <iframe
        key={reloadKey}
        id={iframeId}
        src={src}
        title="Page preview"
        className="hidden h-[calc(100vh-14rem)] min-h-[560px] w-full rounded border border-zinc-200 bg-white lg:block"
      />
      <button
        type="button"
        onClick={() => setReloadKey((k) => k + 1)}
        className="absolute right-3 top-3 hidden rounded-md border border-zinc-200 bg-white/90 px-2 py-1 text-xs text-zinc-700 shadow-sm hover:bg-white lg:inline-flex"
        title="Force the preview to reload."
      >
        Reload
      </button>
    </div>
  );
}
