// Wrapper around Supabase Management API for running SQL on the user's
// own project. Uses SUPABASE_ACCESS_TOKEN from .env.local (collected by
// the install agent in v0.3.9).

export type SqlResult =
  | { ok: true; rows: unknown }
  | { ok: false; error: string };

export function projectRefFromUrl(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  const fromHttps = v.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  if (fromHttps) return fromHttps[1];
  const fromHost = v.match(/^([a-z0-9-]+)\.supabase\.co$/i);
  if (fromHost) return fromHost[1];
  if (/^[a-z0-9]{16,40}$/i.test(v)) return v;
  return null;
}

export function getSupabaseProjectRef(): string | null {
  const direct = process.env.SUPABASE_PROJECT_REF?.trim();
  if (direct) return direct;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url ? projectRefFromUrl(url) : null;
}

export async function runManagementSql(query: string): Promise<SqlResult> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, error: "SUPABASE_ACCESS_TOKEN missing in .env.local. Generate one at https://supabase.com/dashboard/account/tokens and add it to .env.local, then restart `npm run dev`." };
  }
  const ref = getSupabaseProjectRef();
  if (!ref) {
    return {
      ok: false,
      error:
        "Couldn't determine your Supabase project ref. Set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL in cms/.env.local. The ref is the short ID in your Supabase dashboard URL (https://supabase.com/dashboard/project/<ref>).",
    };
  }
  let resp: Response;
  try {
    resp = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
  } catch (e) {
    return { ok: false, error: `Network error contacting Supabase Management API: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { ok: false, error: `Management API returned ${resp.status} ${resp.statusText}. ${body}` };
  }
  const rows = await resp.json().catch(() => null);
  return { ok: true, rows };
}
