"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import {
  saveImageGenApiKey,
  saveProviderApiKey,
  type SaveApiKeyResult,
} from "./image-gen-actions";

type ProviderConfig = {
  provider: "google" | "fal" | "replicate";
  title: string;
  shortLabel: string;
  keyPrefixHint: string;
  helpHref: string;
  helpLabel: string;
  helpAfter: string;
  primary?: boolean;
};

const PROVIDERS: ProviderConfig[] = [
  {
    provider: "google",
    title: "Google AI",
    shortLabel: "Google",
    keyPrefixHint: "AIza…",
    helpHref: "https://aistudio.google.com/apikey",
    helpLabel: "aistudio.google.com/apikey",
    helpAfter: "Powers Imagen 4, Gemini 3 Pro Image, and Gemini Flash describe.",
    primary: true,
  },
  {
    provider: "fal",
    title: "fal.ai",
    shortLabel: "fal.ai",
    keyPrefixHint: "fal-…",
    helpHref: "https://fal.ai/dashboard/keys",
    helpLabel: "fal.ai/dashboard/keys",
    helpAfter: "Powers Flux Pro 1.1 Ultra — best for detailed camera-direction prompts.",
  },
  {
    provider: "replicate",
    title: "Replicate",
    shortLabel: "Replicate",
    keyPrefixHint: "r8_…",
    helpHref: "https://replicate.com/account/api-tokens",
    helpLabel: "replicate.com/account/api-tokens",
    helpAfter: "Powers Flux Dev (cheap iteration) and Recraft v3 (illustration).",
  },
];

export function ApiKeysPanel({
  brandSlug,
  apiKeyMasked,
  falKeyMasked,
  replicateKeyMasked,
}: {
  brandSlug: string;
  apiKeyMasked: string | null;
  falKeyMasked: string | null;
  replicateKeyMasked: string | null;
}) {
  const masks: Record<"google" | "fal" | "replicate", string | null> = {
    google: apiKeyMasked,
    fal: falKeyMasked,
    replicate: replicateKeyMasked,
  };
  const allSet =
    Boolean(apiKeyMasked) &&
    Boolean(falKeyMasked) &&
    Boolean(replicateKeyMasked);
  const googleMissing = !apiKeyMasked;

  const [open, setOpen] = useState(!allSet);

  const setCount = [apiKeyMasked, falKeyMasked, replicateKeyMasked].filter(
    Boolean,
  ).length;

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">
            Image generation power-ups
          </span>
          <span className="text-[11px] text-zinc-500">
            {setCount}/3 connected
          </span>
          {PROVIDERS.map((p) => {
            const isSet = !!masks[p.provider];
            return (
              <span
                key={p.provider}
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isSet
                    ? "bg-emerald-100 text-emerald-800"
                    : p.primary
                      ? "bg-amber-100 text-amber-900"
                      : "bg-zinc-100 text-zinc-500"
                }`}
                title={
                  isSet
                    ? `${p.title} key set`
                    : p.primary
                      ? `${p.title} required for image generation and describe`
                      : `${p.title} optional`
                }
              >
                {isSet ? `${p.shortLabel} ✓` : p.shortLabel}
              </span>
            );
          })}
        </span>
        <span aria-hidden className="text-xs text-zinc-500">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {!open && googleMissing ? (
        <p className="mt-2 text-[12px] text-amber-900">
          Google AI key is missing — image generation, hero rendering, and
          Gemini Flash describe will all error until you add one. Click to
          expand.
        </p>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-3">
          {PROVIDERS.map((p) => (
            <ApiKeyForm
              key={p.provider}
              brandSlug={brandSlug}
              apiKeyMasked={masks[p.provider]}
              config={p}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ApiKeyForm({
  brandSlug,
  apiKeyMasked,
  config,
}: {
  brandSlug: string;
  apiKeyMasked: string | null;
  config: ProviderConfig;
}) {
  const action =
    config.provider === "google" ? saveImageGenApiKey : saveProviderApiKey;
  const [state, formAction] = useActionState<SaveApiKeyResult | null, FormData>(
    action,
    null,
  );
  const [showKey, setShowKey] = useState(false);

  return (
    <form action={formAction} className="rounded-md border border-zinc-200 bg-white p-3">
      <input type="hidden" name="brand_slug" value={brandSlug} />
      <input type="hidden" name="provider" value={config.provider} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-zinc-900">
          {config.title} API key
        </h4>
        {state?.ok ? (
          <span className="text-[11px] text-emerald-700">Saved.</span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">
        Get one at{" "}
        <a
          href={config.helpHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {config.helpLabel}
        </a>
        . {config.helpAfter}
      </p>

      <div className="mt-3 space-y-2">
        {apiKeyMasked ? (
          <p className="text-[11px] text-zinc-600">
            Saved key:{" "}
            <code className="rounded bg-zinc-100 px-1">{apiKeyMasked}</code>
          </p>
        ) : (
          <p className="text-[11px] text-amber-700">No key saved.</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            name="api_key"
            type={showKey ? "text" : "password"}
            autoComplete="off"
            placeholder={apiKeyMasked ? "Paste a new key to replace" : config.keyPrefixHint}
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-mono text-[13px]"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-[11px] hover:bg-zinc-50"
          >
            {showKey ? "Hide" : "Show"}
          </button>
          <SubmitButton
            pendingLabel="Saving…"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-black"
          >
            Save
          </SubmitButton>
          {apiKeyMasked ? (
            <button
              type="submit"
              name="api_key"
              value=""
              className="text-[11px] text-red-600 hover:underline"
            >
              Remove
            </button>
          ) : null}
        </div>
        {state && !state.ok ? (
          <p className="text-[11px] text-red-700">{state.error}</p>
        ) : null}
      </div>
    </form>
  );
}
