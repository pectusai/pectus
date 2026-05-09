"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createInlineImageUploadUrl,
  generateInlineImage,
  type InlineImageResult,
} from "../actions";
import { createClient as createBrowserClient } from "@pectus/supabase/browser";
import { markerToHtml } from "@/lib/inline";
import type { Camera, ExamplePhotoCategory } from "@/lib/brand-types";
import { ExamplePhotoPicker } from "./ExamplePhotoPicker";

export type Block =
  | { type: "h2" | "h3" | "h4" | "p" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "image"; src: string; alt?: string; prompt?: string };

type Props = {
  brandSlug: string;
  code: string;
  articleId: string;
  initialBlocks: Block[];
  editable: boolean;
  onChange: (blocks: Block[]) => void;
  defaultImageModel?: string;
  cameras?: Camera[];
  examplePhotoCategories?: ExamplePhotoCategory[];
};

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blocksToHtml(blocks: Block[]): string {
  if (blocks.length === 0) return "<p></p>";
  return blocks
    .map((b) => {
      if (b.type === "image") {
        const alt = b.alt ? ` alt="${escapeAttr(b.alt)}"` : ' alt=""';
        return `<img src="${escapeAttr(b.src)}"${alt} />`;
      }
      if (b.type === "ul") {
        return `<ul>${b.items.map((it) => `<li>${markerToHtml(it)}</li>`).join("")}</ul>`;
      }
      if (b.type === "ol") {
        return `<ol>${b.items.map((it) => `<li>${markerToHtml(it)}</li>`).join("")}</ol>`;
      }
      if (b.type === "quote") return `<blockquote>${markerToHtml(b.text)}</blockquote>`;
      if (b.type === "h2") return `<h2>${markerToHtml(b.text)}</h2>`;
      if (b.type === "h3") return `<h3>${markerToHtml(b.text)}</h3>`;
      if (b.type === "h4") return `<h4>${markerToHtml(b.text)}</h4>`;
      if (b.type === "p") return `<p>${markerToHtml(b.text)}</p>`;
      return "";
    })
    .join("");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function nodeToMarker(node: any): string {
  let out = "";
  node.descendants((n: any) => {
    if (n.isText) {
      const text = n.text ?? "";
      const marks: string[] = n.marks.map((m: any) => m.type.name);
      let wrapped = text;
      if (marks.includes("bold")) wrapped = `__B__${wrapped}__/B__`;
      if (marks.includes("italic")) wrapped = `__I__${wrapped}__/I__`;
      const linkMark = n.marks.find((m: any) => m.type.name === "link");
      if (linkMark) wrapped = `__L(${linkMark.attrs.href ?? ""})__${wrapped}__/L__`;
      out += wrapped;
    }
  });
  return out.trim();
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function docToBlocks(editor: Editor): Block[] {
  const blocks: Block[] = [];
  editor.state.doc.forEach((node) => {
    if (node.type.name === "image") {
      const src = node.attrs.src as string | undefined;
      const alt = node.attrs.alt as string | undefined;
      if (src) blocks.push({ type: "image", src, alt: alt || undefined });
      return;
    }
    if (node.type.name === "heading") {
      const level = (node.attrs.level as number) || 2;
      const text = nodeToMarker(node);
      if (!text) return;
      const t = level === 3 ? "h3" : level === 4 ? "h4" : "h2";
      blocks.push({ type: t, text });
      return;
    }
    if (node.type.name === "paragraph") {
      const text = nodeToMarker(node);
      if (text) blocks.push({ type: "p", text });
      return;
    }
    if (
      node.type.name === "bulletList" ||
      node.type.name === "orderedList"
    ) {
      const items: string[] = [];
      node.forEach((li) => {
        const t = nodeToMarker(li);
        if (t) items.push(t);
      });
      if (items.length)
        blocks.push({
          type: node.type.name === "bulletList" ? "ul" : "ol",
          items,
        });
      return;
    }
    if (node.type.name === "blockquote") {
      const text = nodeToMarker(node);
      if (text) blocks.push({ type: "quote", text });
      return;
    }
  });
  return blocks;
}

export function RichTextEditor({
  brandSlug,
  code,
  articleId,
  initialBlocks,
  editable,
  onChange,
  defaultImageModel = "imagen-4",
  cameras = [],
  examplePhotoCategories = [],
}: Props) {
  const defaultCameraId =
    cameras.find((c) => c.is_default)?.id ?? cameras[0]?.id ?? "";
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: blocksToHtml(initialBlocks),
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap min-h-[320px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(docToBlocks(editor));
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModel, setAiModel] = useState(defaultImageModel);
  const [aiCameraId, setAiCameraId] = useState(defaultCameraId);
  const [generating, startGenerate] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  const onPickFile = (f: File) => {
    if (!editor) return;
    setUploadError(null);
    if (f.size > 20 * 1024 * 1024) {
      setUploadError("Image must be under 20 MB.");
      return;
    }
    startUpload(async () => {
      const signed = await createInlineImageUploadUrl(
        brandSlug,
        code,
        articleId,
        f.name,
      );
      if (!signed.ok) {
        setUploadError(signed.error);
        return;
      }
      const supabase = createBrowserClient();
      const { error: upErr } = await supabase.storage
        .from("article-images")
        .uploadToSignedUrl(signed.path, signed.token, f, {
          contentType: f.type || "image/jpeg",
          upsert: false,
        });
      if (upErr) {
        setUploadError(`Upload failed: ${upErr.message}`);
        return;
      }
      editor
        .chain()
        .focus()
        .setImage({ src: signed.publicUrl, alt: f.name })
        .createParagraphNear()
        .run();
    });
  };

  const generateAi = () => {
    if (!editor) return;
    const p = aiPrompt.trim();
    if (!p) return;
    setAiError(null);
    const fd = new FormData();
    fd.set("brand_slug", brandSlug);
    fd.set("code", code);
    fd.set("article_id", articleId);
    fd.set("prompt", p);
    fd.set("model", aiModel);
    if (aiCameraId) fd.set("camera_id", aiCameraId);
    startGenerate(async () => {
      const result: InlineImageResult = await generateInlineImage(null, fd);
      if (result.ok) {
        editor
          .chain()
          .focus()
          .setImage({ src: result.src, alt: p.slice(0, 80) })
          .createParagraphNear()
          .run();
      } else {
        setAiError(result.error);
      }
    });
  };

  if (!editor) {
    return (
      <div className="rounded-md border border-zinc-200 p-4 text-sm text-zinc-500">
        Loading editor…
      </div>
    );
  }

  const btn = (active: boolean, disabled = false) =>
    `rounded px-2 py-1 text-xs font-medium transition ${
      disabled
        ? "cursor-not-allowed text-zinc-400"
        : active
          ? "bg-zinc-900 text-white"
          : "text-zinc-700 hover:bg-zinc-100"
    }`;

  return (
    <div className="rounded-md border border-zinc-200 bg-white">
      {editable ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 px-2 py-1.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={btn(editor.isActive("heading", { level: 2 }))}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={btn(editor.isActive("heading", { level: 3 }))}
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={btn(editor.isActive("paragraph"))}
          >
            P
          </button>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={btn(editor.isActive("bold"))}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={btn(editor.isActive("italic"))}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={btn(editor.isActive("strike"))}
          >
            <s>S</s>
          </button>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={btn(editor.isActive("bulletList"))}
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={btn(editor.isActive("orderedList"))}
          >
            1. List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={btn(editor.isActive("blockquote"))}
          >
            Quote
          </button>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={btn(false, uploading)}
          >
            {uploading ? "Uploading…" : "Upload image"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAiPanel((v) => !v);
              setAiError(null);
            }}
            className={btn(showAiPanel)}
          >
            AI image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
              e.target.value = "";
            }}
          />
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            className={btn(false, !editor.can().undo())}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            className={btn(false, !editor.can().redo())}
          >
            Redo
          </button>
        </div>
      ) : null}

      {editable && uploadError ? (
        <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {uploadError}
        </div>
      ) : null}

      {editable && showAiPanel ? (
        <div className="space-y-3 border-b border-zinc-200 bg-zinc-50 px-3 py-3">
          {examplePhotoCategories.length > 0 ? (
            <ExamplePhotoPicker
              categories={examplePhotoCategories}
              onUseAsPrompt={(text) => setAiPrompt(text)}
              compact
            />
          ) : null}
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-zinc-600">
              What should the image show?
            </span>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              placeholder="Write what the image should show, or pick a brand photo above and tweak the description."
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {cameras.length > 0 ? (
              <select
                value={aiCameraId}
                onChange={(e) => setAiCameraId(e.target.value)}
                aria-label="Camera"
                className="h-[30px] rounded-md border border-zinc-300 bg-white px-2 text-xs"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.is_default ? " (default)" : ""}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              aria-label="Image model"
              className="h-[30px] rounded-md border border-zinc-300 bg-white px-2 text-xs"
            >
              <option value="imagen-4">Imagen 4</option>
              <option value="imagen-4-fast">Imagen 4 Fast</option>
              <option value="imagen-4-ultra">Imagen 4 Ultra</option>
              <option value="gemini-3-pro-image-preview">Gemini 3 Pro</option>
            </select>
            <button
              type="button"
              onClick={generateAi}
              disabled={generating || !aiPrompt.trim()}
              className="h-[30px] rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {generating ? "Generating (~20s)…" : "Generate and insert"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAiPanel(false);
                setAiError(null);
              }}
              className="h-[30px] rounded-md border border-zinc-300 bg-white px-3 text-xs hover:bg-zinc-50"
            >
              Cancel
            </button>
            {aiError ? (
              <span className="text-xs text-red-600">{aiError}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
}
