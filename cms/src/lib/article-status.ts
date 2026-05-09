export type ArticleStatus =
  | "imported"
  | "draft"
  | "brand_review"
  | "market_lead_review"
  | "published"
  | "archived";

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  imported: "Imported",
  draft: "Draft",
  brand_review: "Brand review",
  market_lead_review: "Market lead review",
  published: "Published",
  archived: "Archived",
};

export const STATUS_PILL_CLASS: Record<ArticleStatus, string> = {
  imported: "pectus-status-pill pectus-status-pill-imported",
  draft: "pectus-status-pill pectus-status-pill-draft",
  brand_review: "pectus-status-pill pectus-status-pill-brand",
  market_lead_review: "pectus-status-pill pectus-status-pill-mkt",
  published: "pectus-status-pill pectus-status-pill-pub",
  archived: "pectus-status-pill pectus-status-pill-arch",
};

export type Transition = {
  to: ArticleStatus;
  label: string;
  variant: "primary" | "secondary";
};

export const ALLOWED_TRANSITIONS: Record<ArticleStatus, Transition[]> = {
  imported: [
    { to: "draft", label: "Move to draft →", variant: "primary" },
    { to: "archived", label: "Archive", variant: "secondary" },
  ],
  draft: [
    { to: "brand_review", label: "Send to brand review →", variant: "primary" },
    { to: "archived", label: "Archive", variant: "secondary" },
  ],
  brand_review: [
    {
      to: "market_lead_review",
      label: "Send to market lead review →",
      variant: "primary",
    },
    { to: "draft", label: "← Back to draft", variant: "secondary" },
    { to: "archived", label: "Archive", variant: "secondary" },
  ],
  market_lead_review: [
    { to: "published", label: "Publish →", variant: "primary" },
    { to: "brand_review", label: "← Back to brand review", variant: "secondary" },
    { to: "archived", label: "Archive", variant: "secondary" },
  ],
  published: [
    { to: "archived", label: "Archive", variant: "secondary" },
  ],
  archived: [],
};

export function isStatus(s: string): s is ArticleStatus {
  return Object.prototype.hasOwnProperty.call(STATUS_LABELS, s);
}
