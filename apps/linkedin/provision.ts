/**
 * provision.ts — LinkedIn Marketing API setup.
 *
 * Stub in v1. Real implementation lands in PR6.
 *
 * Called by `npx pectus connect linkedin --workspace <code>` to:
 *   1. Prompt for LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET (one-time, install-level).
 *   2. Run an OAuth flow with scopes r_ads, r_ads_reporting, r_organization_social,
 *      capture the refresh token, write it to .env.local as LINKEDIN_REFRESH_TOKEN.
 *   3. List sponsored accounts the token has access to and prompt the user
 *      to pick one for this workspace.
 *   4. Write ad_account_id to the integrations table.
 *   5. Run a test analytics query to confirm read access.
 *
 * Notes:
 *   - Marketing Developer Platform approval is required before this works.
 *   - LinkedIn access tokens expire after 60 days; the refresh token is used
 *     by fetch.ts to mint fresh access tokens on demand.
 */

export async function provision(_args: { workspaceCode: string }): Promise<void> {
  throw new Error("apps/linkedin/provision.ts is stubbed in v1. Implementation in PR6.");
}
