"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/app/components/SubmitButton";
import { updateArticleBasics, updateArticleBlocks } from "../actions";
import { RichTextEditor, type Block } from "./RichTextEditor";
import { HeroImageSection } from "./HeroImageSection";
import { ARTICLE_TAGS } from "../tags";
import type { Camera, ExamplePhotoCategory } from "@/lib/brand-types";

type Props = {
  brandSlug: string;
  code: string;
  article: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    tag: string | null;
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
  knownCategories?: string[];
};

export function ArticleEditor({
  brandSlug,
  code,
  article,
  canEdit,
  defaultImageModel,
  cameras = [],
  examplePhotoCategories = [],
  knownCategories = [],
}: Props) {
  const [title, setTitle] = useState<string>(article.title);
  const [description, setDescription] = useState<string>(
    article.description ?? "",
  );
  const [category, setCategory] = useState<string>(article.category ?? "");
  const [tag, setTag] = useState<string>(article.tag ?? "");
  const [author, setAuthor] = useState<string>(article.author ?? "");
  const [authorImage, setAuthorImage] = useState<string>(
    article.author_image ?? "",
  );
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
        className="rounded-xl border border-zinc-200 bg-white p-6"
      >
        <input type="hidden" name="brand_slug" value={brandSlug} />
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="id" value={article.id} />
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight text-zinc-900">
            Headline, meta, category
          </h3>
          {savedFlash === "basics" ? (
            <span className="text-xs text-emerald-700">Saved.</span>
          ) : null}
        </div>

        <fieldset
          disabled={!canEdit}
          className="mt-4 space-y-4 disabled:opacity-70"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-700">
              Title
            </span>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-700">
              Meta description
            </span>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="140 to 160 characters. Shows up in Google search snippets."
              className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
            <span className="mt-1 block text-[11px] text-zinc-500">
              {description.length}/160
            </span>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-700">
                Category
              </span>
              <input
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Recruitment tips"
                list="article-category-options"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
              <datalist id="article-category-options">
                {knownCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <span className="mt-1 block text-[11px] text-zinc-500">
                Free text. Suggestions are categories you&apos;ve used before.
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-700">
                Tag
              </span>
              <select
                name="tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
              >
                {ARTICLE_TAGS.map((t) => (
                  <option key={t || "_none"} value={t}>
                    {t || "— no tag —"}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-zinc-500">
                Edit the list at <code>articles/tags.ts</code>.
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-700">
                Author name
              </span>
              <input
                name="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-700">
                Author image URL{" "}
                <span className="font-normal text-zinc-500">(optional)</span>
              </span>
              <div className="flex items-center gap-2">
                {authorImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={authorImage}
                    alt=""
                    className="h-9 w-9 rounded-full border border-zinc-200 object-cover"
                  />
                ) : null}
                <input
                  name="author_image"
                  value={authorImage}
                  onChange={(e) => setAuthorImage(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
                />
              </div>
            </label>
          </div>

          {canEdit ? (
            <SubmitButton
              pendingLabel="Saving…"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
            >
              Save headline
            </SubmitButton>
          ) : null}
        </fieldset>
      </form>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold tracking-tight text-zinc-900">
            Body
          </h3>
          {savedFlash === "blocks" ? (
            <span className="text-xs text-emerald-700">Saved.</span>
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
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
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
