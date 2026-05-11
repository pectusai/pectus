"use client";

import { useEffect, useState } from "react";

export function PreviewFrame({
  src,
  iframeId,
  previewBase,
}: {
  src: string;
  iframeId: string;
  previewBase: string;
}) {
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        await fetch(previewBase, { mode: "no-cors", cache: "no-store" });
        if (cancelled) return;
        setReachable((prev) => {
          if (prev === false) setReloadKey((k) => k + 1);
          return true;
        });
      } catch {
        if (!cancelled) setReachable(false);
      }
    };
    check();
    const id = setInterval(check, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [previewBase]);

  return (
    <div className="relative">
      <iframe
        key={reloadKey}
        id={iframeId}
        src={src}
        title="Page preview"
        className="hidden h-[calc(100vh-14rem)] min-h-[560px] w-full rounded border border-zinc-200 bg-white lg:block"
      />
      {reachable !== true && (
        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded bg-zinc-900/70 p-6 backdrop-blur-sm lg:flex">
          <div className="pointer-events-auto max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
            <h3 className="text-base font-semibold text-zinc-900">
              To see the preview here
            </h3>
            <ol className="mt-4 space-y-3 text-sm text-zinc-700">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                  1
                </span>
                <span className="pt-0.5">Open Terminal.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                  2
                </span>
                <span className="pt-0.5">
                  Write{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
                    cd ~/pectus
                  </code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                  3
                </span>
                <span className="pt-0.5">
                  Then{" "}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">
                    npm run dev -w @pectus/content-hub
                  </code>
                </span>
              </li>
            </ol>
            <p className="mt-4 text-xs text-zinc-500">
              Waiting for <code className="font-mono">{previewBase}</code>.
              This panel will refresh as soon as the server is up.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
