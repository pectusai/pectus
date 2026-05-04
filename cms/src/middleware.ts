import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@pectus/supabase";
import { LAST_BRAND_COOKIE } from "@/lib/active-brand";

const LEGACY_PREFIXES = [
  "/brand",
  "/workspaces",
  "/projects",
];

const LEGACY_REDIRECT_MAP: Record<string, string> = {
  "/brand": "/profile",
  "/workspaces": "/projects",
  "/projects": "/projects",
};

function rewriteWorkspacesToProjects(pathname: string): string | null {
  // Old bookmarks under /brands/<slug>/workspaces/<code>/... still 200 by
  // redirecting to /brands/<slug>/projects/<code>/... for one release cycle.
  if (!pathname.startsWith("/brands/")) return null;
  const replaced = pathname.replace(
    /^(\/brands\/[^/]+)\/workspaces(\/|$)/,
    "$1/projects$2",
  );
  return replaced === pathname ? null : replaced;
}

function legacyTarget(pathname: string, slug: string): string | null {
  for (const prefix of LEGACY_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      const tail = pathname.slice(prefix.length);
      const mapped = LEGACY_REDIRECT_MAP[prefix];
      if (mapped === undefined) return null;
      const subpath = mapped + tail;
      if (subpath === "") return `/brands/${slug}`;
      return `/brands/${slug}${subpath}`;
    }
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookieSlug = request.cookies.get(LAST_BRAND_COOKIE)?.value;

  const inBrandWorkspaceRewrite = rewriteWorkspacesToProjects(pathname);
  if (inBrandWorkspaceRewrite) {
    const url = request.nextUrl.clone();
    url.pathname = inBrandWorkspaceRewrite;
    return NextResponse.redirect(url);
  }

  if (cookieSlug) {
    const target = legacyTarget(pathname, cookieSlug);
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url);
    }
  }

  const sessionResponse = await updateSession(request);

  let routeSlug: string | null = null;
  if (pathname.startsWith("/brands/")) {
    const segments = pathname.split("/");
    if (segments[2]) routeSlug = segments[2];
  }

  if (routeSlug) {
    sessionResponse.cookies.set(LAST_BRAND_COOKIE, routeSlug, { path: "/" });
    sessionResponse.headers.set("x-pectus-brand-slug", routeSlug);
  } else if (cookieSlug) {
    sessionResponse.headers.set("x-pectus-brand-slug", cookieSlug);
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
