import { NextResponse } from "next/server";
import { createServiceClient } from "@pectus/supabase";
import { requireAdmin } from "@/lib/auth";
import { listMigrations } from "@/lib/migrations-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getApplied(): Promise<Set<string>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("_pectus_migrations")
    .select("filename");
  if (error) {
    if ((error as { code?: string }).code === "42P01") return new Set();
    throw error;
  }
  return new Set((data ?? []).map((r) => r.filename as string));
}

export async function GET() {
  await requireAdmin();
  try {
    const applied = await getApplied();
    const all = listMigrations();
    const pending = all.filter((m) => !applied.has(m.filename));
    return NextResponse.json({
      pending: pending.map((m) => m.filename),
      bookkeepingMissing: applied.size === 0 && all.length > 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST() {
  await requireAdmin();
  const supabase = createServiceClient();
  const all = listMigrations();
  let applied: Set<string>;
  try {
    applied = await getApplied();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }

  const ranNow: string[] = [];
  for (const m of all) {
    if (applied.has(m.filename)) continue;
    const { error: execError } = await supabase.rpc("exec_pectus_sql", {
      sql: m.sql,
    });
    if (execError) {
      return NextResponse.json(
        {
          error: execError.message,
          failedAt: m.filename,
          appliedThisRun: ranNow,
        },
        { status: 500 },
      );
    }
    const { error: insertError } = await supabase
      .from("_pectus_migrations")
      .insert({ filename: m.filename });
    if (insertError && (insertError as { code?: string }).code !== "23505") {
      return NextResponse.json(
        {
          error: insertError.message,
          failedAt: m.filename,
          appliedThisRun: ranNow,
        },
        { status: 500 },
      );
    }
    ranNow.push(m.filename);
  }
  return NextResponse.json({ applied: ranNow });
}
