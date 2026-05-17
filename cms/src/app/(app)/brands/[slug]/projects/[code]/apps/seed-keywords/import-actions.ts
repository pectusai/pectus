"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@pectus/supabase";
import { requireAdmin } from "@/lib/auth";
import { getProjectByCode } from "@/lib/project";

export type ImportResult =
  | { ok: true; rowCount: number; skipped: number }
  | { ok: false; error: string };

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function parseCsv(raw: string): string[][] {
  const text = stripBom(raw);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function findColumn(headers: string[], ...candidates: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = normalized.indexOf(c.toLowerCase());
    if (idx !== -1) return idx;
  }
  for (const c of candidates) {
    const idx = normalized.findIndex((h) => h.includes(c.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

const KNOWN_TABS = [
  "questions",
  "prepositions",
  "comparisons",
  "alphabeticals",
  "related",
];

function normalizeTab(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return "questions";
  for (const known of KNOWN_TABS) {
    if (v === known || v.startsWith(known.slice(0, 6))) return known;
  }
  return v;
}

type Row = {
  seed_keyword: string;
  tab: string;
  text: string;
  bucket: string | null;
  locale: string | null;
};

function parseAtpCsv(text: string, fallbackSeed: string): Row[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0];
  const seedIdx = findColumn(
    header,
    "seed",
    "seed_keyword",
    "seed keyword",
    "keyword",
  );
  const tabIdx = findColumn(header, "tab", "category", "type");
  const textIdx = findColumn(
    header,
    "text",
    "question",
    "phrase",
    "term",
    "query",
  );
  const bucketIdx = findColumn(header, "bucket", "subgroup", "group");
  const localeIdx = findColumn(header, "locale", "lang", "language");

  if (textIdx === -1) {
    throw new Error(
      `Could not find a text column in CSV. Expected one of: Text, Question, Phrase, Query. Got: ${header.join(", ")}`,
    );
  }

  const fallback = fallbackSeed.trim();
  const out: Row[] = [];
  for (const r of rows.slice(1)) {
    const text = (r[textIdx] ?? "").trim();
    if (!text) continue;
    const seed = seedIdx === -1
      ? fallback
      : (r[seedIdx] ?? "").trim() || fallback;
    if (!seed) continue;
    const tab = normalizeTab(tabIdx === -1 ? "questions" : r[tabIdx] ?? "");
    out.push({
      seed_keyword: seed,
      tab,
      text,
      bucket: bucketIdx === -1 ? null : (r[bucketIdx] ?? "").trim() || null,
      locale: localeIdx === -1 ? null : (r[localeIdx] ?? "").trim() || null,
    });
  }
  return out;
}

export async function importAtpCsv(
  formData: FormData,
): Promise<ImportResult> {
  const { user } = await requireAdmin();
  const slug = String(formData.get("brand_slug") ?? "").trim();
  const code = String(formData.get("project_code") ?? "").trim();
  const fallbackSeed = String(formData.get("seed_keyword_fallback") ?? "").trim();
  const file = formData.get("csv");
  if (!slug || !code) return { ok: false, error: "Missing brand or project." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No CSV file uploaded." };
  }

  const project = await getProjectByCode(code);
  const supabase = createServiceClient();

  let rows: Row[];
  try {
    const text = await file.text();
    rows = parseAtpCsv(text, fallbackSeed);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  if (rows.length === 0) {
    return {
      ok: false,
      error:
        "CSV had no usable rows. If your export has no seed-keyword column, type one in the fallback field above first.",
    };
  }

  const inserts = rows.map((r) => ({
    project_id: project.id,
    seed_keyword: r.seed_keyword,
    tab: r.tab,
    text: r.text,
    bucket: r.bucket,
    locale: r.locale,
    uploaded_by: user.id,
  }));

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const { error, data } = await supabase
      .from("answer_public_entries")
      .upsert(inserts.slice(i, i + CHUNK), {
        onConflict: "project_id,seed_keyword,tab,text",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      return { ok: false, error: `Insert failed: ${error.message}` };
    }
    inserted += (data ?? []).length;
  }

  revalidatePath(`/brands/${slug}`, "layout");
  return {
    ok: true,
    rowCount: inserted,
    skipped: rows.length - inserted,
  };
}
