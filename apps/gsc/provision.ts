/**
 * provision.ts — workspace-level GSC setup.
 *
 * Stub in v1. Real implementation lands in PR6.
 *
 * Called by `npx pectus connect gsc --workspace <code>` to:
 *   1. List GSC properties (URL-prefix and domain) the connected service account has access to.
 *   2. Prompt the user to pick the property to track for this workspace.
 *   3. Write the site_url into the integrations table for the workspace.
 *   4. Run a test query (last 7 days, top 5 queries) to confirm read access.
 *
 * Auth is shared via the Google service account set up by `npx pectus connect google`.
 * No app-specific env vars.
 */

export async function provision(_args: { workspaceCode: string }): Promise<void> {
  throw new Error("apps/gsc/provision.ts is stubbed in v1. Implementation in PR6.");
}
