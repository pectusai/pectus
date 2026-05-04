/**
 * provision.ts — Google Ads setup.
 *
 * Stub in v1. Real implementation lands in PR6.
 *
 * Called by `npx pectus connect google-ads --project <code>` to:
 *   1. Prompt the user for GOOGLE_ADS_DEVELOPER_TOKEN (one-time, at the install level).
 *   2. Prompt for GOOGLE_ADS_LOGIN_CUSTOMER_ID (the MCC account Pectus authenticates as).
 *   3. List accessible customer accounts and prompt the user to pick one for this project.
 *   4. Write env vars to .env.local and the customer_id to the integrations table.
 *   5. Run a test query (e.g. fetch yesterday's account-level cost) to confirm read access.
 *
 * OAuth is shared with connectors/google. The Google Ads scope must be in the
 * consent screen so the existing token works for this API.
 */

export async function provision(_args: { projectCode: string }): Promise<void> {
  throw new Error("apps/google-ads/provision.ts is stubbed in v1. Implementation in PR6.");
}
