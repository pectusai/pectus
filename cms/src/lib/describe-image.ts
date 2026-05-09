// Vision describe via gemini-3-flash-preview. Used to seed an empty
// description on a brand example photo. Output is plain text.

import { getBrandImageGenKey } from "@/lib/image-generation";

const DESCRIBE_INSTRUCTION = `Describe this photograph in 3 to 5 sentences as a base prompt for an AI image generator.

Cover, in this order:
- Subject (who or what is in the frame and what they are doing)
- Setting (where the photo was taken, what's around them)
- Light (window light, golden hour, overcast, etc.)
- Mood (candid, contemplative, energetic, etc.)

Do NOT mention: camera bodies, lenses, film stock, ISO, shutter speed, aperture,
filters, or any technical photography settings. Those live in a separate field.
Do NOT mention: the brand, the company, marketing context, or what the image is "for".
Do NOT prefix with "This image shows" or "The photograph depicts" — write directly.`;

const MODEL = "gemini-3-flash-preview";

export class DescribeMissingKeyError extends Error {
  constructor() {
    super(
      "No Google AI API key set for this brand. Add one on the brand profile page.",
    );
    this.name = "DescribeMissingKeyError";
  }
}

export async function describeImageFromUrl(
  brandId: string,
  imageUrl: string,
): Promise<string> {
  const apiKey = await getBrandImageGenKey(brandId);
  if (!apiKey) throw new DescribeMissingKeyError();

  const imgRes = await fetch(imageUrl, { cache: "no-store" });
  if (!imgRes.ok) {
    throw new Error(`Could not fetch ${imageUrl} (${imgRes.status}).`);
  }
  const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
  const dataBase64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: DESCRIBE_INSTRUCTION },
          { inlineData: { mimeType, data: dataBase64 } },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Gemini Flash describe failed (${res.status}): ${text.slice(0, 400)}`,
    );
  }
  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini Flash returned no text.");
  return text;
}
