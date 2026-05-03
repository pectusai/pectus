/**
 * provision.ts — Meta Marketing API setup.
 *
 * Stub in v1. Real implementation lands in PR6.
 *
 * Called by `npx pectus connect meta --workspace <code>` to:
 *   1. Prompt for META_APP_ID and META_APP_SECRET (one-time, install-level).
 *   2. Walk the user through creating a System User in Business Manager and
 *      issuing a long-lived token with ads_read + business_management scopes.
 *   3. List ad accounts the System User has access to and prompt the user to
 *      pick one for this workspace.
 *   4. Write env vars to .env.local and ad_account_id to the integrations table.
 *   5. Run a test query (e.g. fetch yesterday's campaign-level spend) to confirm.
 */

export async function provision(_args: { workspaceCode: string }): Promise<void> {
  throw new Error("apps/meta/provision.ts is stubbed in v1. Implementation in PR6.");
}
