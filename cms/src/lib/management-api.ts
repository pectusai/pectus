// Wrapper around Supabase Management API for running SQL on the user's
// own project. Uses SUPABASE_ACCESS_TOKEN from .env.local (collected by
// the install agent in v0.3.9).

export type SqlResult =
  | { ok: true; rows: unknown }
  | { ok: false; error: string };

export function projectRefFromUrl(url: string): string | null {
  const m = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i);
  return m ? m[1] : null;
}

export async function runManagementSql(query: string): Promise<SqlResult> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, error: "SUPABASE_ACCESS_TOKEN missing in .env.local. Generate one at https://supabase.com/dashboard/account/tokens and add it to .env.local, then restart `npm run dev`." };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return { ok: false, error: "NEXT_PUBLIC_SUPABASE_URL missing in .env.local." };
  }
  const ref = projectRefFromUrl(url);
  if (!ref) {
    return { ok: false, error: `Could not derive project ref from NEXT_PUBLIC_SUPABASE_URL (${url}). Expected https://<ref>.supabase.co.` };
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
