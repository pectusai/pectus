"use server";

import { requireUser } from "@/lib/auth";
import { listMigrations } from "@/lib/migrations-list";
import { runManagementSql } from "@/lib/management-api";

export type ApplyResult = { ok: boolean; message: string };

export async function applyMigration(formData: FormData): Promise<ApplyResult> {
  await requireUser();
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
    return { ok: false, message: res.error };
  }
  return { ok: true, message: `Applied ${m.filename} successfully. Refresh the page if anything still looks wrong.` };
}
