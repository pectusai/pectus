/**
 * schema.org JSON-LD builders.
 * Templated for Pectus — reads org name and URLs from pectus.config.ts.
 */
import type { Article, Category } from "./articles";
import { ARTICLES, CATEGORIES } from "./articles";
import {
  articleUrl,
  categoryUrl,
  hubUrl,
  plainText,
  siteBase,
} from "./utils";
import { config } from "../../pectus.config";

export const ORG = {
  name: config.org.name,
  url: config.org.url,
  logo: config.org.logo,
};

export function publisher(site: URL | string) {
  return {
    "@type": "Organization",
    name: ORG.name,
    url: ORG.url,
    logo: {
      "@type": "ImageObject",
      url: ORG.logo.startsWith("http") ? ORG.logo : `${siteBase(site)}${ORG.logo}`,
    },
  };
}

export function blogPostingLd(article: Article, site: URL | string) {
  const url = articleUrl(site, article.slug);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    image: [article.heroImage],
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      "@type": "Person",
      name: article.author,
      ...(article.authorImage ? { image: article.authorImage } : {}),
    },
    publisher: publisher(site),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: article.category,
    keywords: article.category,
    wordCount: article.wordCount,
    inLanguage: "en",
    url,
    articleBody: plainText(article.blocks),
  };
}

export function breadcrumbLd(
  _site: URL | string,
  trail: Array<{ name: string; href: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: t.href,
    })),
  };
}

export function articleBreadcrumbs(article: Article, site: URL | string) {
  const category = CATEGORIES.find((c) => c.label === article.category);
  const trail = [{ name: config.site.name, href: hubUrl(site) }];
  if (category) {
    trail.push({ name: category.label, href: categoryUrl(site, category.slug) });
  }
  trail.push({ name: article.title, href: articleUrl(site, article.slug) });
  return breadcrumbLd(site, trail);
}

export function categoryBreadcrumbs(category: Category, site: URL | string) {
  return breadcrumbLd(site, [
    { name: config.site.name, href: hubUrl(site) },
    { name: category.label, href: categoryUrl(site, category.slug) },
  ]);
}

export function blogLd(site: URL | string) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: config.site.name,
    description: config.site.description,
    url: hubUrl(site),
    publisher: publisher(site),
    blogPost: ARTICLES.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      url: articleUrl(site, a.slug),
      datePublished: a.datePublished,
      dateModified: a.dateModified || a.datePublished,
      image: a.heroImage,
      author: { "@type": "Person", name: a.author },
      description: a.description,
      articleSection: a.category,
    })),
  };
}

export function itemListLd(site: URL | string, articles: Article[], name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: articles.length,
    itemListElement: articles.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: articleUrl(site, a.slug),
      name: a.title,
    })),
  };
}

export function collectionPageLd(
  site: URL | string,
  category: Category,
  articles: Article[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.label} — ${config.site.name}`,
    url: categoryUrl(site, category.slug),
    description: `Articles tagged ${category.label}.`,
    mainEntity: itemListLd(site, articles, `${category.label} — all articles`),
    publisher: publisher(site),
  };
}

export function websiteLd(site: URL | string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.site.name,
    url: siteBase(site),
    publisher: publisher(site),
  };
}
