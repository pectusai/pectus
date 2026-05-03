"use client";

import { useState, useTransition } from "react";
import { switchOrCreateVariantForLocale } from "./actions";

export type LocaleVariantStub = {
  variant_id: string;
  status: "draft" | "published";
};

export function LocaleSwitcher({
  workspaceCode,
  currentVariantId,
  currentLocale,
  enabledLocales,
  variantsByLocale,
}: {
  workspaceCode: string;
  currentVariantId: string;
  currentLocale: string;
  enabledLocales: string[];
  variantsByLocale: Record<string, LocaleVariantStub | undefined>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onPick = (locale: string) => {
    if (locale === currentLocale) {
      setOpen(false);
      return;
    }
    setError(null);
    setOpen(false);
    startTransition(async () => {
      const result = await switchOrCreateVariantForLocale({
        workspaceCode,
        fromVariantId: currentVariantId,
        targetLocale: locale,
      });
      if (result && "ok" in result && result.ok === false) {
        setError(result.error);
      }
      /* Success path triggers a server redirect; the function never returns
       * to this client. */
    });
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-mono uppercase text-zinc-700 hover:border-zinc-400 disabled:opacity-50"
        title="Switch locale. If the target locale has no variant yet, one is created on the fly with this variant's blocks copied as a starting point. You translate or rewrite manually."
      >
        {currentLocale} <span aria-hidden>▾</span>
      </button>
      {open && (
        <ul className="absolute right-0 z-10 mt-1 min-w-[160px] rounded-md border border-zinc-200 bg-white py-1 shadow-md">
          {enabledLocales.map((locale) => {
            const v = variantsByLocale[locale];
            const isCurrent = locale === currentLocale;
            const stateLabel = v
              ? v.status === "published"
                ? "Published"
                : "Draft"
              : "Not started";
            return (
              <li key={locale}>
                <button
                  type="button"
                  onClick={() => onPick(locale)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-zinc-100 ${isCurrent ? "font-semibold" : ""}`}
                  title={
                    v
                      ? `Open the ${locale} variant.`
                      : `Create a ${locale} variant. Slug + blocks copied from the current variant; rewrite the content manually.`
                  }
                >
                  <span className="font-mono uppercase">{locale}</span>
                  <span className="text-[10px] text-zinc-500">{stateLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p className="absolute right-0 top-full mt-1 max-w-[320px] rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700 shadow">
          {error}
        </p>
      )}
    </div>
  );
}
