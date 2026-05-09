// Image-generation router for Pectus. All image surfaces (article hero, inline,
// future) call generateImage() and get back {mimeType, dataBase64}.
//
// v1: Google only (Imagen 4 family + Gemini 3 Pro Image). Both auth via the
// same Google AI API key, stored per-brand in the integrations table under
// provider='google_genai' (column service_account_json -> {api_key: "..."}).
// fal.ai / Replicate models are not wired in v1.
//
// References (brand reference photos) only apply to gemini-3-pro-image-preview.
// Imagen ignores them silently.

import { createServiceClient } from "@pectus/supabase";

export type ImageResult = {
  mimeType: string;
  dataBase64: string;
};
export type ImageRef = {
  mimeType: string;
  dataBase64: string;
};
export type ImageProvider = "google";

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
    hint: "Photorealistic. Follows the photography direction literally. ~$0.04/image.",
  },
  {
    id: "imagen-4-ultra",
    label: "Imagen 4 Ultra",
    provider: "google",
    hint: "Highest-fidelity Imagen. Slower and pricier. ~$0.06/image.",
  },
  {
    id: "imagen-4-fast",
    label: "Imagen 4 Fast",
    provider: "google",
    hint: "Cheapest + quickest Imagen. Good for drafts. ~$0.02/image.",
  },
  {
    id: "gemini-3-pro-image-preview",
    label: "Gemini 3 Pro",
    provider: "google",
    hint: "Accepts brand reference photos as multimodal inputs.",
  },
];

export const DEFAULT_IMAGE_MODEL = "imagen-4";

export function providerFor(_modelId: string): ImageProvider {
  return "google";
}

export class MissingImageGenKeyError extends Error {
  constructor() {
    super("No Google AI API key configured for this brand.");
    this.name = "MissingImageGenKeyError";
  }
}

export async function getBrandImageGenKey(
  brandId: string,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("integrations")
    .select("service_account_json")
    .eq("brand_id", brandId)
    .eq("provider", "google_genai")
    .maybeSingle();

  const stored = (data?.service_account_json ?? null) as
    | { api_key?: string }
    | null;
  const key = stored?.api_key?.trim();
  return key ? key : null;
}

export async function setBrandImageGenKey(
  brandId: string,
  apiKey: string,
  updatedBy: string | null,
): Promise<void> {
  const supabase = createServiceClient();
  const trimmed = apiKey.trim();
  if (!trimmed) {
    await supabase
      .from("integrations")
      .delete()
      .eq("brand_id", brandId)
      .eq("provider", "google_genai");
    return;
  }
  await supabase
    .from("integrations")
    .upsert(
      {
        brand_id: brandId,
        provider: "google_genai",
        scope: "brand",
        service_account_json: { api_key: trimmed },
        updated_by: updatedBy,
      },
      { onConflict: "brand_id,provider" },
    );
}

export async function generateImage(
  prompt: string,
  options: { model?: string; references?: ImageRef[]; apiKey: string },
): Promise<ImageResult> {
  const model = options.model ?? DEFAULT_IMAGE_MODEL;
  const references = options.references ?? [];
  const apiKey = options.apiKey;
  if (!apiKey) throw new MissingImageGenKeyError();

  if (model === "gemini-3-pro-image-preview") {
    return generateGeminiImage(prompt, model, references, apiKey);
  }
  if (model.startsWith("imagen-")) {
    return generateImagenImage(prompt, model, apiKey);
  }
  throw new Error(`Unknown image model: ${model}`);
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
    parameters: {
      sampleCount: 1,
      aspectRatio: "16:9",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Imagen request failed (${res.status}): ${text.slice(0, 400)}`,
    );
  }

  const json = (await res.json()) as {
    predictions?: Array<{
      bytesBase64Encoded?: string;
      mimeType?: string;
    }>;
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
