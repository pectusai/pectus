import crypto from "node:crypto";

export type ServiceAccountKey = {
  type: "service_account";
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  token_uri?: string;
};

export function parseServiceAccountKey(
  raw: string,
): { ok: true; key: ServiceAccountKey } | { ok: false; error: string } {
  if (!raw || !raw.trim()) {
    return { ok: false, error: "Paste the full service account JSON." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      error: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "JSON root must be an object." };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.type !== "service_account") {
    return {
      ok: false,
      error: `Expected "type": "service_account" in the JSON, got "${obj.type}".`,
    };
  }
  const required = ["project_id", "private_key_id", "private_key", "client_email"];
  for (const field of required) {
    if (typeof obj[field] !== "string" || !obj[field]) {
      return {
        ok: false,
        error: `Missing or empty "${field}" in the JSON.`,
      };
    }
  }
  return { ok: true, key: obj as ServiceAccountKey };
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=+$/u, "")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_");
}

export async function getAccessToken(
  key: ServiceAccountKey,
  scopes: string[],
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: key.private_key_id };
  const claim = {
    iss: key.client_email,
    scope: scopes.join(" "),
    aud: key.token_uri ?? "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const input = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(claim),
  )}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(input);
  signer.end();
  const signature = signer.sign(key.private_key);
  const jwt = `${input}.${base64UrlEncode(signature)}`;

  const res = await fetch(key.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token request failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}
