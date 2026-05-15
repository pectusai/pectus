/* Re-exports of the shared layout block components.
 *
 * IMPORTANT: This file imports .astro components and is therefore Astro-only.
 * Next/CMS code must import the type from ./types.ts instead.
 *
 * Templates import from here. The PageBlockRenderer dispatches on block.type
 * and instantiates the right component. Adding a new block type requires
 * (1) a new component file in this folder, (2) re-export below, (3) a case
 * in PageBlockRenderer.astro, (4) a discriminated-union member in
 * skills/edit-page/schema.ts, and (5) the same in ./types.ts.
 */

export { default as Hero } from "./Hero.astro";
export { default as Prose } from "./Prose.astro";
export { default as FeatureGrid } from "./FeatureGrid.astro";
export { default as Testimonial } from "./Testimonial.astro";
export { default as Cta } from "./Cta.astro";
export { default as ImageBlock } from "./ImageBlock.astro";
export { default as LinkList } from "./LinkList.astro";
export { default as Faq } from "./Faq.astro";

export type { PageBlock } from "./types";
