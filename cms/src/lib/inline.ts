// Inline marker scheme for article body text. Mirrors the importer/scraper
// parser so imported + generated articles share one canonical shape.
//
//   __B__..__/B__       bold
//   __I__..__/I__       italic
//   __L(url)__..__/L__  link
//
// Every conversion in and out of HTML goes through this module so there's one
// place to evolve the scheme.

const AMP = /&/g;
const LT = /</g;
const GT = />/g;
const QUOT = /"/g;

export function escapeText(s: string): string {
  return s.replace(AMP, "&amp;").replace(LT, "&lt;").replace(GT, "&gt;");
}
function escapeAttr(s: string): string {
  return escapeText(s).replace(QUOT, "&quot;");
}

export function markerToHtml(input: string): string {
  let out = "";
  let i = 0;
  const len = input.length;

  while (i < len) {
    const rest = input.slice(i);

    const bIdx = rest.indexOf("__B__");
    const iIdx = rest.indexOf("__I__");
    const lMatch = rest.match(/__L\(([^)]+)\)__/);
    const lIdx = lMatch ? (lMatch.index as number) : -1;

    const candidates: Array<{ kind: "b" | "i" | "l"; at: number }> = [];
    if (bIdx >= 0) candidates.push({ kind: "b", at: bIdx });
    if (iIdx >= 0) candidates.push({ kind: "i", at: iIdx });
    if (lIdx >= 0) candidates.push({ kind: "l", at: lIdx });

    if (candidates.length === 0) {
      out += escapeText(rest);
      break;
    }

    candidates.sort((a, b) => a.at - b.at);
    const next = candidates[0]!;

    if (next.at > 0) out += escapeText(rest.slice(0, next.at));

    if (next.kind === "b") {
      const startAt = next.at + 5;
      const end = rest.indexOf("__/B__", startAt);
      if (end < 0) {
        out += escapeText(rest.slice(next.at));
        break;
      }
      out += `<strong>${markerToHtml(rest.slice(startAt, end))}</strong>`;
      i += end + 6;
    } else if (next.kind === "i") {
      const startAt = next.at + 5;
      const end = rest.indexOf("__/I__", startAt);
      if (end < 0) {
        out += escapeText(rest.slice(next.at));
        break;
      }
      out += `<em>${markerToHtml(rest.slice(startAt, end))}</em>`;
      i += end + 6;
    } else {
      const tag = rest.slice(next.at).match(/^__L\(([^)]+)\)__/);
      if (!tag) {
        out += escapeText(rest.slice(next.at));
        break;
      }
      const href = tag[1]!.trim();
      const startAt = next.at + tag[0].length;
      const end = rest.indexOf("__/L__", startAt);
      if (end < 0) {
        out += escapeText(rest.slice(next.at));
        break;
      }
      const inner = rest.slice(startAt, end);
      const isExternal = /^https?:\/\//i.test(href);
      const attrs = isExternal
        ? ` target="_blank" rel="noopener noreferrer"`
        : "";
      out += `<a href="${escapeAttr(href)}"${attrs}>${markerToHtml(inner)}</a>`;
      i += end + 6;
    }
  }

  return out;
}

export function stripMarkers(input: string): string {
  return input
    .replace(/__B__|__\/B__|__I__|__\/I__/g, "")
    .replace(/__L\([^)]+\)__([\s\S]*?)__\/L__/g, "$1");
}

export function slugifyHeading(s: string): string {
  return stripMarkers(s)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "section";
}

export function htmlToMarker(html: string): string {
  if (!html) return "";
  const src = html.replace(/\r\n?/g, "\n");
  let out = "";
  let i = 0;
  const stack: Array<"b" | "i" | "l" | "x"> = [];
  const linkHrefStack: string[] = [];

  while (i < src.length) {
    const ch = src[i];
    if (ch === "<") {
      const close = src[i + 1] === "/";
      const end = src.indexOf(">", i);
      if (end < 0) {
        out += escapeText(src.slice(i));
        break;
      }
      const raw = src.slice(i + (close ? 2 : 1), end).trim();
      const tagMatch = raw.match(/^([a-zA-Z0-9]+)/);
      const tag = tagMatch ? tagMatch[1].toLowerCase() : "";

      if (close) {
        const opened = stack.pop() ?? "x";
        if (opened === "b") out += "__/B__";
        else if (opened === "i") out += "__/I__";
        else if (opened === "l") {
          out += "__/L__";
          linkHrefStack.pop();
        }
      } else if (tag === "br") {
        out += "\n";
      } else if (tag === "strong" || tag === "b") {
        out += "__B__";
        stack.push("b");
      } else if (tag === "em" || tag === "i") {
        out += "__I__";
        stack.push("i");
      } else if (tag === "a") {
        const hrefMatch = raw.match(/href\s*=\s*"([^"]*)"/i);
        const href = hrefMatch ? hrefMatch[1] : "";
        out += `__L(${href})__`;
        stack.push("l");
        linkHrefStack.push(href);
      } else {
        stack.push("x");
      }
      i = end + 1;
      continue;
    }
    const next = src.indexOf("<", i);
    const chunk = next < 0 ? src.slice(i) : src.slice(i, next);
    out += chunk
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'");
    i = next < 0 ? src.length : next;
  }

  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}
