"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { SitePlanNodeWithChildren } from "@/lib/types/pages";
import { adoptSuggestedNode, dismissSuggestedNode } from "./actions";

/* PR8/PR9: tree view with adopt/dismiss for suggested nodes. The [+] and
 * [···] affordances render but are PR11 work (Create Page flow + manual
 * tree edits). Clicking a node title is also PR11 (opens Create Page).
 *
 * Mobile behavior: depths 2 and 3 collapse by default. Tap the chevron to
 * expand. */

export function PageTreeView({
  tree,
  workspaceCode,
  enabledLocales,
}: {
  tree: SitePlanNodeWithChildren[];
  workspaceCode: string;
  enabledLocales: string[];
}) {
  return (
    <div className="rounded-lg border border-gray-200">
      <ul className="divide-y divide-gray-100">
        {tree.map((node) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            workspaceCode={workspaceCode}
            enabledLocales={enabledLocales}
          />
        ))}
      </ul>
    </div>
  );
}

function TreeNodeRow({
  node,
  workspaceCode,
  enabledLocales,
}: {
  node: SitePlanNodeWithChildren;
  workspaceCode: string;
  enabledLocales: string[];
}) {
  /* On mobile, collapse depths 2+ by default. On desktop, expand all. We use
   * a simple useState — the layout-collapse-on-mobile happens via responsive
   * classes wrapping the children list. */
  const [expanded, setExpanded] = useState(true);
  const [pending, startTransition] = useTransition();
  const hasChildren = node.children.length > 0;
  const indent = node.depth * 24;
  const isSuggested = node.status === "suggested";

  const onAdopt = () => {
    startTransition(async () => {
      await adoptSuggestedNode(workspaceCode, node.id);
    });
  };
  const onDismiss = () => {
    startTransition(async () => {
      await dismissSuggestedNode(workspaceCode, node.id);
    });
  };

  return (
    <li>
      <div
        className={`flex flex-wrap items-center gap-2 px-3 py-2 hover:bg-gray-50 ${isSuggested ? "bg-zinc-50/60" : ""}`}
        style={{ paddingLeft: 12 + indent }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="inline-block h-6 w-6" />
        )}

        <NodeTitle node={node} workspaceCode={workspaceCode} />

        <StatusBadge node={node} />
        {node.suggested_template && (
          <Badge
            variant="muted"
            tooltip={`Template: ${node.suggested_template}. Defines the page's default block composition. You can change it when you build the page.`}
          >
            {node.suggested_template}
          </Badge>
        )}
        {node.intent && (
          <Badge
            variant="outline"
            tooltip={
              INTENT_TOOLTIPS[node.intent] ??
              `Search intent: ${node.intent}. Tells you what kind of searcher this page targets.`
            }
          >
            {node.intent}
          </Badge>
        )}
        {hasChildren && (
          <span
            className="text-xs text-gray-500"
            title="Number of child nodes nested under this one. Tree is capped at 3 levels (root → child → grandchild)."
          >
            {node.children.length}{" "}
            {node.children.length === 1 ? "child" : "children"}
          </span>
        )}

        {node.has_page && enabledLocales.length > 0 && (
          <LocaleChips
            node={node}
            enabledLocales={enabledLocales}
            workspaceCode={workspaceCode}
          />
        )}

        <div className="flex items-center gap-1">
          {isSuggested ? (
            <>
              <ActionButton
                aria-label="Adopt suggestion"
                title="Adopt: keep this suggestion in your plan as an actual planned node. You'll be able to build a page for it next."
                onClick={onAdopt}
                disabled={pending}
                className="text-green-600 hover:bg-green-100 hover:text-green-800"
              >
                ✓
              </ActionButton>
              <ActionButton
                aria-label="Dismiss suggestion"
                title="Dismiss: remove this suggestion from your tree. plan-sitemap may suggest something similar again on the next run."
                onClick={onDismiss}
                disabled={pending}
                className="text-red-500 hover:bg-red-100 hover:text-red-700"
              >
                ✕
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton
                aria-label="Add child"
                disabled
                title="Add a child node manually under this one. Coming in the next session — for now, run plan-sitemap to grow the tree."
              >
                +
              </ActionButton>
              <ActionButton
                aria-label="More"
                disabled
                title="Rename, delete, duplicate, move. Coming in the next session — for now use the database directly if you need to edit."
              >
                ···
              </ActionButton>
            </>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <ul className="divide-y divide-gray-100">
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              workspaceCode={workspaceCode}
              enabledLocales={enabledLocales}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function LocaleChips({
  node,
  enabledLocales,
  workspaceCode,
}: {
  node: SitePlanNodeWithChildren;
  enabledLocales: string[];
  workspaceCode: string;
}) {
  const variants = node.variants_by_locale ?? {};
  return (
    <span className="flex items-center gap-1">
      {enabledLocales.map((locale) => {
        const v = variants[locale];
        if (!v) {
          return (
            <span
              key={locale}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-zinc-400"
              title={`No ${locale} variant yet. Open the page in the builder and switch to ${locale} to start one.`}
            >
              {locale}
            </span>
          );
        }
        const tone =
          v.status === "published"
            ? "bg-green-100 text-green-800"
            : "bg-blue-100 text-blue-800";
        return (
          <a
            key={locale}
            href={`/workspaces/${workspaceCode}/pages/builder/${v.variant_id}`}
            className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase hover:underline ${tone}`}
            title={`${locale} variant — ${v.status}. Click to open.`}
          >
            {locale}
          </a>
        );
      })}
    </span>
  );
}

function NodeTitle({
  node,
  workspaceCode,
}: {
  node: SitePlanNodeWithChildren;
  workspaceCode: string;
}) {
  const className =
    "flex-1 truncate text-left text-sm font-medium text-gray-900 hover:underline";
  /* Suggested nodes are not clickable until adopted. */
  if (node.status === "suggested") {
    return (
      <span className={className} title={node.rationale ?? undefined}>
        {node.title}
      </span>
    );
  }
  /* Adopted node, no page yet → Create Page flow. */
  if (!node.has_page) {
    return (
      <Link
        href={`/workspaces/${workspaceCode}/pages/new?nodeId=${node.id}`}
        className={className}
        title={node.rationale ?? "Create the page for this planned node"}
      >
        {node.title}
      </Link>
    );
  }
  /* Page exists → builder. Fall back to plain text if no variant id (race). */
  if (!node.default_variant_id) {
    return (
      <span className={className} title={node.rationale ?? undefined}>
        {node.title}
      </span>
    );
  }
  return (
    <Link
      href={`/workspaces/${workspaceCode}/pages/builder/${node.default_variant_id}`}
      className={className}
      title={node.rationale ?? undefined}
    >
      {node.title}
    </Link>
  );
}

function StatusBadge({ node }: { node: SitePlanNodeWithChildren }) {
  if (node.status === "suggested") {
    return (
      <Badge
        variant="suggested"
        tooltip="Suggested: an AI-proposed node from the latest plan run. Click ✓ to adopt it into your tree or ✕ to dismiss."
      >
        Suggested
      </Badge>
    );
  }
  if (node.has_page) {
    if (node.page_status === "published") {
      return (
        <Badge
          variant="published"
          tooltip="Published: this page is live on your site. Click the title to edit it in the builder."
        >
          Published
        </Badge>
      );
    }
    return (
      <Badge
        variant="draft"
        tooltip="Draft: a page exists but hasn't been published. Visitors can't see it yet. Click the title to keep editing."
      >
        Draft
      </Badge>
    );
  }
  return (
    <Badge
      variant="planned"
      tooltip="Planned: this node is in the plan but no page exists yet. Click the title to start building it."
    >
      Planned
    </Badge>
  );
}

const INTENT_TOOLTIPS: Record<string, string> = {
  informational: "Informational intent: searchers want to learn or understand. Long-form content, guides, explainers.",
  commercial: "Commercial intent: searchers comparing options before buying. Comparisons, reviews, alternatives.",
  transactional: "Transactional intent: searchers ready to convert. Pricing, signup, demo, checkout.",
  navigational: "Navigational intent: searchers looking for a specific brand or page. Branded queries.",
};

function Badge({
  variant,
  children,
  tooltip,
}: {
  variant:
    | "planned"
    | "draft"
    | "published"
    | "suggested"
    | "muted"
    | "outline";
  children: React.ReactNode;
  tooltip?: string;
}) {
  const styles: Record<typeof variant, string> = {
    planned: "bg-amber-100 text-amber-800",
    draft: "bg-blue-100 text-blue-800",
    published: "bg-green-100 text-green-800",
    suggested: "bg-zinc-100 text-zinc-700 italic",
    muted: "bg-gray-100 text-gray-600",
    outline: "border border-gray-300 text-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${styles[variant]}`}
      title={tooltip}
    >
      {children}
    </span>
  );
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      type="button"
      className={`flex h-7 min-w-[28px] items-center justify-center rounded text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    />
  );
}
