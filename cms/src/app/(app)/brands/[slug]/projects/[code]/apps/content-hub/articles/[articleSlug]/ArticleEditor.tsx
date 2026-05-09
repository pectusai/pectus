"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { updateArticleBasics, updateArticleBlocks } from "../actions";
import { RichTextEditor, type Block } from "./RichTextEditor";
import { HeroImageSection } from "./HeroImageSection";
import type { Camera, ExamplePhotoCategory } from "@/lib/brand-types";

type Props = {
  brandSlug: string;
  code: string;
  article: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    hero_image: string | null;
    author: string | null;
    author_image: string | null;
    status: string | null;
    blocks: Block[];
  };
  canEdit: boolean;
  defaultImageModel?: string;
  cameras?: Camera[];
  examplePhotoCategories?: ExamplePhotoCategory[];
};

export function ArticleEditor({
  brandSlug,
  code,
  article,
  canEdit,
  defaultImageModel,
  cameras = [],
  examplePhotoCategories = [],
}: Props) {
  const [title, setTitle] = useState<string>(article.title);
  const [description, setDescription] = useState<string>(
    article.description ?? "",
  );
  const [category, setCategory] = useState<string>(article.category ?? "");
  const [author, setAuthor] = useState<string>(article.author ?? "");
  const [blocks, setBlocks] = useState<Block[]>(
    article.blocks.length > 0
      ? article.blocks
      : [{ type: "h2", text: "" }, { type: "p", text: "" }],
  );
  const [saveBlocksPending, startSaveBlocks] = useTransition();
  const [savedFlash, setSavedFlash] = useState<null | "basics" | "blocks">(null);

  const saveBlocks = async () => {
    const formData = new FormData();
    formData.set("brand_slug", brandSlug);
    formData.set("code", code);
    formData.set("id", article.id);
    formData.set("blocks", JSON.stringify(blocks));
    startSaveBlocks(async () => {
      await updateArticleBlocks(formData);
      setSavedFlash("blocks");
      setTimeout(() => setSavedFlash(null), 2500);
    });
  };

  const saveBasics = async (formData: FormData) => {
    await updateArticleBasics(formData);
    setSavedFlash("basics");
    setTimeout(() => setSavedFlash(null), 2500);
  };

  return (
    <div className="space-y-8">
      <HeroImageSection
        brandSlug={brandSlug}
        code={code}
        articleId={article.id}
        title={article.title}
        initialHero={article.hero_image}
        canEdit={canEdit}
        defaultModel={defaultImageModel ?? "imagen-4"}
        cameras={cameras}
        examplePhotoCategories={examplePhotoCategories}
      />

      <form
        action={saveBasics}
        className="rounded-lg border border-zinc-200 bg-white p-5"
      >
        <input type="hidden" name="brand_slug" value={brandSlug} />
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="id" value={article.id} />
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">Headline, meta, category</h3>
          {savedFlash === "basics" ? (
            <span className="text-xs text-emerald-600">Saved.</span>
          ) : null}
        </div>

        <fieldset disabled={!canEdit} className="mt-4 space-y-4 disabled:opacity-70">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-600">
              Title
            </span>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-600">
              Meta description
            </span>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-600">
              Category
            </span>
            <input
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Articles, Glossary, Comparisons"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[11px] text-zinc-500">
              Free-form. Used in the public site as a label and in the URL when
              you wire up routing.
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-zinc-600">
              Author
            </span>
            <input
              name="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
            <input type="hidden" name="author_image" value={article.author_image ?? ""} />
          </label>
          {canEdit ? (
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Save headline
            </SubmitButton>
          ) : null}
        </fieldset>
      </form>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">Body</h3>
          {savedFlash === "blocks" ? (
            <span className="text-xs text-emerald-600">Saved.</span>
          ) : null}
        </div>

        <div className="mt-4">
          <RichTextEditor
            brandSlug={brandSlug}
            code={code}
            articleId={article.id}
            initialBlocks={blocks}
            editable={canEdit}
            defaultImageModel={defaultImageModel ?? "imagen-4"}
            cameras={cameras}
            examplePhotoCategories={examplePhotoCategories}
            onChange={setBlocks}
          />
        </div>

        {canEdit ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveBlocks}
              disabled={saveBlocksPending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {saveBlocksPending ? "Saving…" : "Save body"}
            </button>
            <span className="text-xs text-zinc-500">
              {blocks.reduce(
                (s, b) =>
                  b.type === "p"
                    ? s + b.text.split(/\s+/).filter(Boolean).length
                    : s,
                0,
              )}{" "}
              words · {blocks.length} blocks
            </span>
          </div>
        ) : null}
      </section>

    </div>
  );
}
