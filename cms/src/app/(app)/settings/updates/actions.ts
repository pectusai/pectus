"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { listMigrations } from "@/lib/migrations-list";
import { runManagementSql } from "@/lib/management-api";
import { createServiceClient } from "@pectus/supabase";

export type ApplyResult = { ok: boolean; message: string };

export async function applyMigration(formData: FormData): Promise<ApplyResult> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { ok: false, message: "Missing migration id." };
  }
  const migrations = listMigrations();
  const m = migrations.find((x) => x.id === id);
  if (!m) {
    return { ok: false, message: `Migration ${id} not found on disk.` };
  }
  const res = await runManagementSql(m.sql);
  if (!res.ok) {
    return {
      ok: false,
      message: `Management API failed: ${res.error}\n\nIf you'd rather run it by hand, open this migration's SQL below, copy it, and paste it into Supabase's SQL editor.`,
    };
  }

  try {
    const supabase = createServiceClient();
    await supabase
      .from("_pectus_migrations")
      .upsert({ filename: m.filename }, { onConflict: "filename" });
  } catch {
    /* migration's own self-insert handles this; ignore */
  }

  revalidatePath("/settings/updates");
  return { ok: true, message: `Applied ${m.filename}.` };
}

export async function markMigrationApplied(
  formData: FormData,
): Promise<ApplyResult> {
  await requireAdmin();
  const filename = formData.get("filename");
  if (typeof filename !== "string" || !filename) {
    return { ok: false, message: "Missing filename." };
  }
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("_pectus_migrations")
      .upsert({ filename }, { onConflict: "filename" });
    if (error) {
      return {
        ok: false,
        message: `Could not record. ${error.message}. The bookkeeping table may not exist yet — apply 0001_pectus_v04.sql first.`,
      };
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }

  revalidatePath("/settings/updates");
  return { ok: true, message: `Marked ${filename} as applied.` };
}
