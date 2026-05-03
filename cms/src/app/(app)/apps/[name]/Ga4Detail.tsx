import {
  GoogleConnectionPanel,
  type GoogleIntegration,
} from "./GoogleConnectionPanel";
import { SubmitButton } from "@/app/components/SubmitButton";
import { saveGa4 } from "./actions";

export function Ga4Detail({
  integration,
}: {
  integration: GoogleIntegration;
}) {
  const connected = Boolean(integration?.service_account_json);
  const propertyId = (integration as { ga4_property_id?: string } | null)
    ?.ga4_property_id;

  return (
    <div className="space-y-5">
      <GoogleConnectionPanel integration={integration} />

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900">
            GA4 property
          </h2>
          {propertyId ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700">
              Saved
            </span>
          ) : null}
        </header>
        <p className="mt-1 text-xs text-zinc-600">
          Find the property ID in GA4 → Admin → Property settings. It looks
          like <code className="rounded bg-zinc-100 px-1 py-0.5">123456789</code>.
          Saving runs a live test against the property; if the service account
          isn&apos;t a Viewer on it, the save fails with the API error.
        </p>

        {!connected ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Connect a Google service account above first. The same credential
            is used for GA4, Search Console, and Google Ads.
          </p>
        ) : (
          <form action={saveGa4} className="mt-3 space-y-3">
            <input
              type="text"
              name="ga4_property_id"
              defaultValue={propertyId ?? ""}
              placeholder="123456789"
              required
              inputMode="numeric"
              pattern="\d+"
              className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm sm:max-w-xs"
            />
            <SubmitButton
              pendingLabel="Testing + saving…"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
            >
              Test + save (activates GA4)
            </SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
