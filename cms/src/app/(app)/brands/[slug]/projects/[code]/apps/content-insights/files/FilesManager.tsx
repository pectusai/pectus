"use client";

import { useState, useTransition, useRef } from "react";
import {
  uploadProjectFile,
  deleteProjectFile,
  type FileItem,
} from "./actions";

function formatSize(bytes: number | null): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string | null): boolean {
  return mimeType?.startsWith("image/") === true;
}

export function FilesManager({
  projectCode,
  initialFiles,
}: {
  projectCode: string;
  initialFiles: FileItem[];
}) {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const upload = (fileList: FileList | File[]) => {
    setError(null);
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    startTransition(async () => {
      const uploaded: FileItem[] = [];
      for (const f of arr) {
        const fd = new FormData();
        fd.append("file", f);
        const r = await uploadProjectFile(projectCode, fd);
        if (r.ok) {
          uploaded.push(r.file);
        } else {
          setError(`Could not upload ${f.name}: ${r.error}`);
        }
      }
      if (uploaded.length > 0) {
        setFiles((prev) => [...uploaded, ...prev]);
      }
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) upload(e.dataTransfer.files);
  };

  const onDelete = (file: FileItem) => {
    if (
      !confirm(
        `Delete "${file.name}"? Anything linking to its URL will 404 after this.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await deleteProjectFile(projectCode, file.path);
      if (r.ok) {
        setFiles((prev) => prev.filter((f) => f.path !== file.path));
      } else {
        setError(`Could not delete: ${r.error}`);
      }
    });
  };

  const copyUrl = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Clipboard write failed. Right-click the URL and copy manually.");
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-zinc-900 bg-zinc-50"
            : "border-zinc-300 bg-white hover:border-zinc-400"
        }`}
      >
        <p className="text-sm text-zinc-700">
          Drop files here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-zinc-900 underline hover:text-zinc-700"
          >
            choose from your computer
          </button>
          .
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Logos, hero images, content photos, PDFs. Each file gets a public URL
          you can drop into any page or article. Max 4&nbsp;MB per file.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {pending && (
        <p className="text-sm text-zinc-500">Uploading…</p>
      )}

      {files.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No files yet. Drop an image above to get started.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <li
              key={file.path}
              className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white"
            >
              <div className="flex aspect-video items-center justify-center bg-zinc-50">
                {isImage(file.mimeType) ? (
                  <img
                    src={file.publicUrl}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs uppercase tracking-wide text-zinc-500">
                    {file.mimeType?.split("/")[1] ?? "file"}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div>
                  <p
                    className="truncate text-sm font-medium text-zinc-900"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatSize(file.sizeBytes)}
                    {file.mimeType && (
                      <>
                        <span aria-hidden> · </span>
                        {file.mimeType}
                      </>
                    )}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyUrl(file.publicUrl, file.path)}
                    className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    {copied === file.path ? "Copied!" : "Copy URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(file)}
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                    title="Permanently delete this file."
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
