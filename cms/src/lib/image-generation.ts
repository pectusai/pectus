// Image-generation router for Pectus. All image surfaces call generateImage()
// and get back {mimeType, dataBase64}.
//
// Providers:
//   google     — Imagen 4 family + Gemini 3 Pro Image (multimodal refs)
//   fal        — Flux Pro 1.1 Ultra (best photorealism on text-only prompts)
//   replicate  — Flux Dev + Recraft v3
//
// Per-brand API keys live in the integrations table:
//   provider='google_genai'  → { api_key }
//   provider='fal'           → { api_key }
//   provider='replicate'     → { api_key }
//
// Reference photos (multimodal) are only consumed by gemini-3-pro-image-preview.
// Other models silently ignore references.

import { createServiceClient } from "@pectus/supabase";

export type ImageResult = {
  mimeType: string;
  dataBase64: string;
};
export type ImageRef = {
  mimeType: string;
  dataBase64: string;
};
export type ImageProvider = "google" | "fal" | "replicate";

export type ImageModelChoice = {
  id: string;
  label: string;
  provider: ImageProvider;
  hint: string;
};

export const IMAGE_MODELS: ImageModelChoice[] = [
  {
    id: "imagen-4",
    label: "Imagen 4",
    provider: "google",
    hint: "Photorealistic. Follows photography direction literally. ~$0.04/img.",
  },
  {
    id: "imagen-4-ultra",
    label: "Imagen 4 Ultra",
    provider: "google",
    hint: "Highest-fidelity Imagen. Slower, pricier. ~$0.06/img.",
  },
  {
    id: "imagen-4-fast",
    label: "Imagen 4 Fast",
    provider: "google",
    hint: "Cheapest + quickest Imagen. Good for drafts. ~$0.02/img.",
  },
  {
    id: "gemini-3-pro-image-preview",
    label: "Gemini 3 Pro",
    provider: "google",
    hint: "Accepts brand reference photos as multimodal inputs.",
  },
  {
    id: "flux-pro-1.1-ultra",
    label: "Flux Pro 1.1 Ultra",
    provider: "fal",
    hint: "Strongest at detailed camera/lens prompts. Photoreal at scale. ~$0.06/img.",
  },
  {
    id: "flux-dev",
    label: "Flux Dev",
    provider: "replicate",
    hint: "Cheaper Flux for quick photo-real iteration. ~$0.03/img.",
  },
  {
    id: "recraft-v3",
    label: "Recraft v3",
    provider: "replicate",
    hint: "Best for stylised illustrations and editorial graphics.",
  },
];

export const DEFAULT_IMAGE_MODEL = "imagen-4";

export function providerFor(modelId: string): ImageProvider {
  const m = IMAGE_MODELS.find((x) => x.id === modelId);
  return m?.provider ?? "google";
}

const PROVIDER_TO_INTEGRATION: Record<ImageProvider, string> = {
  google: "google_genai",
  fal: "fal",
  replicate: "replicate",
};

export class MissingImageGenKeyError extends Error {
  provider: ImageProvider;
  constructor(provider: ImageProvider = "google") {
    super(`No ${provider} API key configured for this brand.`);
    this.name = "MissingImageGenKeyError";
    this.provider = provider;
  }
}

async function getBrandKey(
  brandId: string,
  provider: ImageProvider,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("integrations")
    .select("service_account_json")
    .eq("brand_id", brandId)
    .eq("provider", PROVIDER_TO_INTEGRATION[provider])
    .maybeSingle();
  const stored = (data?.service_account_json ?? null) as
    | { api_key?: string }
    | null;
  const key = stored?.api_key?.trim();
  return key ? key : null;
}

async function setBrandKey(
  brandId: string,
  provider: ImageProvider,
  apiKey: string,
  updatedBy: string | null,
): Promise<void> {
  const supabase = createServiceClient();
  const integrationProvider = PROVIDER_TO_INTEGRATION[provider];
  const trimmed = apiKey.trim();
  if (!trimmed) {
    await supabase
      .from("integrations")
      .delete()
      .eq("brand_id", brandId)
      .eq("provider", integrationProvider);
    return;
  }
  await supabase.from("integrations").upsert(
    {
      brand_id: brandId,
      provider: integrationProvider,
      scope: "brand",
      service_account_json: { api_key: trimmed },
      updated_by: updatedBy,
    },
    { onConflict: "brand_id,provider" },
  );
}

export async function getBrandImageGenKey(
  brandId: string,
): Promise<string | null> {
  return getBrandKey(brandId, "google");
}

export async function setBrandImageGenKey(
  brandId: string,
  apiKey: string,
  updatedBy: string | null,
): Promise<void> {
  return setBrandKey(brandId, "google", apiKey, updatedBy);
}

export async function getBrandKeyForProvider(
  brandId: string,
  provider: ImageProvider,
): Promise<string | null> {
  return getBrandKey(brandId, provider);
}

export async function setBrandKeyForProvider(
  brandId: string,
  provider: ImageProvider,
  apiKey: string,
  updatedBy: string | null,
): Promise<void> {
  return setBrandKey(brandId, provider, apiKey, updatedBy);
}

export async function listConfiguredProviders(
  brandId: string,
): Promise<ImageProvider[]> {
  const out: ImageProvider[] = [];
  for (const provider of ["google", "fal", "replicate"] as const) {
    const k = await getBrandKey(brandId, provider);
    if (k) out.push(provider);
  }
  return out;
}

export async function generateImage(
  prompt: string,
  options: {
    model?: string;
    references?: ImageRef[];
    apiKey: string;
    provider?: ImageProvider;
  },
): Promise<ImageResult> {
  const model = options.model ?? DEFAULT_IMAGE_MODEL;
  const references = options.references ?? [];
  const apiKey = options.apiKey;
  const provider = options.provider ?? providerFor(model);
  if (!apiKey) throw new MissingImageGenKeyError(provider);

  if (provider === "google") {
    if (model === "gemini-3-pro-image-preview") {
      return generateGeminiImage(prompt, model, references, apiKey);
    }
    return generateImagenImage(prompt, model, apiKey);
  }
  if (provider === "fal") {
    return generateFalImage(prompt, model, apiKey);
  }
  if (provider === "replicate") {
    return generateReplicateImage(prompt, model, apiKey);
  }
  throw new Error(`Unknown provider for model: ${model}`);
}

// ── Imagen via Google's :predict endpoint ──────────────────────────────────
async function generateImagenImage(
  prompt: string,
  model: string,
  apiKey: string,
): Promise<ImageResult> {
  const googleModel =
    model === "imagen-4-fast"
      ? "imagen-4.0-fast-generate-001"
      : model === "imagen-4-ultra"
        ? "imagen-4.0-ultra-generate-001"
        : "imagen-4.0-generate-001";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:predict?key=${apiKey}`;
  const body = {
    instances: [{ prompt }],
    parameters: { sampleCount: 1, aspectRatio: "16:9" },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Imagen request failed (${res.status}): ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
  };
  const first = json.predictions?.[0];
  if (!first?.bytesBase64Encoded) {
    throw new Error("Imagen returned no image data.");
  }
  return {
    mimeType: first.mimeType ?? "image/png",
    dataBase64: first.bytesBase64Encoded,
  };
}

// ── Gemini 3 Pro via :generateContent endpoint ─────────────────────────────
async function generateGeminiImage(
  prompt: string,
  model: string,
  references: ImageRef[],
  apiKey: string,
): Promise<ImageResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [{ text: prompt }];
  for (const ref of references) {
    parts.push({
      inlineData: { mimeType: ref.mimeType, data: ref.dataBase64 },
    });
  }
  const body = { contents: [{ role: "user", parts }] };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Gemini image request failed (${res.status}): ${text.slice(0, 400)}`,
    );
  }
  const json = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data: string };
          inline_data?: { mime_type?: string; mimeType?: string; data: string };
        }>;
      };
    }>;
  };
  const respParts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of respParts) {
    const inline =
      (part.inlineData as { mimeType?: string; data?: string } | undefined) ??
      (part.inline_data as
        | { mime_type?: string; mimeType?: string; data?: string }
        | undefined);
    if (inline?.data) {
      const mimeType =
        (inline as { mimeType?: string }).mimeType ??
        (inline as { mime_type?: string }).mime_type ??
        "image/png";
      return { mimeType, dataBase64: inline.data };
    }
  }
  throw new Error("Gemini returned no inline image data.");
}

// ── fal.ai (Flux Pro 1.1 Ultra) ─────────────────────────────────────────────
async function generateFalImage(
  prompt: string,
  model: string,
  apiKey: string,
): Promise<ImageResult> {
  const endpoint =
    model === "flux-pro-1.1-ultra"
      ? "https://fal.run/fal-ai/flux-pro/v1.1-ultra"
      : "https://fal.run/fal-ai/flux-pro/v1.1-ultra";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "16:9",
      num_images: 1,
      output_format: "jpeg",
      enable_safety_checker: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fal.ai request failed (${res.status}): ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    images?: Array<{ url?: string; content_type?: string }>;
  };
  const url = json.images?.[0]?.url;
  if (!url) throw new Error("fal.ai returned no image URL.");
  const imgRes = await fetch(url);
  if (!imgRes.ok) {
    throw new Error(
      `Could not fetch generated fal image (${imgRes.status}).`,
    );
  }
  const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
  const dataBase64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
  return { mimeType, dataBase64 };
}

// ── Replicate (flux-dev, recraft-v3) ────────────────────────────────────────
async function generateReplicateImage(
  prompt: string,
  model: string,
  apiKey: string,
): Promise<ImageResult> {
  const replicateModel =
    model === "flux-dev"
      ? "black-forest-labs/flux-dev"
      : model === "recraft-v3"
        ? "recraft-ai/recraft-v3"
        : null;
  if (!replicateModel) {
    throw new Error(`Unknown Replicate model: ${model}`);
  }

  const input: Record<string, unknown> =
    model === "recraft-v3"
      ? {
          prompt,
          size: "1820x1024",
          style: "realistic_image",
        }
      : {
          prompt,
          aspect_ratio: "16:9",
          output_format: "jpg",
          output_quality: 90,
        };

  const startRes = await fetch(
    `https://api.replicate.com/v1/models/${replicateModel}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({ input }),
    },
  );
  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(
      `Replicate request failed (${startRes.status}): ${text.slice(0, 400)}`,
    );
  }
  let prediction = (await startRes.json()) as {
    id: string;
    status: string;
    output: string | string[] | null;
    error: string | null;
    urls: { get: string };
  };

  const deadline = Date.now() + 90_000;
  while (
    (prediction.status === "starting" ||
      prediction.status === "processing") &&
    Date.now() < deadline
  ) {
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await fetch(prediction.urls.get, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!pollRes.ok) {
      const text = await pollRes.text();
      throw new Error(
        `Replicate poll failed (${pollRes.status}): ${text.slice(0, 400)}`,
      );
    }
    prediction = (await pollRes.json()) as typeof prediction;
  }
  if (prediction.status !== "succeeded") {
    throw new Error(
      `Replicate prediction ${prediction.status}: ${prediction.error ?? "no detail"}`,
    );
  }
  const out = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;
  if (!out) throw new Error("Replicate returned no image URL.");
  const imgRes = await fetch(out);
  if (!imgRes.ok) {
    throw new Error(
      `Could not fetch generated Replicate image (${imgRes.status}).`,
    );
  }
  const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
  const dataBase64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
  return { mimeType, dataBase64 };
}
