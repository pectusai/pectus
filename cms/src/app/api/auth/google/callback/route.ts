import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@pectus/supabase";
import { exchangeCode, fetchGoogleUserinfo } from "@pectus/google/oauth";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(
        `/brand?error=${encodeURIComponent(`Google denied the connection: ${oauthError}`)}`,
        request.url,
      ),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        `/brand?error=${encodeURIComponent("Missing code or state from Google.")}`,
        request.url,
      ),
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL(
        `/brand?error=${encodeURIComponent("OAuth state mismatch. Try again.")}`,
        request.url,
      ),
    );
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    const tokens = await exchangeCode(code, redirectUri);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL(
          `/brand?error=${encodeURIComponent(
            "Google did not return a refresh token. Disconnect any existing authorisations for this app at myaccount.google.com and try again.",
          )}`,
          request.url,
        ),
      );
    }

    const userinfo = await fetchGoogleUserinfo(tokens.access_token);
    const tokenExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();

    const { error } = await supabase.from("integrations").upsert(
      {
        provider: "google",
        scope: tokens.scope,
        account_email: userinfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
        created_by: user.id,
      },
      { onConflict: "provider" },
    );

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/brand?error=${encodeURIComponent(`Couldn't save connection: ${error.message}`)}`,
          request.url,
        ),
      );
    }

    return NextResponse.redirect(
      new URL(
        `/brand?connected=${encodeURIComponent(userinfo.email)}`,
        request.url,
      ),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      new URL(`/brand?error=${encodeURIComponent(msg)}`, request.url),
    );
  }
}
