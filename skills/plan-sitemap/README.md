# plan-sitemap

Turn one topic into a pillar subtree, or all topics into a full site plan.

Two modes invoked via `args`:

```ts
runSkill({ skill: "plan-sitemap", projectId, args: { mode: "one-pillar", topic_id, topic_name } })
runSkill({ skill: "plan-sitemap", projectId, args: { mode: "full-site" } })
```

Output: `{ summary, nodes }` where `nodes` is a flat array referencing each other via `local_id` / `parent_local_id`. The runner (or the route consuming the output) is responsible for converting `local_id` references to real UUIDs and writing rows into `site_plan_nodes` with `materialized_path` set.

Constraints (enforced by prompt + by the runner):

- Max tree depth 3 (root → child → grandchild)
- Roots anchored to a topic carry `topic_id`; children always null
- No duplicate titles vs. existing tree
