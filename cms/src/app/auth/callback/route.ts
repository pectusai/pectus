import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@pectus/supabase";

/* Supabase Auth callback. Used after email confirmation links and after the
 * (currently disabled) social providers. No domain restriction in v1. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/workspaces";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Missing OAuth code.")}`,
    );
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
