/* Catalogue of env vars Pectus knows about. Drives the settings UI and the
 * snapshot-from-process action. Mirrors .env.example at the repo root.
 *
 * Adding a new variable: add it here AND in .env.example. Anything not in
 * this list is preserved in cms/.env.local but invisible to the UI. */

export type EnvKey = {
  key: string;
  label: string;
  description: string;
  secret: boolean;
  required: boolean;
  placeholder?: string;
};

export type EnvGroup = {
  category: string;
  description: string;
  keys: EnvKey[];
};

export const KNOWN_ENV_KEYS: EnvGroup[] = [
  {
    category: "Supabase",
    description:
      "Database, auth, and storage. The CMS and the Astro preview both connect via these keys.",
    keys: [
      {
        key: "NEXT_PUBLIC_SUPABASE_URL",
        label: "Project URL",
        description:
          "The HTTPS URL of your Supabase project. Find it under Project Settings → API.",
        secret: false,
        required: true,
        placeholder: "https://xxxxxxxxxxxx.supabase.co",
      },
      {
        key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        label: "Anon (public) key",
        description:
          "Public JWT used by the browser. Safe to expose. Find it under Project Settings → API.",
        secret: false,
        required: true,
      },
      {
        key: "SUPABASE_SERVICE_ROLE_KEY",
        label: "Service role key",
        description:
          "Server-only secret with full DB access. Bypasses RLS. Never paste this into a browser or commit it.",
        secret: true,
        required: true,
      },
      {
        key: "SUPABASE_PROJECT_REF",
        label: "Project ref",
        description:
          "Short identifier of your Supabase project. Used by the migration runner.",
        secret: false,
        required: false,
        placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx",
      },
      {
        key: "SUPABASE_ACCESS_TOKEN",
        label: "Account access token",
        description:
          "Personal access token from supabase.com/dashboard/account/tokens (starts with sbp_). Used by the migration runner's Management API path.",
        secret: true,
        required: false,
        placeholder: "sbp_...",
      },
    ],
  },
  {
    category: "Anthropic",
    description: "Claude API key. Powers every AI feature in Pectus.",
    keys: [
      {
        key: "ANTHROPIC_API_KEY",
        label: "API key",
        description:
          "From console.anthropic.com/settings/keys. Starts with sk-ant-.",
        secret: true,
        required: true,
        placeholder: "sk-ant-...",
      },
    ],
  },
  {
    category: "Google",
    description:
      "OAuth client used by the GA4 and Search Console connectors. Optional unless you want those data sources.",
    keys: [
      {
        key: "GOOGLE_OAUTH_CLIENT_ID",
        label: "OAuth client ID",
        description:
          "From Google Cloud Console → APIs & Services → Credentials.",
        secret: false,
        required: false,
      },
      {
        key: "GOOGLE_OAUTH_CLIENT_SECRET",
        label: "OAuth client secret",
        description: "Paired secret for the OAuth client above.",
        secret: true,
        required: false,
      },
    ],
  },
  {
    category: "Preview & deploy",
    description:
      "Optional overrides for the local preview iframe and the publish-to-Vercel/GitHub flow.",
    keys: [
      {
        key: "PECTUS_PREVIEW_URL",
        label: "Astro preview URL",
        description:
          "URL of the running Astro app the builder iframe points to. Defaults to http://localhost:4321 when unset.",
        secret: false,
        required: false,
        placeholder: "http://localhost:4321",
      },
      {
        key: "VERCEL_TOKEN",
        label: "Vercel token",
        description:
          "Used by the publish flow if you deploy the hub-template to Vercel.",
        secret: true,
        required: false,
      },
      {
        key: "GITHUB_TOKEN",
        label: "GitHub token",
        description:
          "Used by the publish flow if you sync the hub-template to a GitHub fork.",
        secret: true,
        required: false,
      },
    ],
  },
];
