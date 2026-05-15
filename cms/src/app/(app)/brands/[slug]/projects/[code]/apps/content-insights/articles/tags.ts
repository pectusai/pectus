// Fixed tag list per the walkthrough. Brands can edit this file to make
// the list their own. Empty string represents the "no tag" option.

export const ARTICLE_TAGS = [
  "",
  "Recruitment tips",
  "Employer branding",
  "Candidate experience",
  "Hiring process",
  "Talent acquisition",
  "DEI",
  "Recruiter tools",
  "Industry insight",
  "Customer story",
] as const;

export type ArticleTag = (typeof ARTICLE_TAGS)[number];
