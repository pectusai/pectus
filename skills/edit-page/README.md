# edit-page

Apply a user instruction to a page's block array. Returns the new full block array plus a one-line summary for the chat history.

```ts
runSkill({
  skill: "edit-page",
  workspaceId,
  args: {
    instruction: "Make the hero CTA say Get Started",
    current_blocks: page.blocks,
    page: { title, purpose, template, locale },
    chat_history: [...],
  },
});
```

The output is one of the discriminated union members in `schema.ts`. Block types are closed: hero, prose, feature_grid, testimonial, cta, image, link_list, faq. The skill cannot invent new types — the brand-aware shared block library at `apps/content-hub/src/components/blocks/` is the only place blocks get rendered, so anything not in that registry would render as nothing.
