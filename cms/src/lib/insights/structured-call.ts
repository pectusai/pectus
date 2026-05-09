import type { ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getClaude } from "@pectus/anthropic";

type Block = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };

export type StructuredCallOptions<T> = {
  model: string;
  maxTokens: number;
  systemBlocks: Block[];
  userText: string;
  schema: ZodSchema<T>;
  toolName?: string;
  toolDescription?: string;
};

export type StructuredCallResult<T> = {
  data: T;
  rawJson: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  durationMs: number;
};

function flattenJsonSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const definitions = schema.definitions as
    | Record<string, unknown>
    | undefined;
  const ref = schema.$ref as string | undefined;
  if (!definitions || !ref) return schema;
  const refKey = ref.replace("#/definitions/", "");
  const target = definitions[refKey];
  if (!target || typeof target !== "object") return schema;
  return target as Record<string, unknown>;
}

export async function structuredCall<T>(
  opts: StructuredCallOptions<T>,
): Promise<StructuredCallResult<T>> {
  const claude = getClaude();
  const startedAt = Date.now();
  const toolName = opts.toolName ?? "emit";
  const toolDescription =
    opts.toolDescription ?? "Emit the structured result.";

  const jsonSchema = zodToJsonSchema(opts.schema, {
    target: "openApi3",
  }) as Record<string, unknown>;
  const flattened = flattenJsonSchema(jsonSchema);

  const response = await claude.beta.promptCaching.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: opts.systemBlocks,
    messages: [{ role: "user", content: opts.userText }],
    tools: [
      {
        name: toolName,
        description: toolDescription,
        input_schema: flattened as { type: "object" } & Record<string, unknown>,
      },
    ],
    tool_choice: { type: "tool", name: toolName },
  });

  const toolUse = response.content.find(
    (c): c is Extract<typeof c, { type: "tool_use" }> => c.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Claude did not return a tool_use block.");
  }
  const parsed = opts.schema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(
      `Output failed schema validation: ${parsed.error.message}`,
    );
  }

  return {
    data: parsed.data,
    rawJson: JSON.stringify(toolUse.input),
    usage: response.usage as StructuredCallResult<T>["usage"],
    durationMs: Date.now() - startedAt,
  };
}
