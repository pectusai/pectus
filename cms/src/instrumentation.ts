/* Next.js boot hook. Runs once when the CMS server starts.
 *
 * Pectus's env model: cms/.env.local is the single source of truth. The
 * CMS reads it natively, the Astro preview reads it via
 * scripts/load-pectus-env.mjs, and any future app does the same.
 *
 * Reality: many installs source env from the shell or a parent .env, not
 * from cms/.env.local directly. The file might not exist at all. This
 * hook captures every Pectus-known key currently set in process.env and
 * persists it to cms/.env.local — so the next time anything reads the
 * file (the Astro dev server, a future app, the next CMS boot), it sees
 * the same values without the user touching a settings page. */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { readEnvLocal, writeEnvLocal } = await import("./lib/env-file");
    const { KNOWN_ENV_KEYS } = await import(
      "./app/(app)/settings/environment/schema"
    );

    const current = readEnvLocal();
    const snapshot: Record<string, string> = {};
    for (const group of KNOWN_ENV_KEYS) {
      for (const k of group.keys) {
        const v = process.env[k.key];
        if (v !== undefined && v !== "" && !current[k.key]) {
          snapshot[k.key] = v;
        }
      }
    }

    if (Object.keys(snapshot).length === 0) return;
    writeEnvLocal(snapshot);
    console.log(
      `[pectus] auto-saved ${Object.keys(snapshot).length} env value${Object.keys(snapshot).length === 1 ? "" : "s"} to cms/.env.local`,
    );
  } catch (err) {
    console.warn(
      "[pectus] env auto-save skipped:",
      err instanceof Error ? err.message : err,
    );
  }
}
