"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { listMigrations } from "@/lib/migrations-list";
import { runManagementSql } from "@/lib/management-api";
import { runPendingMigrations } from "@/lib/migrations-apply";
import { createServiceClient } from "@pectus/supabase";

export type ApplyResult = { ok: boolean; message: string };
export type ApplyAllResult = {
  ok: boolean;
  message: string;
  succeeded: string[];
  failed: { filename: string; error: string }[];
};

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
  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
  return { ok: true, message: `Marked ${filename} as applied.` };
}

export async function applyAllPending(): Promise<ApplyAllResult> {
  await requireAdmin();
  const report = await runPendingMigrations();
  revalidatePath("/settings/updates");
  revalidatePath("/", "layout");
  if (report.attempted === 0 && report.remaining.length === 0) {
    return {
      ok: true,
      message: "Already up to date.",
      succeeded: [],
      failed: [],
    };
  }
  if (report.attempted === 0 && report.remaining.length > 0) {
    return {
      ok: false,
      message:
        "Couldn't auto-apply: SUPABASE_ACCESS_TOKEN is missing in cms/.env.local. Generate one at https://supabase.com/dashboard/account/tokens, then restart `npm run dev`. Or paste each migration manually below.",
      succeeded: [],
      failed: report.remaining.map((filename) => ({
        filename,
        error: "Skipped — no Management API token.",
      })),
    };
  }
  const failed = report.failed.map((f) => ({
    filename: f.filename,
    error: f.error,
  }));
  if (failed.length === 0) {
    return {
      ok: true,
      message: `Applied ${report.succeeded.length} migration${report.succeeded.length === 1 ? "" : "s"}.`,
      succeeded: report.succeeded,
      failed: [],
    };
  }
  return {
    ok: false,
    message: `Applied ${report.succeeded.length}, then ${failed[0].filename} failed. Paste it manually below or fix the cause and retry.`,
    succeeded: report.succeeded,
    failed,
  };
}
