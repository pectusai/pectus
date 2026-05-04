"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { publishVariant } from "./actions";

export function PublishButton({
  projectCode,
  variantId,
  isPublished,
  hasRepo,
  lastPublishedPath,
  currentResolvedPath,
}: {
  projectCode: string;
  variantId: string;
  isPublished: boolean;
  hasRepo: boolean;
  lastPublishedPath: string | null;
  currentResolvedPath: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | null
    | { kind: "ok"; url: string; sha: string; redirect: { from: string; to: string } | null }
    | { kind: "err"; message: string }
  >(null);

  if (!hasRepo) {
    return (
      <div className="max-w-[24rem] rounded-md border border-amber-200 bg-amber-50 p-3 text-right text-xs text-amber-900">
        <p className="font-medium">Publish needs GitHub repo</p>
        <p className="mt-1 text-amber-800">
          Set <code>content_hub_repo</code> under{" "}
          <Link
            href={`/projects/${projectCode}/apps/content-hub/settings/site-url`}
            className="underline"
          >
            Site URL settings
          </Link>{" "}
          before publishing.
        </p>
      </div>
    );
  }

  const willCreateRedirect =
    !!lastPublishedPath && lastPublishedPath !== currentResolvedPath;

  const onClick = () => {
    if (
      willCreateRedirect &&
      !window.confirm(
        `The slug or tree position has changed since the last publish.\n\nA 301 redirect will be added:\n  ${lastPublishedPath}  →  ${currentResolvedPath}\n\nProceed?`,
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const r = await publishVariant({ projectCode, variantId });
      if (!r.ok) {
        setResult({ kind: "err", message: r.error });
        return;
      }
      setResult({
        kind: "ok",
        url: r.url,
        sha: r.commitSha,
        redirect: r.redirectAdded
          ? { from: r.redirectAdded.from_path, to: r.redirectAdded.to_path }
          : null,
      });
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
        title={
          isPublished
            ? "Republish this variant: builds the page JSON, regenerates the site-plan and redirects, and commits to your content-hub repo."
            : "Publish this variant: writes content/pages/<locale>/<slug>.json (and refreshes site-plan + redirects) to your content-hub repo. Vercel auto-deploys."
        }
      >
        {pending
          ? "Publishing…"
          : isPublished
            ? "Republish"
            : "Publish"}
      </button>
      {result?.kind === "ok" && (
        <p className="max-w-[36rem] text-xs text-emerald-700">
          Published to <code>{result.url}</code> · commit{" "}
          <code>{result.sha.slice(0, 7)}</code>
          {result.redirect && (
            <>
              {" "}· redirect <code>{result.redirect.from}</code> →{" "}
              <code>{result.redirect.to}</code>
            </>
          )}
          .
        </p>
      )}
      {result?.kind === "err" && (
        <p className="max-w-[36rem] text-xs text-red-600">{result.message}</p>
      )}
      {willCreateRedirect && !result && (
        <p
          className="max-w-[36rem] text-right text-[11px] text-amber-700"
          title="The current slug or tree position differs from where this page was last published. Publishing will commit a 301 redirect from the old path."
        >
          Will redirect <code>{lastPublishedPath}</code> →{" "}
          <code>{currentResolvedPath}</code>
        </p>
      )}
    </div>
  );
}
