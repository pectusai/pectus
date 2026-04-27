import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!cached) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }
    cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cached;
}

export const DEFAULT_MODEL = "claude-opus-4-7";
