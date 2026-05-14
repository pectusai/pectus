"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { readEnvLocal, writeEnvLocal } from "@/lib/env-file";
import { projectRefFromUrl } from "@/lib/management-api";
import { KNOWN_ENV_KEYS } from "./schema";

type ActionResult = { ok: true } | { ok: false; error: string };

function normalizeSupabaseUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v)) return v;
  const ref = projectRefFromUrl(v);
  if (ref) return `https://${ref}.supabase.co`;
  return v;
}

export async function saveEnvKeys(
  updates: Record<string, string>,
): Promise<ActionResult> {
  await requireUser();
  const allowed = new Set(KNOWN_ENV_KEYS.flatMap((g) => g.keys.map((k) => k.key)));
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (!allowed.has(k)) continue;
    let value = v.trim();
    if (k === "NEXT_PUBLIC_SUPABASE_URL") value = normalizeSupabaseUrl(value);
    filtered[k] = value;
  }
  if (filtered.NEXT_PUBLIC_SUPABASE_URL && !filtered.SUPABASE_PROJECT_REF) {
    const ref = projectRefFromUrl(filtered.NEXT_PUBLIC_SUPABASE_URL);
    if (ref) filtered.SUPABASE_PROJECT_REF = ref;
  }
  if (Object.keys(filtered).length === 0) {
    return { ok: false, error: "No known keys in submission." };
  }
  try {
    writeEnvLocal(filtered);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  revalidatePath("/settings/environment");
  return { ok: true };
}

/* Read process.env for every known Pectus key. Useful when the user's env
 * lives in their shell (or another mechanism) and they want to capture
 * the current values into cms/.env.local in one click. */
export async function snapshotFromProcessEnv(): Promise<ActionResult> {
  await requireUser();
  const fileEnv = readEnvLocal();
  const snapshot: Record<string, string> = {};
  for (const group of KNOWN_ENV_KEYS) {
    for (const k of group.keys) {
      const fromProcess = process.env[k.key];
      if (fromProcess !== undefined && fromProcess !== "" && !fileEnv[k.key]) {
        snapshot[k.key] = fromProcess;
      }
    }
  }
  if (Object.keys(snapshot).length === 0) {
    return {
      ok: false,
      error:
        "Nothing new to snapshot. Either the file is already populated or these env vars are not set in the running process.",
    };
  }
  try {
    writeEnvLocal(snapshot);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  revalidatePath("/settings/environment");
  return { ok: true };
}
