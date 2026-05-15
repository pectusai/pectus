"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@pectus/supabase";
import { requireUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/project";

const BUCKET = "project-files";

export type FileItem = {
  name: string;
  path: string;
  publicUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string | null;
};

type ListResult =
  | { ok: true; files: FileItem[] }
  | { ok: false; error: string };

export async function listProjectFiles(
  projectCode: string,
): Promise<ListResult> {
  await requireUser();
  const ws = await getProjectByCode(projectCode);
  const service = createServiceClient();

  const { data, error } = await service.storage.from(BUCKET).list(ws.code, {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) return { ok: false, error: error.message };

  const files: FileItem[] = (data ?? [])
    .filter((row) => row.name && !row.name.endsWith("/"))
    .map((row) => {
      const path = `${ws.code}/${row.name}`;
      const { data: pub } = service.storage.from(BUCKET).getPublicUrl(path);
      return {
        name: row.name,
        path,
        publicUrl: pub.publicUrl,
        mimeType: row.metadata?.mimetype ?? null,
        sizeBytes: row.metadata?.size ?? null,
        createdAt: row.created_at ?? null,
      };
    });

  return { ok: true, files };
}

function safeFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : "";
  const stem = (dot >= 0 ? filename.slice(0, dot) : filename)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${stem}-${suffix}${ext}`;
}

type UploadResult =
  | { ok: true; file: FileItem }
  | { ok: false; error: string };

export async function uploadProjectFile(
  projectCode: string,
  formData: FormData,
): Promise<UploadResult> {
  await requireUser();
  const ws = await getProjectByCode(projectCode);
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file in form data." };
  }
  if (file.size === 0) {
    return { ok: false, error: "File is empty." };
  }

  const service = createServiceClient();
  const path = `${ws.code}/${safeFilename(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await service.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: pub } = service.storage.from(BUCKET).getPublicUrl(path);

  revalidatePath(
    `/projects/${projectCode}/apps/content-insights/files`,
  );

  return {
    ok: true,
    file: {
      name: path.split("/").pop() ?? path,
      path,
      publicUrl: pub.publicUrl,
      mimeType: file.type || null,
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
    },
  };
}

type DeleteResult = { ok: true } | { ok: false; error: string };

export async function deleteProjectFile(
  projectCode: string,
  path: string,
): Promise<DeleteResult> {
  await requireUser();
  const ws = await getProjectByCode(projectCode);
  /* Path safety: must be inside this project's prefix. */
  if (!path.startsWith(`${ws.code}/`)) {
    return { ok: false, error: "Refusing to delete outside project scope." };
  }
  const service = createServiceClient();
  const { error } = await service.storage.from(BUCKET).remove([path]);
  if (error) return { ok: false, error: error.message };
  revalidatePath(
    `/projects/${projectCode}/apps/content-insights/files`,
  );
  return { ok: true };
}
